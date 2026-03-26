import { previewHref, stringField } from "@/lib/frontify/asset-helpers"
import { FRONTIFY_BETA_HEADERS } from "@/lib/frontify/frontify-http-headers"
import { analyzeJpegBufferWhiteBorder } from "@/lib/image/jpeg-white-border"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"
import { RENDITION_JPEG_EXTERNAL_SUFFIX } from "@/lib/rules/psd-png-jpg"
import { TIF_RENDITION_JPEG_EXTERNAL_SUFFIX } from "@/lib/rules/tif-png-jpg"

function normExt(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\./, "")
}

function isJpegExtension(item: FrontifyLibraryAssetItem): boolean {
  const e = normExt(stringField(item, "extension"))
  return e === "jpg" || e === "jpeg"
}

function isJpegRenditionExternalId(externalId: string): boolean {
  const e = externalId.trim().toLowerCase()
  return (
    e.endsWith(RENDITION_JPEG_EXTERNAL_SUFFIX.toLowerCase()) ||
    e.endsWith(TIF_RENDITION_JPEG_EXTERNAL_SUFFIX.toLowerCase())
  )
}

function isJpegRenditionAsset(item: FrontifyLibraryAssetItem): boolean {
  if (!isJpegExtension(item)) return false
  const extId = stringField(item, "externalId").trim()
  if (!extId) return false
  return isJpegRenditionExternalId(extId)
}

async function fetchPreviewBuffer(
  url: string,
  accessToken?: string
): Promise<Buffer | null> {
  try {
    const headers: Record<string, string> = { ...FRONTIFY_BETA_HEADERS }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }
    const res = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    })
    if (!res.ok) return null
    const ab = await res.arrayBuffer()
    return Buffer.from(ab)
  } catch {
    return null
  }
}

export type JpegRenditionWhiteBgRow = {
  id: string
  title: string
  externalId: string
  previewUrl: string
  ok: boolean
  note: string
  sampleCount: number | null
  minRgb: { r: number; g: number; b: number } | null
  /** 0–1 share of border pixels classified as black studio fill; null if not computed. */
  blackPixelFraction: number | null
}

export async function evaluateJpegRenditionWhiteBgRules(
  items: FrontifyLibraryAssetItem[],
  options?: {
    accessToken?: string
    concurrency?: number
    onBatch?: (info: {
      batchIndex: number
      batchCount: number
      batchSize: number
      total: number
    }) => void
    onProgress?: (info: { processed: number; total: number }) => void
  }
): Promise<{
  rows: JpegRenditionWhiteBgRow[]
  jpegRenditionCount: number
  passCount: number
  failCount: number
}> {
  const candidates = items.filter(isJpegRenditionAsset)
  const concurrency = Math.max(1, Math.min(12, options?.concurrency ?? 5))
  const token = options?.accessToken
  const batchCount =
    candidates.length === 0 ? 0 : Math.ceil(candidates.length / concurrency)

  const rows: JpegRenditionWhiteBgRow[] = []

  for (let i = 0; i < candidates.length; i += concurrency) {
    const slice = candidates.slice(i, i + concurrency)
    const batchIndex = Math.floor(i / concurrency) + 1
    options?.onBatch?.({
      batchIndex,
      batchCount,
      batchSize: slice.length,
      total: candidates.length,
    })
    const chunk = await Promise.all(
      slice.map(async (item) => {
        const title = stringField(item, "title") || "—"
        const externalId = stringField(item, "externalId").trim()
        const url = previewHref(item)

        if (!url) {
          return {
            id: item.id,
            title,
            externalId,
            previewUrl: "",
            ok: false,
            note: "No previewUrl on this asset — cannot sample pixels.",
            sampleCount: null,
            minRgb: null,
            blackPixelFraction: null,
          } satisfies JpegRenditionWhiteBgRow
        }

        const buf = await fetchPreviewBuffer(url, token)
        if (!buf) {
          return {
            id: item.id,
            title,
            externalId,
            previewUrl: url,
            ok: false,
            note: "Could not download preview (HTTP error, timeout, or network). Try FRONTIFY_ACCESS_TOKEN if URLs require auth.",
            sampleCount: null,
            minRgb: null,
            blackPixelFraction: null,
          } satisfies JpegRenditionWhiteBgRow
        }

        const analysis = await analyzeJpegBufferWhiteBorder(buf)
        return {
          id: item.id,
          title,
          externalId,
          previewUrl: url,
          ok: analysis.ok,
          note: analysis.summary,
          sampleCount: analysis.sampleCount,
          minRgb: analysis.minRgb,
          blackPixelFraction: analysis.blackPixelFraction,
        } satisfies JpegRenditionWhiteBgRow
      })
    )
    rows.push(...chunk)
    options?.onProgress?.({
      processed: rows.length,
      total: candidates.length,
    })
  }

  const passCount = rows.filter((r) => r.ok).length
  const failCount = rows.filter((r) => !r.ok).length

  return {
    rows,
    jpegRenditionCount: rows.length,
    passCount,
    failCount,
  }
}

export type EvaluateJpegRenditionWhiteBgRulesResult = Awaited<
  ReturnType<typeof evaluateJpegRenditionWhiteBgRules>
>
