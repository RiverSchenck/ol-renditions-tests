import { parseFrontifyLibraryIdFromEnv } from "@/lib/frontify/library-id-from-env"
import { resolveFrontifyWebBaseFromEnv } from "@/lib/frontify/frontify-web-base"
import { fetchLibraryAssets } from "@/lib/frontify/fetch-library-assets"
import {
  LIBRARY_SUITE_KEYS,
  type LibraryRunErrorBody,
  type LibraryRunResponseBody,
  type LibraryRunSuccessBody,
  type LibrarySuitesSkipped,
  type LibrarySuiteKey,
} from "@/lib/frontify/library-run-types"
import { evaluateCountryMetadataTargetsRules } from "@/lib/rules/country-metadata-targets"
import type { EvaluateCountryMetadataTargetsRulesResult } from "@/lib/rules/country-metadata-targets"
import { evaluateJpegRenditionWhiteBgRules } from "@/lib/rules/jpeg-rendition-white-bg"
import type { EvaluateJpegRenditionWhiteBgRulesResult } from "@/lib/rules/jpeg-rendition-white-bg"
import { evaluateJpgNeedsPngRules } from "@/lib/rules/jpg-needs-png"
import type { EvaluateJpgNeedsPngRulesResult } from "@/lib/rules/jpg-needs-png"
import { evaluateMasterRenditionMetadataTargetsRules } from "@/lib/rules/master-rendition-metadata-targets"
import type { EvaluateMasterRenditionMetadataTargetsRulesResult } from "@/lib/rules/master-rendition-metadata-targets"
import { evaluatePngNeedsJpegRules } from "@/lib/rules/png-needs-jpeg"
import type { EvaluatePngNeedsJpegRulesResult } from "@/lib/rules/png-needs-jpeg"
import {
  countPsdPsbRenditionPairInventory,
  evaluatePsdPngJpgRules,
  summarizePsdPsbScopedRuleFailures,
} from "@/lib/rules/psd-png-jpg"
import type { EvaluatePsdPngJpgRulesResult } from "@/lib/rules/psd-png-jpg"
import { evaluateTifPngJpgRules } from "@/lib/rules/tif-png-jpg"
import type { EvaluateTifPngJpgRulesResult } from "@/lib/rules/tif-png-jpg"

export type RunProgressLine = {
  variant: "command" | "output" | "success" | "muted" | "error"
  text: string
}

const EMPTY_PSD: EvaluatePsdPngJpgRulesResult = {
  rows: [],
  psdCount: 0,
  passCount: 0,
  failCount: 0,
  scopedRuleSummary: summarizePsdPsbScopedRuleFailures([]),
  inventory: {
    totalPsdPsbCount: 0,
    noBaseExternalIdCount: 0,
    completeRenditionPairCount: 0,
    incompleteRenditionPairCount: 0,
  },
}

const EMPTY_TIF: EvaluateTifPngJpgRulesResult = {
  rows: [],
  tifCount: 0,
  passCount: 0,
  failCount: 0,
}

const EMPTY_PNG_JPEG: EvaluatePngNeedsJpegRulesResult = {
  rows: [],
  pngMasterCount: 0,
  passCount: 0,
  failCount: 0,
}

const EMPTY_JPG_PNG: EvaluateJpgNeedsPngRulesResult = {
  rows: [],
  jpgMasterCount: 0,
  passCount: 0,
  failCount: 0,
}

const EMPTY_JPEG_BG: EvaluateJpegRenditionWhiteBgRulesResult = {
  rows: [],
  jpegRenditionCount: 0,
  passCount: 0,
  failCount: 0,
}

const EMPTY_COUNTRY_METADATA_TARGETS: EvaluateCountryMetadataTargetsRulesResult =
  {
    rows: [],
    assetCount: 0,
    passCount: 0,
    failCount: 0,
  }

const EMPTY_MASTER_RENDITION_METADATA_TARGETS: EvaluateMasterRenditionMetadataTargetsRulesResult =
  {
    rows: [],
    masterCount: 0,
    passCount: 0,
    failCount: 0,
  }

const DEFAULT_CHECKS: Record<LibrarySuiteKey, boolean> = {
  psdPngJpg: true,
  tifPngJpg: true,
  pngNeedsJpeg: true,
  jpgNeedsPng: true,
  countryMetadataTargets: true,
  masterRenditionMetadataTargets: true,
  jpegRenditionWhiteBg: true,
}

