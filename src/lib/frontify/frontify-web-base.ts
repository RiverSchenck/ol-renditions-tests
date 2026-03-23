/** Path segment for Frontify web UI asset screens (deep links from this app). */
const FRONTIFY_ASSET_SCREEN_PATH = "/screen"

/**
 * Derive the brand web origin from the GraphQL API URL so we can deep-link to
 * asset screens (`/screen` in the Frontify web UI).
 */
export type FrontifyWebBase = {
  origin: string
  screenPath: string
}

export function resolveFrontifyWebBaseFromEnv(): FrontifyWebBase | null {
  const gql = process.env.FRONTIFY_GRAPHQL_URL?.trim()
  if (!gql) return null
  try {
    const origin = new URL(gql).origin
    return { origin, screenPath: FRONTIFY_ASSET_SCREEN_PATH }
  } catch {
    return null
  }
}

/**
 * GraphQL `asset.id` values are typically a base64-encoded JSON payload such as
 * `{"identifier":948,"type":"asset"}`. The Frontify web UI screen URL uses the
 * numeric `identifier`, not the raw GraphQL id string.
 */
export function frontifyScreenIdFromGraphqlAssetId(graphqlAssetId: string): string {
  const trimmed = graphqlAssetId.trim()
  if (!trimmed) return trimmed

  try {
    let b64 = trimmed.replace(/-/g, "+").replace(/_/g, "/")
    const rem = b64.length % 4
    if (rem > 0) b64 += "=".repeat(4 - rem)

    const jsonStr =
      typeof Buffer !== "undefined"
        ? Buffer.from(b64, "base64").toString("utf8")
        : atob(b64)

    const obj = JSON.parse(jsonStr) as { identifier?: unknown; type?: unknown }
    if (obj != null && typeof obj === "object" && "identifier" in obj) {
      const id = obj.identifier
      if (typeof id === "number" && Number.isFinite(id)) return String(id)
      if (typeof id === "string" && /^\d+$/.test(id)) return id
    }
  } catch {
    /* not a Frontify global id — use raw */
  }

  return trimmed
}

export function frontifyScreenHref(
  base: FrontifyWebBase,
  graphqlAssetId: string
): string {
  const o = base.origin.replace(/\/$/, "")
  const screenId = frontifyScreenIdFromGraphqlAssetId(graphqlAssetId)
  return `${o}${base.screenPath}/${encodeURIComponent(screenId)}`
}
