/**
 * One library asset item as returned by LibraryById (all requested fields;
 * additional keys from the API are preserved).
 */
export type FrontifyLibraryAssetItem = Record<string, unknown> & {
  id: string
  /** RFC 3339 date-time from Frontify when requested in the query. */
  modifiedAt?: string
}

export type LibraryByIdResponse = {
  data?: {
    library: {
      assets: {
        total: number
        hasNextPage: boolean
        items: FrontifyLibraryAssetItem[]
      }
    } | null
  }
  errors?: unknown[]
  extensions?: unknown
}
