"use client"

import {
  expectedJpegRenditionExternalId,
  expectedModulePsdJpegRenditionExternalId,
  expectedModulePsdPngRenditionExternalId,
  expectedPngRenditionExternalId,
  RENDITION_LONG_SIDE_PX,
  type PsdPsbRenditionPairInventory,
  type PsdPsbScopedRuleBucketSummary,
  type PsdPsbScopedRuleSummary,
  type PsdPsbScopePath,
  type PsdPngJpgFailKind,
  type PsdPngJpgRasterInfo,
  type PsdPngJpgRow,
} from "@/lib/rules/psd-png-jpg"
import { PsdScopeMetadataSummary } from "@/components/psd-scope-metadata-summary"
import { RuleCaseVisualRow } from "@/components/rule-case-visual-row"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RuleSuitePanelHeader } from "@/components/rule-suite-panel-header"
import type { FrontifyWebBase } from "@/lib/frontify/frontify-web-base"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"
import { cn, sortRuleRowsFailsFirst } from "@/lib/utils"
import * as React from "react"
import type { ReactNode } from "react"
import { AlertCircle, Check, Minus, X } from "lucide-react"

type Props = {
  rows: PsdPngJpgRow[]
  psdCount: number
  passCount: number
  failCount: number
  inventory: PsdPsbRenditionPairInventory
  scopedRuleSummary: PsdPsbScopedRuleSummary
  items: FrontifyLibraryAssetItem[]
  frontifyWebBase: FrontifyWebBase | null
}

/** Which masters appear in the case list (two in-scope rules + out of scope + all). */
type PsdCaseScopeFilter = "all" | PsdPsbScopePath

const scopeFilterSelectClass =
  "h-8 max-w-[min(100%,28rem)] rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

function countRowsByScopePath(rows: PsdPngJpgRow[], path: PsdPsbScopePath): number {
  return rows.filter((r) => r.scopePath === path).length
}

const FAIL_KIND_LABEL: Record<PsdPngJpgFailKind, string> = {
  no_base_external_id: "no base external ID",
  no_assets_at_derived_ids: "nothing at derived JPEG/PNG IDs",
  missing_jpeg_or_png_or_wrong_type: "wrong or missing JPEG/PNG",
  long_side_not_1200: `long side not ${RENDITION_LONG_SIDE_PX}px`,
}

function formatFailKindBreakdown(b: PsdPsbScopedRuleBucketSummary): string | null {
  if (b.failCount === 0) return null
  const parts = (Object.keys(b.failByKind) as PsdPngJpgFailKind[])
    .map((k) => ({ k, n: b.failByKind[k] }))
    .filter(({ n }) => n > 0)
    .map(({ k, n }) => `${n} ${FAIL_KIND_LABEL[k]}`)
  return parts.length ? parts.join("; ") : null
}

/** In-scope masters only: how many fail each metadata rule track (informational). */
export function PsdPsbScopedRuleSummaryCallout({
  summary,
  className,
}: {
  summary: PsdPsbScopedRuleSummary
  className?: string
}) {
  const p = summary.photographyOrCarousel
  const m = summary.moduleSubcategory
  if (p.inScopeMasterCount === 0 && m.inScopeMasterCount === 0) return null

  const pDetail = formatFailKindBreakdown(p)
  const mDetail = formatFailKindBreakdown(m)

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/25 px-3 py-2.5 text-sm dark:bg-muted/10",
        className
      )}
    >
      <p className="font-medium text-foreground text-xs">
        Scoped rule failures (informational, in-scope masters only)
      </p>
      <ul className="mt-2 list-none space-y-2.5 pl-0 text-muted-foreground text-xs leading-relaxed">
        <li>
          <span className="font-medium text-foreground">Rule 1</span>
          {" — "}
          Asset Type = Photography or Asset Sub-Category = Carousel: JPEG + PNG at{" "}
          <code className="font-mono text-[10px]">{"{base}-rendition-jpeg-1200px"}</code> /{" "}
          <code className="font-mono text-[10px]">{"{base}-rendition-png-1200px"}</code>; at least
          one must have{" "}
          <code className="font-mono text-[10px]">max(width, height) = {RENDITION_LONG_SIDE_PX}</code>
          .
          <span className="mt-0.5 block pl-0.5">
            <strong className="text-foreground">{p.failCount}</strong> fail,{" "}
            <strong className="text-foreground">{p.passCount}</strong> pass,{" "}
            <strong className="text-foreground">{p.inScopeMasterCount}</strong> in scope.
            {pDetail ? (
              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                {pDetail}
              </span>
            ) : null}
          </span>
        </li>
        <li>
          <span className="font-medium text-foreground">Rule 2</span>
          {" — "}
          Asset Sub-Category = Feature Module, Desktop, or Mobile: JPEG + PNG at{" "}
          <code className="font-mono text-[10px]">{"{base}-rendition-jpeg"}</code> /{" "}
          <code className="font-mono text-[10px]">{"{base}-rendition-png"}</code> (no long-side
          check).
          <span className="mt-0.5 block pl-0.5">
            <strong className="text-foreground">{m.failCount}</strong> fail,{" "}
            <strong className="text-foreground">{m.passCount}</strong> pass,{" "}
            <strong className="text-foreground">{m.inScopeMasterCount}</strong> in scope.
            {mDetail ? (
              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                {mDetail}
              </span>
            ) : null}
          </span>
        </li>
      </ul>
    </div>
  )
}

