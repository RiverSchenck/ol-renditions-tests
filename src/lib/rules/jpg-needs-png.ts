import { stringField } from "@/lib/frontify/asset-helpers"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"
import { isRenditionExternalId } from "@/lib/rules/png-needs-jpeg"
import { expectedTifPngRenditionExternalId } from "@/lib/rules/tif-png-jpg"

/** PNG sibling for a JPG master — same pattern as TIF (`{base}-rendition-png`). */
export { expectedTifPngRenditionExternalId as expectedPngRenditionForJpgMaster }

function normExt(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\./, "")
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

export type JpgNeedsPngRasterInfo = {
  id: string
  externalId: string
  extension: string
  width: number | null
  height: number | null
  longSide: number | null
}

export type JpgNeedsPngRow = {
  jpgId: string
  title: string
  jpgExtension: string
  externalId: string
  ok: boolean
  note: string
  pngRasters: JpgNeedsPngRasterInfo[]
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

function toPngRasterInfo(item: FrontifyLibraryAssetItem): JpgNeedsPngRasterInfo {
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

function isJpgMasterCandidate(item: FrontifyLibraryAssetItem): boolean {
  if (!isJpegExtension(item)) return false
  const extId = stringField(item, "externalId").trim()
  if (!extId) return true
  return !isRenditionExternalId(extId)
}

export function evaluateJpgNeedsPngRules(
  items: FrontifyLibraryAssetItem[]
): {
  rows: JpgNeedsPngRow[]
  jpgMasterCount: number
  passCount: number
  failCount: number
} {
  const byExternalId = indexByExternalId(items)
  const rows: JpgNeedsPngRow[] = []

  for (const master of items) {
    if (!isJpgMasterCandidate(master)) continue

    const extId = stringField(master, "externalId").trim()
    const jpgExtension = normExt(stringField(master, "extension")) || "—"
    const title = stringField(master, "title") || "—"

    if (!extId) {
      rows.push({
        jpgId: master.id,
        title,
        jpgExtension,
        externalId: "",
        ok: false,
        note: "JPG master has no external ID (cannot derive PNG rendition external ID).",
        pngRasters: [],
      })
      continue
    }

    const pngKey = expectedTifPngRenditionExternalId(extId)
    const atPngId = byExternalId.get(pngKey) ?? []
    const pngMatches = atPngId.filter(isPngExtension)
    const pngRasters = atPngId.map(toPngRasterInfo)
    const wrongExtAtPng = atPngId.filter((a) => !isPngExtension(a))

    if (atPngId.length === 0) {
      rows.push({
        jpgId: master.id,
        title,
        jpgExtension,
        externalId: extId,
        ok: false,
        note: `No asset at PNG rendition external ID (${pngKey}).`,
        pngRasters: [],
      })
      continue
    }

    if (pngMatches.length === 0) {
      rows.push({
        jpgId: master.id,
        title,
        jpgExtension,
        externalId: extId,
        ok: false,
        note:
          wrongExtAtPng.length > 0
            ? `At PNG external ID: expected .png, found ${wrongExtAtPng.map((a) => normExt(stringField(a, "extension"))).join(", ")}.`
            : "No PNG at PNG rendition ID.",
        pngRasters,
      })
      continue
    }

    rows.push({
      jpgId: master.id,
      title,
      jpgExtension,
      externalId: extId,
      ok: true,
      note:
        "PNG rendition present with correct file type at expected external ID (no long-side requirement).",
      pngRasters,
    })
  }

  const passCount = rows.filter((r) => r.ok).length
  const failCount = rows.filter((r) => !r.ok).length

  return {
    rows,
    jpgMasterCount: rows.length,
    passCount,
    failCount,
  }
}

export type EvaluateJpgNeedsPngRulesResult = ReturnType<
  typeof evaluateJpgNeedsPngRules
>
