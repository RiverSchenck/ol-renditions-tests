import { stringField } from "@/lib/frontify/asset-helpers"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"

/** Appended to the TIF/TIFF base external ID for the JPEG rendition asset */
export const TIF_RENDITION_JPEG_EXTERNAL_SUFFIX = "-rendition-jpeg"

/** Appended to the TIF/TIFF base external ID for the PNG rendition asset */
export const TIF_RENDITION_PNG_EXTERNAL_SUFFIX = "-rendition-png"

export function expectedTifJpegRenditionExternalId(baseExternalId: string): string {
  return `${baseExternalId.trim()}${TIF_RENDITION_JPEG_EXTERNAL_SUFFIX}`
}

export function expectedTifPngRenditionExternalId(baseExternalId: string): string {
  return `${baseExternalId.trim()}${TIF_RENDITION_PNG_EXTERNAL_SUFFIX}`
}

function normExt(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\./, "")
}

function isTifOrTiff(item: FrontifyLibraryAssetItem): boolean {
  const e = normExt(stringField(item, "extension"))
  return e === "tif" || e === "tiff"
}

function isJpegExtension(item: FrontifyLibraryAssetItem): boolean {
  const e = normExt(stringField(item, "extension"))
  return e === "jpg" || e === "jpeg"
}

function isPngExtension(item: FrontifyLibraryAssetItem): boolean {
  return normExt(stringField(item, "extension")) === "png"
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

export type TifPngJpgRasterInfo = {
  id: string
  externalId: string
  extension: string
  width: number | null
  height: number | null
  longSide: number | null
  slot: "jpeg" | "png"
}

export type TifPngJpgRow = {
  tifId: string
  title: string
  tifExtension: string
  externalId: string
  ok: boolean
  note: string
  rasters: TifPngJpgRasterInfo[]
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

function toRasterInfo(
  item: FrontifyLibraryAssetItem,
  slot: "jpeg" | "png"
): TifPngJpgRasterInfo {
  const dims = apiWidthHeight(item)
  return {
    id: item.id,
    externalId: stringField(item, "externalId").trim() || "—",
    extension: normExt(stringField(item, "extension")) || "—",
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    longSide: longestSide(item),
    slot,
  }
}

export function evaluateTifPngJpgRules(
  items: FrontifyLibraryAssetItem[]
): {
  rows: TifPngJpgRow[]
  tifCount: number
  passCount: number
  failCount: number
} {
  const byExternalId = indexByExternalId(items)
  const rows: TifPngJpgRow[] = []

  for (const master of items) {
    if (!isTifOrTiff(master)) continue

    const extId = stringField(master, "externalId").trim()
    const tifExtension = normExt(stringField(master, "extension")) || "—"
    const title = stringField(master, "title") || "—"

    if (!extId) {
      rows.push({
        tifId: master.id,
        title,
        tifExtension,
        externalId: "",
        ok: false,
        note: "TIF/TIFF has no external ID (cannot derive rendition external IDs).",
        rasters: [],
      })
      continue
    }

    const jpegKey = expectedTifJpegRenditionExternalId(extId)
    const pngKey = expectedTifPngRenditionExternalId(extId)

    const atJpegId = byExternalId.get(jpegKey) ?? []
    const atPngId = byExternalId.get(pngKey) ?? []

    const jpegMatches = atJpegId.filter(isJpegExtension)
    const pngMatches = atPngId.filter(isPngExtension)

    const rasterInfos: TifPngJpgRasterInfo[] = [
      ...atJpegId.map((a) => toRasterInfo(a, "jpeg")),
      ...atPngId.map((a) => toRasterInfo(a, "png")),
    ]

    const wrongExtAtJpeg = atJpegId.filter((a) => !isJpegExtension(a))
    const wrongExtAtPng = atPngId.filter((a) => !isPngExtension(a))

    if (atJpegId.length === 0 && atPngId.length === 0) {
      rows.push({
        tifId: master.id,
        title,
        tifExtension,
        externalId: extId,
        ok: false,
        note: `No assets at ${jpegKey} or ${pngKey}.`,
        rasters: [],
      })
      continue
    }

    if (jpegMatches.length === 0 && pngMatches.length === 0) {
      const parts: string[] = []
      if (atJpegId.length && wrongExtAtJpeg.length) {
        parts.push(
          `At JPEG external ID: expected .jpg/.jpeg, found ${wrongExtAtJpeg.map((a) => normExt(stringField(a, "extension"))).join(", ")}.`
        )
      }
      if (atPngId.length && wrongExtAtPng.length) {
        parts.push(
          `At PNG external ID: expected .png, found ${wrongExtAtPng.map((a) => normExt(stringField(a, "extension"))).join(", ")}.`
        )
      }
      if (parts.length === 0) {
        parts.push("No JPG/JPEG at JPEG rendition ID and no PNG at PNG rendition ID.")
      }
      rows.push({
        tifId: master.id,
        title,
        tifExtension,
        externalId: extId,
        ok: false,
        note: parts.join(" "),
        rasters: rasterInfos,
      })
      continue
    }

    if (jpegMatches.length === 0) {
      rows.push({
        tifId: master.id,
        title,
        tifExtension,
        externalId: extId,
        ok: false,
        note:
          atJpegId.length === 0
            ? `No asset at JPEG rendition external ID (${jpegKey}).`
            : "No JPG/JPEG at JPEG rendition ID (wrong file type at that external ID).",
        rasters: rasterInfos,
      })
      continue
    }

    if (pngMatches.length === 0) {
      rows.push({
        tifId: master.id,
        title,
        tifExtension,
        externalId: extId,
        ok: false,
        note:
          atPngId.length === 0
            ? `No asset at PNG rendition external ID (${pngKey}).`
            : "No PNG at PNG rendition ID (wrong file type at that external ID).",
        rasters: rasterInfos,
      })
      continue
    }

    rows.push({
      tifId: master.id,
      title,
      tifExtension,
      externalId: extId,
      ok: true,
      note:
        "JPEG and PNG renditions present with correct file types at expected external IDs (no long-side requirement).",
      rasters: rasterInfos,
    })
  }

  const passCount = rows.filter((r) => r.ok).length
  const failCount = rows.filter((r) => !r.ok).length

  return {
    rows,
    tifCount: rows.length,
    passCount,
    failCount,
  }
}

export type EvaluateTifPngJpgRulesResult = ReturnType<typeof evaluateTifPngJpgRules>