/** JPEG + PNG at derived IDs for all PSD/PSB — ignores metadata scope (informational). */
export function PsdPsbRenditionInventoryCallout({
  inventory,
  className,
}: {
  inventory: PsdPsbRenditionPairInventory
  className?: string
}) {
  const {
    totalPsdPsbCount,
    noBaseExternalIdCount,
    completeRenditionPairCount,
    incompleteRenditionPairCount,
  } = inventory
  if (totalPsdPsbCount === 0) return null

  const withBaseId = totalPsdPsbCount - noBaseExternalIdCount

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/25 px-3 py-2.5 text-sm dark:bg-muted/10",
        className
      )}
    >
      <p className="font-medium text-foreground text-xs">Library inventory (ignores metadata rules)</p>
      <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
        {withBaseId > 0 ? (
          <>
            <strong className="font-medium text-foreground">{incompleteRenditionPairCount}</strong>
            {" "}
            of{" "}
            <strong className="font-medium text-foreground">{withBaseId}</strong>
            {" "}
            PSD/PSB with a base external ID are missing both rendition pairs: either{" "}
            <code className="font-mono text-[10px]">{"{base}-rendition-jpeg-1200px"}</code> +{" "}
            <code className="font-mono text-[10px]">{"{base}-rendition-png-1200px"}</code>
            {" "}or{" "}
            <code className="font-mono text-[10px]">{"{base}-rendition-jpeg"}</code> +{" "}
            <code className="font-mono text-[10px]">{"{base}-rendition-png"}</code>
            .{" "}
            <strong className="font-medium text-foreground">{completeRenditionPairCount}</strong>
            {" "}
            have at least one complete pair (Rule 1 or Rule 2 IDs).
          </>
        ) : (
          <>
            No PSD/PSB in this load has a base external ID, so derived rendition IDs cannot be
            checked.
          </>
        )}
        {noBaseExternalIdCount > 0 && withBaseId > 0 ? (
          <>
            {" "}
            Additionally,{" "}
            <strong className="font-medium text-foreground">{noBaseExternalIdCount}</strong>
            {" "}
            master{noBaseExternalIdCount === 1 ? "" : "s"} ha{noBaseExternalIdCount === 1 ? "s" : "ve"} no base
            external ID.
          </>
        ) : null}
      </p>
    </div>
  )
}

function StatusIcon({
  state,
  className,
}: {
  state: "pass" | "fail" | "na"
  className?: string
}) {
  if (state === "pass") {
    return (
      <Check
        className={cn("size-4 shrink-0 text-emerald-600 dark:text-emerald-400", className)}
        aria-hidden
      />
    )
  }
  if (state === "fail") {
    return (
      <X
        className={cn("size-4 shrink-0 text-destructive", className)}
        aria-hidden
      />
    )
  }
  return (
    <Minus
      className={cn("size-4 shrink-0 text-muted-foreground", className)}
      aria-hidden
    />
  )
}

