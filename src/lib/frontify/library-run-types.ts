import type { EvaluateCountryMetadataTargetsRulesResult } from "@/lib/rules/country-metadata-targets"
import type { EvaluateJpegRenditionWhiteBgRulesResult } from "@/lib/rules/jpeg-rendition-white-bg"
import type { EvaluateJpgNeedsPngRulesResult } from "@/lib/rules/jpg-needs-png"
import type { EvaluateMasterRenditionMetadataTargetsRulesResult } from "@/lib/rules/master-rendition-metadata-targets"
import type { EvaluatePngNeedsJpegRulesResult } from "@/lib/rules/png-needs-jpeg"
import type { EvaluatePsdPngJpgRulesResult } from "@/lib/rules/psd-png-jpg"
import type { EvaluateTifPngJpgRulesResult } from "@/lib/rules/tif-png-jpg"
import type { FrontifyWebBase } from "@/lib/frontify/frontify-web-base"
import type { FrontifyLibraryAssetItem } from "./types"

export type { FrontifyWebBase }

/** Keys for optional rule suites (asset fetch always runs). */
export const LIBRARY_SUITE_KEYS = [
  "psdPngJpg",
  "tifPngJpg",
  "pngNeedsJpeg",
  "jpgNeedsPng",
  "countryMetadataTargets",
  "masterRenditionMetadataTargets",
  "jpegRenditionWhiteBg",
] as const

export type LibrarySuiteKey = (typeof LIBRARY_SUITE_KEYS)[number]

/** Present only for suites that were not executed on this run. */
export type LibrarySuitesSkipped = Partial<Record<LibrarySuiteKey, true>>

export type LibraryRunSuccessBody = {
  ok: true
  libraryId: number
  total: number
  items: FrontifyLibraryAssetItem[]
  pagesFetched: number
  /** Derived from FRONTIFY_GRAPHQL_URL for “Open in Frontify” links in suite previews. */
  frontifyWebBase: FrontifyWebBase | null
  suitesSkipped: LibrarySuitesSkipped
  psdPngJpg: EvaluatePsdPngJpgRulesResult
  tifPngJpg: EvaluateTifPngJpgRulesResult
  pngNeedsJpeg: EvaluatePngNeedsJpegRulesResult
  jpgNeedsPng: EvaluateJpgNeedsPngRulesResult
  countryMetadataTargets: EvaluateCountryMetadataTargetsRulesResult
  masterRenditionMetadataTargets: EvaluateMasterRenditionMetadataTargetsRulesResult
  jpegRenditionWhiteBg: EvaluateJpegRenditionWhiteBgRulesResult
}

export type LibraryRunErrorBody = {
  ok: false
  errorSummary: string
  errorDetail: string
}

export type LibraryRunResponseBody = LibraryRunSuccessBody | LibraryRunErrorBody
