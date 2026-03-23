import {
  LIBRARY_ASSETS_PAGE_SIZE,
  LIBRARY_BY_ID_QUERY,
} from "./library-query"
import type { FrontifyLibraryAssetItem, LibraryByIdResponse } from "./types"

function getEnv(name: string): string | undefined {
  const v = process.env[name]
  return v && v.length > 0 ? v : undefined
}

function stringifyDetail(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

function graphqlErrorSummary(errors: unknown[]): string {
  return errors
    .map((e) => {
      if (e && typeof e === "object" && "message" in e) {
        const m = (e as { message: unknown }).message
        if (typeof m === "string") return m
      }
      return stringifyDetail(e)
    })
    .join("\n")
}

export type FetchLibraryAssetsResult =
  | {
      ok: true
      libraryId: number
      total: number
      /** Always false once every page has been loaded */
      hasNextPage: false
      items: FrontifyLibraryAssetItem[]
      /** How many GraphQL pages were fetched */
      pagesFetched: number
    }
  | { ok: false; errorSummary: string; errorDetail: string }

const MAX_ASSET_PAGES = 5000

async function fetchAssetsPage(
  url: string,
  token: string,
  libraryId: number,
  limit: number,
  page: number
): Promise<
  | {
      ok: true
      total: number
      hasNextPage: boolean
      rawItems: unknown[]
    }
  | { ok: false; errorSummary: string; errorDetail: string }
> {
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: LIBRARY_BY_ID_QUERY,
        variables: { id: libraryId, limit, page },
      }),
      cache: "no-store",
    })
  } catch (e) {
    const summary = e instanceof Error ? e.message : "Network error"
    return {
      ok: false,
      errorSummary: summary,
      errorDetail: stringifyDetail(
        e instanceof Error
          ? {
              name: e.name,
              message: e.message,
              stack: e.stack,
            }
          : { thrown: String(e) }
      ),
    }
  }

  const responseText = await res.text()
  let body: unknown = responseText
  try {
    body = responseText.length > 0 ? JSON.parse(responseText) : null
  } catch {
    body = { parseError: "Response was not valid JSON", rawBody: responseText }
  }

  if (!res.ok) {
    const errorSummary =
      res.status === 403
        ? "403 Forbidden — you've probably been IP-blocked or rate-limited (classic). Take a break and try again later, or double-check your token and GraphQL URL if you're feeling lucky."
        : `Frontify HTTP ${res.status}: ${res.statusText}`

    return {
      ok: false,
      errorSummary,
      errorDetail: stringifyDetail({
        httpStatus: res.status,
        statusText: res.statusText,
        body,
      }),
    }
  }

  const json = body as LibraryByIdResponse

  if (json.errors?.length) {
    return {
      ok: false,
      errorSummary: graphqlErrorSummary(json.errors),
      errorDetail: stringifyDetail(json),
    }
  }

  const lib = json.data?.library
  if (!lib) {
    return {
      ok: false,
      errorSummary:
        "No library in response (check id and permissions).",
      errorDetail: stringifyDetail(json),
    }
  }

  const { total, hasNextPage, items } = lib.assets
  const rawItems = Array.isArray(items) ? items : []

  return {
    ok: true,
    total,
    hasNextPage: Boolean(hasNextPage),
    rawItems,
  }
}

export type FetchLibraryAssetsPageInfo = {
  page: number
  pageItemCount: number
  itemsSoFar: number
  total: number
  hasNextPage: boolean
}

export async function fetchLibraryAssets(
  libraryId: number,
  options?: {
    onPage?: (info: FetchLibraryAssetsPageInfo) => void
  }
): Promise<FetchLibraryAssetsResult> {
  const token = getEnv("FRONTIFY_ACCESS_TOKEN")
  if (!token) {
    return {
      ok: false,
      errorSummary:
        "Missing FRONTIFY_ACCESS_TOKEN. Copy .env.example to .env.local and set your bearer token.",
      errorDetail: stringifyDetail({
        code: "MISSING_ENV",
        variable: "FRONTIFY_ACCESS_TOKEN",
      }),
    }
  }

  const url = getEnv("FRONTIFY_GRAPHQL_URL")
  if (!url) {
    return {
      ok: false,
      errorSummary:
        "Missing FRONTIFY_GRAPHQL_URL. Set the full GraphQL endpoint URL in your environment file.",
      errorDetail: stringifyDetail({
        code: "MISSING_ENV",
        variable: "FRONTIFY_GRAPHQL_URL",
      }),
    }
  }

  const limit = LIBRARY_ASSETS_PAGE_SIZE
  const allItems: FrontifyLibraryAssetItem[] = []
  let page = 1
  let total = 0
  let hasNextPage = true

  while (hasNextPage) {
    if (page > MAX_ASSET_PAGES) {
      return {
        ok: false,
        errorSummary: `Stopped after ${MAX_ASSET_PAGES} pages to avoid an unbounded loop. Raise the cap or check API pagination.`,
        errorDetail: stringifyDetail({
          code: "PAGINATION_CAP",
          pagesFetched: page - 1,
          itemsCollected: allItems.length,
        }),
      }
    }

    const chunk = await fetchAssetsPage(url, token, libraryId, limit, page)
    if (!chunk.ok) return chunk

    total = chunk.total
    hasNextPage = chunk.hasNextPage

    for (const raw of chunk.rawItems) {
      const item = normalizeAssetItem(raw)
      if (item) allItems.push(item)
    }

    options?.onPage?.({
      page,
      pageItemCount: chunk.rawItems.length,
      itemsSoFar: allItems.length,
      total,
      hasNextPage,
    })

    if (chunk.rawItems.length === 0 && hasNextPage) {
      return {
        ok: false,
        errorSummary:
          "Frontify reported more pages but returned no items; stopping.",
        errorDetail: stringifyDetail({
          code: "EMPTY_PAGE_WITH_NEXT",
          page,
          total,
        }),
      }
    }

    page += 1
  }

  return {
    ok: true,
    libraryId,
    total,
    hasNextPage: false,
    items: allItems,
    pagesFetched: page - 1,
  }
}

function normalizeAssetItem(raw: unknown): FrontifyLibraryAssetItem | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  if (o.id === undefined || o.id === null) return null
  return { ...o, id: String(o.id) } as FrontifyLibraryAssetItem
}