function CheckLine({
  state,
  label,
  detail,
}: {
  state: "pass" | "fail" | "na"
  label: string
  detail?: ReactNode
}) {
  return (
    <div className="flex gap-2.5 py-1.5 text-sm leading-snug">
      <span className="mt-0.5" title={state === "pass" ? "Pass" : state === "fail" ? "Fail" : "N/A"}>
        <StatusIcon state={state} />
      </span>
      <div className="min-w-0">
        <span className="text-foreground">{label}</span>
        {detail != null && detail !== "" ? (
          <div className="mt-0.5 text-muted-foreground text-xs">{detail}</div>
        ) : null}
      </div>
    </div>
  )
}

function RenditionSlotVerification({
  slotLabel,
  expectedExternalId,
  candidates,
  acceptExtensions,
  enforceLongSide = true,
}: {
  slotLabel: string
  expectedExternalId: string
  candidates: PsdPngJpgRasterInfo[]
  acceptExtensions: readonly string[]
  /** When false (Feature Module / Desktop / Mobile path), long-side is informational only. */
  enforceLongSide?: boolean
}) {
  const accept = new Set(acceptExtensions.map((e) => e.toLowerCase()))
  const hasAnyAsset = candidates.length > 0
  const matching = candidates.filter((c) => accept.has(c.extension.toLowerCase()))
  const wrongType = candidates.filter((c) => !accept.has(c.extension.toLowerCase()))

  const typeState: "pass" | "fail" | "na" = !hasAnyAsset
    ? "na"
    : matching.length > 0
      ? "pass"
      : "fail"

  const typeDetail = !hasAnyAsset
    ? "No asset uses this external ID."
    : matching.length > 0
      ? `${matching.length} file(s) with ${acceptExtensions.join(" / ")}.`
      : wrongType.length > 0
        ? `Wrong type at this ID: ${wrongType.map((w) => `.${w.extension}`).join(", ")} (need ${acceptExtensions.join(" or ")}).`
        : undefined

  const dimChecks = matching.map((c) => {
    const hasDims =
      c.width != null && c.height != null && c.longSide != null
    const longOk = c.longSide === RENDITION_LONG_SIDE_PX
    return { c, hasDims, longOk }
  })

  const anyLongSidePass = dimChecks.some((d) => d.longOk)
  const longSideState: "pass" | "fail" | "na" = !enforceLongSide
    ? "na"
    : matching.length === 0
      ? "na"
      : dimChecks.some((d) => !d.hasDims)
        ? "fail"
        : anyLongSidePass
          ? "pass"
          : "fail"

  const longSideDetail: ReactNode = !enforceLongSide
    ? matching.length === 0
      ? "Not required for this metadata profile."
      : (
          <ul className="mt-1 space-y-1 pl-0.5">
            {dimChecks.map(({ c, hasDims, longOk }) => (
              <li key={c.id} className="list-none font-mono text-[11px] leading-relaxed text-muted-foreground">
                {!hasDims ? (
                  <>No API dimensions · id {c.id}</>
                ) : (
                  <>
                    {c.width}×{c.height} → max = {c.longSide}px
                    {longOk ? ` (also meets ${RENDITION_LONG_SIDE_PX}px)` : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        )
    : matching.length === 0
      ? undefined
      : (
          <ul className="mt-1 space-y-1 pl-0.5">
            {dimChecks.map(({ c, hasDims, longOk }) => (
              <li key={c.id} className="list-none font-mono text-[11px] leading-relaxed">
                {!hasDims ? (
                  <>
                    <span className="text-destructive">Missing dims</span> · id{" "}
                    {c.id}
                  </>
                ) : (
                  <>
                    {c.width}×{c.height} → max ={" "}
                    <span
                      className={
                        longOk
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-destructive"
                      }
                    >
                      {c.longSide}px
                    </span>
                    {longOk
                      ? ` (target ${RENDITION_LONG_SIDE_PX}px)`
                      : ` (need ${RENDITION_LONG_SIDE_PX}px)`}
                  </>
                )}
              </li>
            ))}
          </ul>
        )

  return (
    <div className="flex flex-col rounded-lg border border-dashed border-border bg-muted/20 p-4 dark:bg-muted/10">
      <p className="mb-3 font-medium text-foreground text-sm">{slotLabel}</p>
      <div className="mb-2 rounded-md bg-background/80 px-2 py-1.5 dark:bg-background/40">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Expected external ID
        </p>
        <code className="break-all font-mono text-xs leading-relaxed">
          {expectedExternalId}
        </code>
      </div>

      <div className="border-border border-t pt-2">
        <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Verification
        </p>
        <CheckLine
          state={hasAnyAsset ? "pass" : "fail"}
          label="Asset present at this external ID"
          detail={hasAnyAsset ? `${candidates.length} match(es) in library.` : undefined}
        />
        <CheckLine
          state={typeState}
          label={`File type (${acceptExtensions.join(", ")})`}
          detail={typeDetail}
        />
        <CheckLine
          state={longSideState}
          label={
            enforceLongSide
              ? `Long side equals ${RENDITION_LONG_SIDE_PX}px (max of API width & height)`
              : `Long side ${RENDITION_LONG_SIDE_PX}px (not required for this profile)`
          }
          detail={longSideDetail}
        />
      </div>
    </div>
  )
}

function MasterVerificationBlock({
  row,
  items,
  frontifyWebBase,
}: {
  row: PsdPngJpgRow
  items: FrontifyLibraryAssetItem[]
  frontifyWebBase: FrontifyWebBase | null
}) {
  const jpegCandidates = row.rasters.filter((r) => r.slot === "jpeg")
  const pngCandidates = row.rasters.filter((r) => r.slot === "png")

  const baseId = row.externalId.trim()
  const hasBase = Boolean(baseId)
  const inScope = row.renditionsInScope
  const jpegExpectedId = !hasBase
    ? "—"
    : row.enforce1200LongSide
      ? expectedJpegRenditionExternalId(baseId)
      : expectedModulePsdJpegRenditionExternalId(baseId)
  const pngExpectedId = !hasBase
    ? "—"
    : row.enforce1200LongSide
      ? expectedPngRenditionExternalId(baseId)
      : expectedModulePsdPngRenditionExternalId(baseId)

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-border border-b bg-muted/30 px-4 py-4 sm:flex-row sm:items-start sm:justify-between dark:bg-muted/15">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading font-semibold text-base text-foreground leading-tight">
              {row.title}
            </h3>
            <Badge variant="outline" className="font-mono text-xs">
              .{row.psdExtension}
            </Badge>
            <span className="text-muted-foreground text-xs">master</span>
          </div>
          {hasBase ? (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Base external ID
              </p>
              <code className="break-all font-mono text-sm">{baseId}</code>
            </div>
          ) : inScope ? (
            <p className="flex items-center gap-1.5 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              No base external ID — cannot derive rendition IDs.
            </p>
          ) : null}
          {!inScope ? (
            <p className="text-muted-foreground text-sm leading-snug">{row.note}</p>
          ) : null}
        </div>
        <div className="shrink-0">
          {row.ok ? (
            <Badge
              className={
                inScope
                  ? "bg-emerald-600 px-3 py-1 text-sm hover:bg-emerald-600"
                  : "border border-border bg-muted px-3 py-1 text-sm text-foreground hover:bg-muted"
              }
            >
              {inScope ? "Rule pass" : "Renditions N/A"}
            </Badge>
          ) : (
            <Badge variant="destructive" className="px-3 py-1 text-sm">
              Rule fail
            </Badge>
          )}
        </div>
      </div>

      <div className="px-4 pb-3">
        <PsdScopeMetadataSummary
          scopePath={row.scopePath}
          scopeMetadata={row.scopeMetadata}
        />
      </div>

      <RuleCaseVisualRow
        items={items}
        frontifyWebBase={frontifyWebBase}
        slots={
          inScope
            ? [
                {
                  label: "Master",
                  hint: `PSD/PSB · .${row.psdExtension}`,
                  assetIds: [row.psdId],
                },
                {
                  label: "Rendition A — JPEG",
                  hint: `Expected at ${jpegExpectedId}`,
                  assetIds: jpegCandidates.map((c) => c.id),
                },
                {
                  label: "Rendition B — PNG",
                  hint: `Expected at ${pngExpectedId}`,
                  assetIds: pngCandidates.map((c) => c.id),
                },
              ]
            : [
                {
                  label: "Master",
                  hint: `PSD/PSB · .${row.psdExtension}`,
                  assetIds: [row.psdId],
                },
              ]
        }
      />

      {inScope && hasBase ? (
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <RenditionSlotVerification
            slotLabel="Rendition A — JPEG"
            expectedExternalId={jpegExpectedId}
            candidates={jpegCandidates}
            acceptExtensions={["jpg", "jpeg"]}
            enforceLongSide={row.enforce1200LongSide}
          />
          <RenditionSlotVerification
            slotLabel="Rendition B — PNG"
            expectedExternalId={pngExpectedId}
            candidates={pngCandidates}
            acceptExtensions={["png"]}
            enforceLongSide={row.enforce1200LongSide}
          />
        </div>
      ) : null}
    </div>
  )
}

export function PsdPngJpgRulePanel({
  rows,
  psdCount,
  passCount,
  failCount,
  inventory,
  scopedRuleSummary,
  items,
  frontifyWebBase,
}: Props) {
  const [scopeFilter, setScopeFilter] = React.useState<PsdCaseScopeFilter>("all")

  const nPhoto = countRowsByScopePath(rows, "photography_or_carousel")
  const nModule = countRowsByScopePath(rows, "module_subcategory")
  const nOut = countRowsByScopePath(rows, "out_of_scope")

  const displayRows = React.useMemo(() => {
    const sorted = sortRuleRowsFailsFirst(rows)
    if (scopeFilter === "all") return sorted
    return sorted.filter((r) => r.scopePath === scopeFilter)
  }, [rows, scopeFilter])

  const shownPass = displayRows.filter((r) => r.ok).length
  const shownFail = displayRows.filter((r) => !r.ok).length

  return (
    <Card className="overflow-hidden shadow-sm">
      <RuleSuitePanelHeader
        suiteId="PSD-REND-1200"
        title="PSD / PSB — rendition verification"
        casesLabel="Masters"
        caseCount={psdCount}
        passCount={passCount}
        failCount={failCount}
        description={
          <>
            <strong>In scope:</strong> (1) Photography or Carousel —{" "}
            <code className="font-mono text-xs">{"{base}-rendition-jpeg-1200px"}</code> and{" "}
            <code className="font-mono text-xs">{"{base}-rendition-png-1200px"}</code>; at least
            one file must have{" "}
            <code className="font-mono text-xs">
              max(width, height) = {RENDITION_LONG_SIDE_PX}
            </code>
            . (2) Feature Module, Desktop, or Mobile —{" "}
            <code className="font-mono text-xs">{"{base}-rendition-jpeg"}</code> and{" "}
            <code className="font-mono text-xs">{"{base}-rendition-png"}</code>, no long-side
            requirement. Other PSD/PSB pass as renditions not required.
          </>
        }
      />
      <CardContent className="space-y-6 pt-6">
        <PsdPsbRenditionInventoryCallout inventory={inventory} />
        <PsdPsbScopedRuleSummaryCallout summary={scopedRuleSummary} />
        {psdCount === 0 ? (
          <p className="text-muted-foreground text-sm">
            No PSD or PSB assets in this library load — nothing to verify here.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <label className="flex flex-wrap items-center gap-2 text-xs">
                <span className="shrink-0 text-muted-foreground">Show masters</span>
                <select
                  className={scopeFilterSelectClass}
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value as PsdCaseScopeFilter)}
                  aria-label="Filter PSD cases by metadata rule"
                >
                  <option value="all">All ({psdCount})</option>
                  <option value="photography_or_carousel">
                    Rule 1 — Photography or Carousel ({nPhoto})
                  </option>
                  <option value="module_subcategory">
                    Rule 2 — Feature Module / Desktop / Mobile ({nModule})
                  </option>
                  <option value="out_of_scope">Out of scope — renditions N/A ({nOut})</option>
                </select>
              </label>
              <p className="text-muted-foreground text-xs tabular-nums">
                {scopeFilter === "all" ? (
                  <>
                    List: <span className="font-medium text-foreground">{displayRows.length}</span>{" "}
                    masters (suite summary above is for the full run).
                  </>
                ) : (
                  <>
                    Showing{" "}
                    <span className="font-medium text-foreground">{displayRows.length}</span>{" "}
                    master{displayRows.length === 1 ? "" : "s"}:{" "}
                    <span className="text-emerald-700 dark:text-emerald-400">{shownPass} pass</span>
                    {" · "}
                    <span className="text-destructive">{shownFail} fail</span>
                  </>
                )}
              </p>
            </div>
            {displayRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">No masters match this filter.</p>
            ) : (
              displayRows.map((row) => (
                <MasterVerificationBlock
                  key={row.psdId}
                  row={row}
                  items={items}
                  frontifyWebBase={frontifyWebBase}
                />
              ))
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
