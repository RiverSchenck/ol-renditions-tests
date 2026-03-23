import {
  resolveRunLibraryCheckInput,
  runLibraryCheck,
  type RunProgressLine,
} from "@/lib/frontify/run-library-check"
import type { LibraryRunResponseBody } from "@/lib/frontify/library-run-types"

type NdjsonLine =
  | { type: "line"; line: RunProgressLine }
  | { type: "result"; body: LibraryRunResponseBody }

async function readJsonBody(req: Request): Promise<unknown> {
  try {
    const ct = req.headers.get("content-type") ?? ""
    if (!ct.includes("application/json")) return undefined
    const text = await req.text()
    if (!text.trim()) return undefined
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

export async function POST(req: Request): Promise<Response> {
  const encoder = new TextEncoder()
  const rawBody = await readJsonBody(req)
  const resolved = resolveRunLibraryCheckInput(
    rawBody,
    process.env.FRONTIFY_LIBRARY_ID
  )

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (payload: NdjsonLine) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`))
      }

      try {
        if (!resolved.ok) {
          write({ type: "result", body: resolved.error })
          return
        }

        const body = await runLibraryCheck(resolved.input, (line) => {
          write({ type: "line", line })
        })
        write({ type: "result", body })
      } catch (e) {
        const summary = e instanceof Error ? e.message : "Unexpected server error"
        const detail = JSON.stringify(
          e instanceof Error
            ? { name: e.name, message: e.message, stack: e.stack }
            : { thrown: String(e) },
          null,
          2
        )
        write({
          type: "result",
          body: {
            ok: false,
            errorSummary: summary,
            errorDetail: detail,
          },
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
