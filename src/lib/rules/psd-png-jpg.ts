import { stringField } from "@/lib/frontify/asset-helpers"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"

/** Longest side required for the PNG/JPG rendition (API `width` / `height`). */
export const RENDITION_LONG_SIDE_PX = 1200

/** Appended to the PSD/PSB base external ID for the JPEG rendition asset */
export const RENDITION_JPEG_EXTERNAL_SUFFIX = "-rendition-jpeg-1200px"

/** Appended to the PSD/PSB base external ID for the PNG rendition asset */
export const RENDITION_PNG_EXTERNAL_SUFFIX = "-rendition-png-1200px"

/**
 * PSD/PSB Rule 2 (Feature Module / Desktop / Mobile) — same suffix pattern as TIF;
 * no `1200px` in the external ID and no long-side requirement.
 */
export const PSD_MODULE_RENDITION_JPEG_EXTERNAL_SUFFIX = "-rendition-jpeg"
export const PSD_MODULE_RENDITION_PNG_EXTERNAL_SUFFIX = "-rendition-png"

export const PSD_METADATA_ASSET_TYPE_PROPERTY = "Asset Type"
export const PSD_METADATA_SUBCATEGORY_PROPERTY = "Asset Sub-Category"

export const PSD_ASSET_TYPE_PHOTOGRAPHY = "Photography"
export const PSD_SUBCATEGORY_CAROUSEL = "Carousel"
export const PSD_SUBCATEGORY_FEATURE_MODULE = "Feature Module"
export const PSD_SUBCATEGORY_DESKTOP = "Desktop"
export const PSD_SUBCATEGORY_MOBILE = "Mobile"

const MODULE_SUBCATEGORIES_NORM = new Set(
  [
    PSD_SUBCATEGORY_FEATURE_MODULE,
    PSD_SUBCATEGORY_DESKTOP,
    PSD_SUBCATEGORY_MOBILE,
  ].map((s) => s.trim().toLowerCase())
)

export type PsdPsbRenditionScope = {
  /** Master is subject to PSD/PSB rendition rules at derived external IDs. */
  inScope: boolean
  /** When true, matching JPEG or PNG must have 1200px long side (Photography or Carousel). */
  enforce1200LongSide: boolean
}

/** How this PSD/PSB was classified for rendition rules (for UI + API consumers). */
export type PsdPsbScopePath =
  | "out_of_scope"
  | "photography_or_carousel"
  | "module_subcategory"

export type PsdPsbScopeMetadataSnapshot = {
  assetType: string[]
  assetSubCategory: string[]
}

function textsFromMetadataBlock(block: Record<string, unknown>): string[] {
  const texts: string[] = []
  const values = block.values
  if (Array.isArray(values)) {
    for (const v of values) {
      if (!v || typeof v !== "object") continue
      const text = (v as { text?: unknown }).text
      if (typeof text !== "string") continue
      const t = text.trim()
      if (t) texts.push(t)
    }
  }
  const value = block.value
  if (value != null) {
    if (typeof value === "string") {
      const t = value.trim()
      if (t) texts.push(t)
    } else if (typeof value === "object" && "text" in value) {
      const text = (value as { text?: unknown }).text
      if (typeof text === "string") {
        const t = text.trim()
        if (t) texts.push(t)
      }
    }
  }
  return texts
}

function metadataTextsForProperty(
  item: FrontifyLibraryAssetItem,
  propertyName: string
): string[] {
  const raw = item.customMetadata
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const block of raw) {
    if (!block || typeof block !== "object") continue
    const prop = (block as { property?: unknown }).property
    if (!prop || typeof prop !== "object") continue
    const name = (prop as { name?: unknown }).name
    if (typeof name !== "string" || name.trim() !== propertyName) continue
    out.push(...textsFromMetadataBlock(block as Record<string, unknown>))
  }
  return out
}