export type RunLibraryCheckResolvedInput = {
  libraryId: number
  checks: Record<LibrarySuiteKey, boolean>
}

function log(
  onLine: ((line: RunProgressLine) => void) | undefined,
  variant: RunProgressLine["variant"],
  text: string
) {
  onLine?.({ variant, text })
}

function suitesSkippedFromChecks(
  checks: Record<LibrarySuiteKey, boolean>
): LibrarySuitesSkipped {
  const out: LibrarySuitesSkipped = {}
  for (const key of LIBRARY_SUITE_KEYS) {
    if (!checks[key]) out[key] = true
  }
  return out
}

/**
 * Resolve library id from env and per-suite flags from an optional JSON body.
 */
export function resolveRunLibraryCheckInput(
  body: unknown,
  envLibraryId: string | undefined
):
  | { ok: true; input: RunLibraryCheckResolvedInput }
  | { ok: false; error: LibraryRunErrorBody } {
  const checks: Record<LibrarySuiteKey, boolean> = { ...DEFAULT_CHECKS }

  if (body !== undefined && body !== null && typeof body === "object") {
    const o = body as Record<string, unknown>
    if (o.checks !== undefined && o.checks !== null && typeof o.checks === "object") {
      const c = o.checks as Record<string, unknown>
      for (const key of LIBRARY_SUITE_KEYS) {
        if (typeof c[key] === "boolean") {
          checks[key] = c[key] as boolean
        }
      }
    }
  }

  const parsed = parseFrontifyLibraryIdFromEnv(envLibraryId)

  if (!parsed.ok) {
    const err: LibraryRunErrorBody =
      parsed.kind === "invalid"
        ? {
            ok: false,
            errorSummary:
              "Invalid library ID. FRONTIFY_LIBRARY_ID must be a positive integer (digits only).",
            errorDetail: JSON.stringify(
              { code: "INVALID_LIBRARY_ID" },
              null,
              2
            ),
          }
        : {
            ok: false,
            errorSummary:
              "Missing library ID. Set FRONTIFY_LIBRARY_ID to a positive integer in your environment.",
            errorDetail: JSON.stringify(
              { code: "MISSING_LIBRARY_ID" },
              null,
              2
            ),
          }
    return { ok: false, error: err }
  }

  return {
    ok: true,
    input: { libraryId: parsed.id, checks },
  }
}

export function libraryRunHttpStatus(body: LibraryRunResponseBody): number {
  if (body.ok) return 200
  try {
    const d = JSON.parse(body.errorDetail) as { code?: string; variable?: string }
    if (d.code === "MISSING_LIBRARY_ID" || d.code === "INVALID_LIBRARY_ID")
      return 400
    if (d.code === "MISSING_ENV" && d.variable === "FRONTIFY_LIBRARY_ID") {
      return 400
    }
  } catch {
    /* ignore */
  }
  return 502
}

/**
 * Single orchestration path for POST /api/frontify/library and the streaming variant.
 */
