import { NextResponse } from "next/server"

import {
  libraryRunHttpStatus,
  resolveRunLibraryCheckInput,
  runLibraryCheck,
} from "@/lib/frontify/run-library-check"
import type { LibraryRunResponseBody } from "@/lib/frontify/library-run-types"

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

export async function POST(
  req: Request
): Promise<NextResponse<LibraryRunResponseBody>> {
  const rawBody = await readJsonBody(req)
  const resolved = resolveRunLibraryCheckInput(
    rawBody,
    process.env.FRONTIFY_LIBRARY_ID
  )
  if (!resolved.ok) {
    return NextResponse.json(resolved.error, {
      status: libraryRunHttpStatus(resolved.error),
    })
  }
  const body = await runLibraryCheck(resolved.input)
  return NextResponse.json(body, { status: libraryRunHttpStatus(body) })
}