function normMetaToken(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * Asset Type = Photography **or** Asset Sub-Category = Carousel → in scope; JPEG + PNG renditions;
 * at least one matching JPEG or PNG must have 1200px long side.
 * Sub-Category Feature Module / Desktop / Mobile → in scope, JPEG + PNG at `{base}-rendition-jpeg` / `{base}-rendition-png`, no long-side rule.
 * Photography/Carousel is evaluated first so the 1200px rule applies when that OR is true.
 */
export function psdPsbRenditionScope(item: FrontifyLibraryAssetItem): PsdPsbRenditionScope {
  const assetTypes = metadataTextsForProperty(item, PSD_METADATA_ASSET_TYPE_PROPERTY)
  const subCats = metadataTextsForProperty(item, PSD_METADATA_SUBCATEGORY_PROPERTY)
  const photo = normMetaToken(PSD_ASSET_TYPE_PHOTOGRAPHY)
  const carousel = normMetaToken(PSD_SUBCATEGORY_CAROUSEL)
  const photographyOrCarousel =
    assetTypes.some((t) => normMetaToken(t) === photo) ||
    subCats.some((t) => normMetaToken(t) === carousel)
  if (photographyOrCarousel) {
    return { inScope: true, enforce1200LongSide: true }
  }
  const moduleSubcat = subCats.some((t) =>
    MODULE_SUBCATEGORIES_NORM.has(normMetaToken(t))
  )
  if (moduleSubcat) {
    return { inScope: true, enforce1200LongSide: false }
  }
  return { inScope: false, enforce1200LongSide: false }
}

export function psdPsbRenditionsInScope(item: FrontifyLibraryAssetItem): boolean {
  return psdPsbRenditionScope(item).inScope
}

/** Values read from the master for Asset Type and Asset Sub-Category (empty if unset). */
export function psdPsbScopeMetadataSnapshot(
  item: FrontifyLibraryAssetItem
): PsdPsbScopeMetadataSnapshot {
  return {
    assetType: metadataTextsForProperty(item, PSD_METADATA_ASSET_TYPE_PROPERTY),
    assetSubCategory: metadataTextsForProperty(
      item,
      PSD_METADATA_SUBCATEGORY_PROPERTY
    ),
  }
}

function scopePathFromScope(scope: PsdPsbRenditionScope): PsdPsbScopePath {
  if (!scope.inScope) return "out_of_scope"
  if (scope.enforce1200LongSide) return "photography_or_carousel"
  return "module_subcategory"
}

/** Scope flags plus path + raw metadata for each PSD/PSB rule row. */
export function psdPsbScopeRowContext(item: FrontifyLibraryAssetItem): {
  scope: PsdPsbRenditionScope
  scopePath: PsdPsbScopePath
  scopeMetadata: PsdPsbScopeMetadataSnapshot
} {
  const scope = psdPsbRenditionScope(item)
  return {
    scope,
    scopePath: scopePathFromScope(scope),
    scopeMetadata: psdPsbScopeMetadataSnapshot(item),
  }
}

export const PSD_PSB_RENDITIONS_OUT_OF_SCOPE_NOTE =
  "Renditions not required: only when (1) Asset Type = Photography or Asset Sub-Category = Carousel (JPEG and PNG at {base}-rendition-jpeg-1200px / {base}-rendition-png-1200px, 1200px long side on a matching JPEG or PNG), or (2) Asset Sub-Category is Feature Module, Desktop, or Mobile (JPEG and PNG at {base}-rendition-jpeg / {base}-rendition-png, no long-side requirement)."

/** Rule 1 (Photography or Carousel): `-rendition-jpeg-1200px` / `-rendition-png-1200px`. */
export function expectedJpegRenditionExternalId(baseExternalId: string): string {
  return `${baseExternalId.trim()}${RENDITION_JPEG_EXTERNAL_SUFFIX}`
}

export function expectedPngRenditionExternalId(baseExternalId: string): string {
  return `${baseExternalId.trim()}${RENDITION_PNG_EXTERNAL_SUFFIX}`
}

/** Rule 2 (Feature Module / Desktop / Mobile): `-rendition-jpeg` / `-rendition-png`. */
export function expectedModulePsdJpegRenditionExternalId(baseExternalId: string): string {
  return `${baseExternalId.trim()}${PSD_MODULE_RENDITION_JPEG_EXTERNAL_SUFFIX}`
}

export function expectedModulePsdPngRenditionExternalId(baseExternalId: string): string {
  return `${baseExternalId.trim()}${PSD_MODULE_RENDITION_PNG_EXTERNAL_SUFFIX}`
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

/** Why an in-scope PSD/PSB row failed (informational aggregation). */
export type PsdPngJpgFailKind =
  | "no_base_external_id"
  | "no_assets_at_derived_ids"
  | "missing_jpeg_or_png_or_wrong_type"
  | "long_side_not_1200"

export type PsdPsbScopedRuleBucketSummary = {
  /** In-scope masters on this rule track (metadata matched this profile). */
  inScopeMasterCount: number
  passCount: number
  failCount: number
  failByKind: Record<PsdPngJpgFailKind, number>
}

/**
 * Suite failures split by metadata rule track (informational).
 * Rule 1: Photography or Carousel — JPEG + PNG + 1200px on at least one matching rendition.
 * Rule 2: Feature Module / Desktop / Mobile — JPEG + PNG, no long-side requirement.
 */
export type PsdPsbScopedRuleSummary = {
  photographyOrCarousel: PsdPsbScopedRuleBucketSummary
  moduleSubcategory: PsdPsbScopedRuleBucketSummary
}

const ZERO_FAIL_BY_KIND: Record<PsdPngJpgFailKind, number> = {
  no_base_external_id: 0,
  no_assets_at_derived_ids: 0,
  missing_jpeg_or_png_or_wrong_type: 0,
  long_side_not_1200: 0,
}

export function summarizePsdPsbScopedRuleFailures(
  rows: PsdPngJpgRow[]
): PsdPsbScopedRuleSummary {
  function bucket(
    scope: "photography_or_carousel" | "module_subcategory"
  ): PsdPsbScopedRuleBucketSummary {
    const subset = rows.filter(
      (r) => r.renditionsInScope && r.scopePath === scope
    )
    const failRows = subset.filter((r) => !r.ok)
    const failByKind = { ...ZERO_FAIL_BY_KIND }
    for (const r of failRows) {
      const k = r.failKind
      if (k) failByKind[k] += 1
    }
    return {
      inScopeMasterCount: subset.length,
      passCount: subset.filter((r) => r.ok).length,
      failCount: failRows.length,
      failByKind,
    }
  }
  return {
    photographyOrCarousel: bucket("photography_or_carousel"),
    moduleSubcategory: bucket("module_subcategory"),
  }
}

export type PsdPngJpgRow = {
  psdId: string
  title: string
  psdExtension: string
  /** Base external ID on the PSD/PSB */
  externalId: string
  /** False when metadata does not require PSD/PSB renditions. */
  renditionsInScope: boolean
  /** When in scope: true = require 1200px long side on a matching JPEG or PNG. */
  enforce1200LongSide: boolean
  /** Why this master was classified (or not) for rendition checks. */
  scopePath: PsdPsbScopePath
  /** Asset Type / Asset Sub-Category values read from the master. */
  scopeMetadata: PsdPsbScopeMetadataSnapshot
  ok: boolean
  note: string
  rasters: PsdPngJpgRasterInfo[]
  /** Set when in-scope and failed — drives `summarizePsdPsbScopedRuleFailures`. */
  failKind?: PsdPngJpgFailKind
}

export type EvaluatePsdPngJpgRulesResult = {
  rows: PsdPngJpgRow[]
  psdCount: number
  passCount: number
  failCount: number
  scopedRuleSummary: PsdPsbScopedRuleSummary
  inventory: PsdPsbRenditionPairInventory
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

/**
 * JPEG + PNG presence for every PSD/PSB — ignores metadata scope (informational only).
 * Counts complete if **either** the Rule 1 pair (`-rendition-jpeg-1200px` / `-rendition-png-1200px`)
 * **or** the Rule 2 pair (`-rendition-jpeg` / `-rendition-png`) has matching types at both IDs.
 */
export type PsdPsbRenditionPairInventory = {
  totalPsdPsbCount: number
  /** Cannot derive rendition external IDs. */
  noBaseExternalIdCount: number
  /** Has base ID and a matching JPEG and PNG at the two derived IDs. */
  completeRenditionPairCount: number
  /** Has base ID but missing JPEG and/or PNG (or wrong extension at either slot). */
  incompleteRenditionPairCount: number
}

export function countPsdPsbRenditionPairInventory(
  items: FrontifyLibraryAssetItem[]
): PsdPsbRenditionPairInventory {
  const byExternalId = indexByExternalId(items)
  let totalPsdPsbCount = 0
  let noBaseExternalIdCount = 0
  let completeRenditionPairCount = 0
  let incompleteRenditionPairCount = 0

  for (const psd of items) {
    if (!isPsdOrPsb(psd)) continue
    totalPsdPsbCount += 1
    const extId = stringField(psd, "externalId").trim()
    if (!extId) {
      noBaseExternalIdCount += 1
      continue
    }
    const j1200 = expectedJpegRenditionExternalId(extId)
    const p1200 = expectedPngRenditionExternalId(extId)
    const jMod = expectedModulePsdJpegRenditionExternalId(extId)
    const pMod = expectedModulePsdPngRenditionExternalId(extId)
    const pair1200 =
      (byExternalId.get(j1200) ?? []).some(isJpegExtension) &&
      (byExternalId.get(p1200) ?? []).some(isPngExtension)
    const pairMod =
      (byExternalId.get(jMod) ?? []).some(isJpegExtension) &&
      (byExternalId.get(pMod) ?? []).some(isPngExtension)
    if (pair1200 || pairMod) completeRenditionPairCount += 1
    else incompleteRenditionPairCount += 1
  }

  return {
    totalPsdPsbCount,
    noBaseExternalIdCount,
    completeRenditionPairCount,
    incompleteRenditionPairCount,
  }
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
): Omit<EvaluatePsdPngJpgRulesResult, "inventory"> {
  const byExternalId = indexByExternalId(items)
  const rows: PsdPngJpgRow[] = []

  for (const psd of items) {
    if (!isPsdOrPsb(psd)) continue

    const extId = stringField(psd, "externalId").trim()
    const psdExtension = normExt(stringField(psd, "extension")) || "—"
    const title = stringField(psd, "title") || "—"
    const { scope, scopePath, scopeMetadata } = psdPsbScopeRowContext(psd)

    if (!scope.inScope) {
      rows.push({
        psdId: psd.id,
        title,
        psdExtension,
        externalId: extId,
        renditionsInScope: false,
        enforce1200LongSide: false,
        scopePath,
        scopeMetadata,
        ok: true,
        note: PSD_PSB_RENDITIONS_OUT_OF_SCOPE_NOTE,
        rasters: [],
      })
      continue
    }

    if (!extId) {
      rows.push({
        psdId: psd.id,
        title,
        psdExtension,
        externalId: "",
        renditionsInScope: true,
        enforce1200LongSide: scope.enforce1200LongSide,
        scopePath,
        scopeMetadata,
        ok: false,
        failKind: "no_base_external_id",
        note: "PSD/PSB has no external ID (cannot derive rendition external IDs).",
        rasters: [],
      })
      continue
    }

    const useRule1Ids = scope.enforce1200LongSide
    const jpegKey = useRule1Ids
      ? expectedJpegRenditionExternalId(extId)
      : expectedModulePsdJpegRenditionExternalId(extId)
    const pngKey = useRule1Ids
      ? expectedPngRenditionExternalId(extId)
      : expectedModulePsdPngRenditionExternalId(extId)

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

    const baseFields = {
      psdId: psd.id,
      title,
      psdExtension,
      externalId: extId,
      renditionsInScope: true as const,
      enforce1200LongSide: scope.enforce1200LongSide,
      scopePath,
      scopeMetadata,
    }

    if (atJpegId.length === 0 && atPngId.length === 0) {
      rows.push({
        ...baseFields,
        ok: false,
        failKind: "no_assets_at_derived_ids",
        note: `No assets at ${jpegKey} or ${pngKey}.`,
        rasters: [],
      })
      continue
    }

    if (jpegMatches.length === 0 || pngMatches.length === 0) {
      const parts: string[] = []
      if (jpegMatches.length === 0) {
        if (atJpegId.length === 0) {
          parts.push(`No asset at JPEG rendition ID ${jpegKey}.`)
        } else if (wrongExtAtJpeg.length) {
          parts.push(
            `At ${jpegKey}: expected .jpg/.jpeg, found ${wrongExtAtJpeg.map((a) => normExt(stringField(a, "extension"))).join(", ")}.`
          )
        } else {
          parts.push(`No JPG/JPEG at ${jpegKey}.`)
        }
      }
      if (pngMatches.length === 0) {
        if (atPngId.length === 0) {
          parts.push(`No asset at PNG rendition ID ${pngKey}.`)
        } else if (wrongExtAtPng.length) {
          parts.push(
            `At ${pngKey}: expected .png, found ${wrongExtAtPng.map((a) => normExt(stringField(a, "extension"))).join(", ")}.`
          )
        } else {
          parts.push(`No PNG at ${pngKey}.`)
        }
      }
      rows.push({
        ...baseFields,
        ok: false,
        failKind: "missing_jpeg_or_png_or_wrong_type",
        note: parts.join(" "),
        rasters: rasterInfos,
      })
      continue
    }

    if (scope.enforce1200LongSide) {
      const jpegOk = jpegMatches.some(
        (r) => longestSide(r) === RENDITION_LONG_SIDE_PX
      )
      const pngOk = pngMatches.some(
        (r) => longestSide(r) === RENDITION_LONG_SIDE_PX
      )

      if (jpegOk || pngOk) {
        rows.push({
          ...baseFields,
          ok: true,
          note:
            jpegOk && pngOk
              ? "Photography or Carousel: JPEG and PNG renditions both have 1200px long side."
              : jpegOk
                ? "Photography or Carousel: JPEG rendition has 1200px long side."
                : "Photography or Carousel: PNG rendition has 1200px long side.",
          rasters: rasterInfos,
        })
      } else {
        rows.push({
          ...baseFields,
          ok: false,
          failKind: "long_side_not_1200",
          note:
            "Photography or Carousel: JPEG and PNG present at expected IDs but no 1200px long side on a matching JPG/JPEG or PNG.",
          rasters: rasterInfos,
        })
      }
    } else {
      rows.push({
        ...baseFields,
        ok: true,
        note:
          "Feature Module / Desktop / Mobile: JPEG and PNG renditions present at {base}-rendition-jpeg and {base}-rendition-png (no long-side requirement).",
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
    scopedRuleSummary: summarizePsdPsbScopedRuleFailures(rows),
  }
}
