export type ParsedFrontifyLibraryId =
  | { ok: true; id: number }
  | { ok: false; kind: "missing" }
  | { ok: false; kind: "invalid" }

/**
 * Parse `FRONTIFY_LIBRARY_ID` as a positive integer (digits only after trim).
 */
export function parseFrontifyLibraryIdFromEnv(
  raw: string | undefined
): ParsedFrontifyLibraryId {
  if (raw === undefined) return { ok: false, kind: "missing" }
  const s = String(raw).trim()
  if (!s) return { ok: false, kind: "missing" }
  if (!/^\d+$/.test(s)) return { ok: false, kind: "invalid" }
  const id = parseInt(s, 10)
  if (id < 1) return { ok: false, kind: "invalid" }
  return { ok: true, id }
}
