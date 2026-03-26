import { stringField } from "@/lib/frontify/asset-helpers"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"

/** Frontify target names for Country use this prefix plus the metadata option text. */
export const COUNTRY_TARGET_NAME_PREFIX = "Country | "

export function expectedCountryTargetName(countryOptionText: string): string {
  return `${COUNTRY_TARGET_NAME_PREFIX}${countryOptionText}`
}

function targetNamesFromItem(item: FrontifyLibraryAssetItem): Set<string> {
  const out = new Set<string>()
  const raw = item.targets
  if (!Array.isArray(raw)) return out
  for (const t of raw) {
    if (!t || typeof t !== "object") continue
    const n = (t as { name?: unknown }).name
    if (typeof n === "string" && n.length > 0) out.add(n)
  }
  return out
}

/** Texts from the custom metadata property named exactly `Country`. */
export function countryMetadataTextsFromItem(
  item: FrontifyLibraryAssetItem
): string[] {
  const raw = item.customMetadata
  if (!Array.isArray(raw)) return []
  const texts: string[] = []
  for (const block of raw) {
    if (!block || typeof block !== "object") continue
    const prop = (block as { property?: unknown }).property
    if (!prop || typeof prop !== "object") continue
    const name = (prop as { name?: unknown }).name
    if (name !== "Country") continue
    const values = (block as { values?: unknown }).values
    if (!Array.isArray(values)) continue
    for (const v of values) {
      if (!v || typeof v !== "object") continue
      const text = (v as { text?: unknown }).text
      if (typeof text !== "string") continue
      const trimmed = text.trim()
      if (trimmed.length > 0) texts.push(trimmed)
    }
  }
  return texts
}

export type CountryMetadataTargetPair = {
  countryText: string
  expectedTargetName: string
  matched: boolean
}

export type CountryMetadataTargetsRow = {
  assetId: string
  title: string
  ok: boolean
  note: string
  /** One row per distinct Country metadata option — expected target and whether it appears in `targets`. */
  pairs: CountryMetadataTargetPair[]
  /** Expected target names that are missing from `targets` (subset of pairs where matched is false). */
  missingTargets: string[]
  /** Targets on the asset that are not required by Country metadata for this load (`Country | {text}`). */
  extraTargets: string[]
}

export function evaluateCountryMetadataTargetsRules(
  items: FrontifyLibraryAssetItem[]
): {
  rows: CountryMetadataTargetsRow[]
  assetCount: number
  passCount: number
  failCount: number
} {
  const rows: CountryMetadataTargetsRow[] = []

  for (const item of items) {
    const countryTexts = countryMetadataTextsFromItem(item)
    if (countryTexts.length === 0) continue

    const targets = targetNamesFromItem(item)
    const seen = new Set<string>()
    const dedupedTexts: string[] = []
    for (const t of countryTexts) {
      if (seen.has(t)) continue
      seen.add(t)
      dedupedTexts.push(t)
    }

    const expectedNames = new Set(
      dedupedTexts.map((text) => expectedCountryTargetName(text))
    )

    const pairs: CountryMetadataTargetPair[] = dedupedTexts.map((text) => {
      const expectedTargetName = expectedCountryTargetName(text)
      return {
        countryText: text,
        expectedTargetName,
        matched: targets.has(expectedTargetName),
      }
    })

    const missingTargets = pairs
      .filter((p) => !p.matched)
      .map((p) => p.expectedTargetName)

    const extraTargets = [...targets]
      .filter((t) => !expectedNames.has(t))
      .sort((a, b) => a.localeCompare(b))

    const ok = missingTargets.length === 0 && extraTargets.length === 0
    const title = stringField(item, "title").trim() || "—"
    rows.push({
      assetId: item.id,
      title,
      ok,
      note: ok
        ? "Country metadata and targets are fully aligned."
        : [
            missingTargets.length > 0
              ? `Missing target(s): ${missingTargets.join(", ")}.`
              : null,
            extraTargets.length > 0
              ? `Target(s) without matching Country metadata: ${extraTargets.join(", ")}.`
              : null,
          ]
            .filter(Boolean)
            .join(" "),
      pairs,
      missingTargets,
      extraTargets,
    })
  }

  const passCount = rows.filter((r) => r.ok).length
  const failCount = rows.filter((r) => !r.ok).length

  return {
    rows,
    assetCount: rows.length,
    passCount,
    failCount,
  }
}

export type EvaluateCountryMetadataTargetsRulesResult = ReturnType<
  typeof evaluateCountryMetadataTargetsRules
>
