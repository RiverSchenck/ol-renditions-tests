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
