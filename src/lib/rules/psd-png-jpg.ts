import { stringField } from "@/lib/frontify/asset-helpers"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"

/** Longest side required for the PNG/JPG rendition (API `width` / `height`). */
export const RENDITION_LONG_SIDE_PX = 1200

/** Appended to the PSD/PSB base external ID for the JPEG rendition asset */
export const RENDITION_JPEG_EXTERNAL_SUFFIX = "-rendition-jpeg-1200px"

/** Appended to the PSD/PSB base external ID for the PNG rendition asset */
export const RENDITION_PNG_EXTERNAL_SUFFIX = "-rendition-png-1200px"

export function expectedJpegRenditionExternalId(baseExternalId: string): string {
  return `${baseExternalId.trim()}${RENDITION_JPEG_EXTERNAL_SUFFIX}`
}

export function expectedPngRenditionExternalId(baseExternalId: string): string {
  return `${baseExternalId.trim()}${RENDITION_PNG_EXTERNAL_SUFFIX}`
}

function normExt(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\./, "")
}

function isPsdOrPsb(item: FrontifyLibraryAssetItem): boolean {
  const e = normExt(stringField(item, "extension"))
  return e === "psd" || e === "psb"
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

/** Longest side from API dimensions, or null if missing. */
function longestSide(item: FrontifyLibraryAssetItem): number | null {
  const dims = apiWidthHeight(item)
  if (!dims) return null
  return Math.max(dims.width, dims.height)
}

export type PsdPngJpgRasterInfo = {
  id: string
  externalId: string
  extension: string
  width: number | null
  height: number | null
  longSide: number | null
  /** Which rendition slot this row came from */
  slot: "jpeg" | "png"
}

export type PsdPngJpgRow = {
  psdId: string
  title: string
  psdExtension: string
  /** Base external ID on the PSD/PSB */
  externalId: string
  ok: boolean
  note: string
  rasters: PsdPngJpgRasterInfo[]
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
): PsdPngJpgRasterInfo {
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

export function evaluatePsdPngJpgRules(
  items: FrontifyLibraryAssetItem[]
): { rows: PsdPngJpgRow[]; psdCount: number; passCount: number; failCount: number } {
  const byExternalId = indexByExternalId(items)
  const rows: PsdPngJpgRow[] = []

  for (const psd of items) {
    if (!isPsdOrPsb(psd)) continue

    const extId = stringField(psd, "externalId").trim()
    const psdExtension = normExt(stringField(psd, "extension")) || "—"
    const title = stringField(psd, "title") || "—"

    if (!extId) {
      rows.push({
        psdId: psd.id,
        title,
        psdExtension,
        externalId: "",
        ok: false,
        note: "PSD/PSB has no external ID (cannot derive rendition external IDs).",
        rasters: [],
      })
      continue
    }

    const jpegKey = expectedJpegRenditionExternalId(extId)
    const pngKey = expectedPngRenditionExternalId(extId)

    const atJpegId = byExternalId.get(jpegKey) ?? []
    const atPngId = byExternalId.get(pngKey) ?? []

    const jpegMatches = atJpegId.filter(isJpegExtension)
    const pngMatches = atPngId.filter(isPngExtension)

    const rasterInfos: PsdPngJpgRasterInfo[] = [
      ...atJpegId.map((a) => toRasterInfo(a, "jpeg")),
      ...atPngId.map((a) => toRasterInfo(a, "png")),
    ]

    const wrongExtAtJpeg = atJpegId.filter((a) => !isJpegExtension(a))
    const wrongExtAtPng = atPngId.filter((a) => !isPngExtension(a))

    if (atJpegId.length === 0 && atPngId.length === 0) {
      rows.push({
        psdId: psd.id,
        title,
        psdExtension,
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
        psdId: psd.id,
        title,
        psdExtension,
        externalId: extId,
        ok: false,
        note: parts.join(" "),
        rasters: rasterInfos,
      })
      continue
    }

    const jpegOk = jpegMatches.some(
      (r) => longestSide(r) === RENDITION_LONG_SIDE_PX
    )
    const pngOk = pngMatches.some(
      (r) => longestSide(r) === RENDITION_LONG_SIDE_PX
    )

    if (jpegOk || pngOk) {
      rows.push({
        psdId: psd.id,
        title,
        psdExtension,
        externalId: extId,
        ok: true,
        note: jpegOk && pngOk
          ? "JPEG and PNG renditions both have 1200px long side."
          : jpegOk
            ? "JPEG rendition has 1200px long side."
            : "PNG rendition has 1200px long side.",
        rasters: rasterInfos,
      })
    } else {
      rows.push({
        psdId: psd.id,
        title,
        psdExtension,
        externalId: extId,
        ok: false,
        note: "Rendition(s) found at expected external IDs but no 1200px long side on a matching JPG/JPEG or PNG.",
        rasters: rasterInfos,
      })
    }
  }

  const passCount = rows.filter((r) => r.ok).length
  const failCount = rows.filter((r) => !r.ok).length

  return {
    rows,
    psdCount: rows.length,
    passCount,
    failCount,
  }
}

export type EvaluatePsdPngJpgRulesResult = ReturnType<
  typeof evaluatePsdPngJpgRules
>
