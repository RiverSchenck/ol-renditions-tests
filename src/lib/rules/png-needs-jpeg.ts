import { stringField } from "@/lib/frontify/asset-helpers"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"
import {
  RENDITION_JPEG_EXTERNAL_SUFFIX as PSD_RENDITION_JPEG_SUFFIX,
  RENDITION_PNG_EXTERNAL_SUFFIX as PSD_RENDITION_PNG_SUFFIX,
} from "@/lib/rules/psd-png-jpg"
import {
  TIF_RENDITION_JPEG_EXTERNAL_SUFFIX,
  TIF_RENDITION_PNG_EXTERNAL_SUFFIX,
  expectedTifJpegRenditionExternalId,
} from "@/lib/rules/tif-png-jpg"

/**
 * External ID suffixes that identify assets that are renditions of another master
 * (PSD/TIF pipelines). Master PNGs must not use these patterns.
 */
const RENDITION_EXTERNAL_ID_SUFFIXES = [
  PSD_RENDITION_JPEG_SUFFIX,
  PSD_RENDITION_PNG_SUFFIX,
  TIF_RENDITION_JPEG_EXTERNAL_SUFFIX,
  TIF_RENDITION_PNG_EXTERNAL_SUFFIX,
] as const

export function isRenditionExternalId(externalId: string): boolean {
  const e = externalId.trim().toLowerCase()
  if (!e) return false
  return RENDITION_EXTERNAL_ID_SUFFIXES.some((suffix) =>
    e.endsWith(suffix.toLowerCase())
  )
}

/** JPEG sibling for a PNG master — same pattern as TIF (`{base}-rendition-jpeg`). */
export { expectedTifJpegRenditionExternalId as expectedJpegRenditionForPngMaster }

function normExt(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\./, "")
}

function isPngExtension(item: FrontifyLibraryAssetItem): boolean {
  return normExt(stringField(item, "extension")) === "png"
}

function isJpegExtension(item: FrontifyLibraryAssetItem): boolean {
  const e = normExt(stringField(item, "extension"))
  return e === "jpg" || e === "jpeg"
}

function apiWidthHeight(item: FrontifyLibraryAssetItem): {
  width: number
  height: number
} | null {
  const w = item.width
  const h = item.height
  if (typeof w !== "number" || typeof h !== "number") return null
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null
  return { width: w, height: h }
}

function longestSide(item: FrontifyLibraryAssetItem): number | null {
  const dims = apiWidthHeight(item)
  if (!dims) return null
  return Math.max(dims.width, dims.height)
}

export type PngNeedsJpegRasterInfo = {
  id: string
  externalId: string
  extension: string
  width: number | null
  height: number | null
  longSide: number | null
}

export type PngNeedsJpegRow = {
  pngId: string
  title: string
  pngExtension: string
  externalId: string
  ok: boolean
  note: string
  /** Assets found at the expected JPEG rendition external ID */
  jpegRasters: PngNeedsJpegRasterInfo[]
}

function indexByExternalId(
  items: FrontifyLibraryAssetItem[]
): Map<string, FrontifyLibraryAssetItem[]> {
  const map = new Map<string, FrontifyLibraryAssetItem[]>()
  for (const item of items) {
    const key = stringField(item, "externalId").trim()
    if (!key) continue
    const list = map.get(key)
    if (list) list.push(item)
    else map.set(key, [item])
  }
  return map
}

function toJpegRasterInfo(item: FrontifyLibraryAssetItem): PngNeedsJpegRasterInfo {
  const dims = apiWidthHeight(item)
  return {
    id: item.id,
    externalId: stringField(item, "externalId").trim() || "—",
    extension: normExt(stringField(item, "extension")) || "—",
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    longSide: longestSide(item),
  }
}

function isPngMasterCandidate(item: FrontifyLibraryAssetItem): boolean {
  if (!isPngExtension(item)) return false
  const extId = stringField(item, "externalId").trim()
  if (!extId) return true
  return !isRenditionExternalId(extId)
}

export function evaluatePngNeedsJpegRules(
  items: FrontifyLibraryAssetItem[]
): {
  rows: PngNeedsJpegRow[]
  pngMasterCount: number
  passCount: number
  failCount: number
} {
  const byExternalId = indexByExternalId(items)
  const rows: PngNeedsJpegRow[] = []

  for (const master of items) {
    if (!isPngMasterCandidate(master)) continue

    const extId = stringField(master, "externalId").trim()
    const pngExtension = normExt(stringField(master, "extension")) || "—"
    const title = stringField(master, "title") || "—"

    if (!extId) {
      rows.push({
        pngId: master.id,
        title,
        pngExtension,
        externalId: "",
        ok: false,
        note: "PNG master has no external ID (cannot derive JPEG rendition external ID).",
        jpegRasters: [],
      })
      continue
    }

    const jpegKey = expectedTifJpegRenditionExternalId(extId)
    const atJpegId = byExternalId.get(jpegKey) ?? []
    const jpegMatches = atJpegId.filter(isJpegExtension)
    const jpegRasters = atJpegId.map(toJpegRasterInfo)
    const wrongExtAtJpeg = atJpegId.filter((a) => !isJpegExtension(a))

    if (atJpegId.length === 0) {
      rows.push({
        pngId: master.id,
        title,
        pngExtension,
        externalId: extId,
        ok: false,
        note: `No asset at JPEG rendition external ID (${jpegKey}).`,
        jpegRasters: [],
      })
      continue
    }

    if (jpegMatches.length === 0) {
      rows.push({
        pngId: master.id,
        title,
        pngExtension,
        externalId: extId,
        ok: false,
        note:
          wrongExtAtJpeg.length > 0
            ? `At JPEG external ID: expected .jpg/.jpeg, found ${wrongExtAtJpeg.map((a) => normExt(stringField(a, "extension"))).join(", ")}.`
            : "No JPG/JPEG at JPEG rendition ID.",
        jpegRasters,
      })
      continue
    }

    rows.push({
      pngId: master.id,
      title,
      pngExtension,
      externalId: extId,
      ok: true,
      note:
        "JPEG rendition present with correct file type at expected external ID (no long-side requirement).",
      jpegRasters,
    })
  }

  const passCount = rows.filter((r) => r.ok).length
  const failCount = rows.filter((r) => !r.ok).length

  return {
    rows,
    pngMasterCount: rows.length,
    passCount,
    failCount,
  }
}

export type EvaluatePngNeedsJpegRulesResult = ReturnType<
  typeof evaluatePngNeedsJpegRules
>
