import type { FrontifyLibraryAssetItem } from "./types"

export function previewHref(item: FrontifyLibraryAssetItem): string | null {
  const p = item.previewUrl
  if (typeof p === "string" && p.length > 0) return p
  return null
}

export function stringField(
  item: FrontifyLibraryAssetItem,
  key: string
): string {
  const v = item[key]
  if (typeof v === "string") return v
  if (v == null) return ""
  return String(v)
}

/** RFC 3339 `modifiedAt` from API, or null if missing. */
export function modifiedAtField(item: FrontifyLibraryAssetItem): string | null {
  const v = item.modifiedAt
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

/** Locale medium date + short time, or null if missing / invalid. */
export function formatModifiedAtDisplay(iso: string | null): string | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/** Milliseconds since epoch for sorting; null if unparseable or missing. */
export function modifiedAtMs(item: FrontifyLibraryAssetItem): number | null {
  const iso = modifiedAtField(item)
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}