export async function runLibraryCheck(
  input: RunLibraryCheckResolvedInput,
  onLine?: (line: RunProgressLine) => void
): Promise<LibraryRunResponseBody> {
  const { libraryId, checks } = input
  const suitesSkipped = suitesSkippedFromChecks(checks)

  log(
    onLine,
    "command",
    `POST GraphQL — Frontify library ${String(libraryId).slice(0, 8)}…`
  )

  const result = await fetchLibraryAssets(libraryId, {
    onPage: (p) => {
      log(
        onLine,
        "output",
        `  page ${p.page}: +${p.pageItemCount} assets (${p.itemsSoFar} loaded · ${p.total} total in library)${
          p.hasNextPage ? " — fetching next…" : ""
        }`
      )
    },
  })

  if (!result.ok) {
    log(onLine, "error", result.errorSummary)
    const err: LibraryRunErrorBody = {
      ok: false,
      errorSummary: result.errorSummary,
      errorDetail: result.errorDetail,
    }
    return err
  }

  log(
    onLine,
    "success",
    `✓ Loaded ${result.items.length} assets across ${result.pagesFetched} GraphQL page(s).`
  )

  let psdPngJpg = EMPTY_PSD
  let tifPngJpg = EMPTY_TIF
  let pngNeedsJpeg = EMPTY_PNG_JPEG
  let jpgNeedsPng = EMPTY_JPG_PNG
  let countryMetadataTargets = EMPTY_COUNTRY_METADATA_TARGETS
  let masterRenditionMetadataTargets = EMPTY_MASTER_RENDITION_METADATA_TARGETS

  const localSuiteEnabled =
    checks.psdPngJpg ||
    checks.tifPngJpg ||
    checks.pngNeedsJpeg ||
    checks.jpgNeedsPng ||
    checks.countryMetadataTargets ||
    checks.masterRenditionMetadataTargets

  if (localSuiteEnabled) {
    log(onLine, "command", "Evaluating rule suites (local, in-memory)…")
    if (checks.tifPngJpg) {
      tifPngJpg = evaluateTifPngJpgRules(result.items)
    }
    if (checks.pngNeedsJpeg) {
      pngNeedsJpeg = evaluatePngNeedsJpegRules(result.items)
    }
    if (checks.jpgNeedsPng) {
      jpgNeedsPng = evaluateJpgNeedsPngRules(result.items)
    }
    if (checks.countryMetadataTargets) {
      countryMetadataTargets = evaluateCountryMetadataTargetsRules(result.items)
    }
    if (checks.masterRenditionMetadataTargets) {
      masterRenditionMetadataTargets =
        evaluateMasterRenditionMetadataTargetsRules(result.items)
    }
    const ran = LIBRARY_SUITE_KEYS.filter(
      (k) =>
        k !== "jpegRenditionWhiteBg" && checks[k]
    ).join(", ")
    log(
      onLine,
      "output",
      `  Local rules evaluated: ${ran || "(none)"} — ${result.items.length} rows.`
    )
  } else {
    log(
      onLine,
      "muted",
      "  Skipping PSD/TIF/PNG/JPG local rule suites (all disabled)."
    )
  }

  psdPngJpg = {
    ...(checks.psdPngJpg && localSuiteEnabled
      ? evaluatePsdPngJpgRules(result.items)
      : {
          rows: [],
          psdCount: 0,
          passCount: 0,
          failCount: 0,
          scopedRuleSummary: summarizePsdPsbScopedRuleFailures([]),
        }),
    inventory: countPsdPsbRenditionPairInventory(result.items),
  }

  const accessToken = process.env.FRONTIFY_ACCESS_TOKEN?.trim()

  let jpegRenditionWhiteBg = EMPTY_JPEG_BG

  if (checks.jpegRenditionWhiteBg) {
    log(
      onLine,
      "command",
      "GET preview JPEGs — white-border pixel check (network)…"
    )

    jpegRenditionWhiteBg = await evaluateJpegRenditionWhiteBgRules(
      result.items,
      {
        accessToken: accessToken || undefined,
        onBatch: ({ batchIndex, batchCount, batchSize, total }) => {
          log(
            onLine,
            "output",
            `  batch ${batchIndex}/${batchCount}: downloading ${batchSize} preview(s) (${total} JPEG renditions total)…`
          )
        },
        onProgress: ({ processed, total }) => {
          log(
            onLine,
            "muted",
            `  …analyzed ${processed}/${total} preview image(s)`
          )
        },
      }
    )

    log(
      onLine,
      "success",
      `✓ JPEG white-border check: ${jpegRenditionWhiteBg.jpegRenditionCount} rendition(s), ${jpegRenditionWhiteBg.failCount} fail.`
    )
  } else {
    log(
      onLine,
      "muted",
      "  Skipping JPEG preview / white-border check (disabled)."
    )
  }

  const body: LibraryRunSuccessBody = {
    ok: true,
    libraryId: result.libraryId,
    total: result.total,
    items: result.items,
    pagesFetched: result.pagesFetched,
    frontifyWebBase: resolveFrontifyWebBaseFromEnv(),
    suitesSkipped,
    psdPngJpg,
    tifPngJpg,
    pngNeedsJpeg,
    jpgNeedsPng,
    countryMetadataTargets,
    masterRenditionMetadataTargets,
    jpegRenditionWhiteBg,
  }

  log(onLine, "success", "✓ Run complete.")
  return body
}
