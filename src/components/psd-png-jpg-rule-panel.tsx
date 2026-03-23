import {
  expectedJpegRenditionExternalId,
  expectedPngRenditionExternalId,
  RENDITION_LONG_SIDE_PX,
  type PsdPngJpgRasterInfo,
  type PsdPngJpgRow,
} from "@/lib/rules/psd-png-jpg"
import { RuleCaseVisualRow } from "@/components/rule-case-visual-row"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RuleSuitePanelHeader } from "@/components/rule-suite-panel-header"
import type { FrontifyWebBase } from "@/lib/frontify/frontify-web-base"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"
import { cn, sortRuleRowsFailsFirst } from "@/lib/utils"
import type { ReactNode } from "react"
import { AlertCircle, Check, Minus, X } from "lucide-react"

type Props = {
  rows: PsdPngJpgRow[]
  psdCount: number
  passCount: number
  failCount: number
  items: FrontifyLibraryAssetItem[]
  frontifyWebBase: FrontifyWebBase | null
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
}: {
  slotLabel: string
  expectedExternalId: string
  candidates: PsdPngJpgRasterInfo[]
  acceptExtensions: readonly string[]
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
  const longSideState: "pass" | "fail" | "na" =
    matching.length === 0
      ? "na"
      : dimChecks.some((d) => !d.hasDims)
        ? "fail"
        : anyLongSidePass
          ? "pass"
          : "fail"

  const longSideDetail: ReactNode =
    matching.length === 0 ? undefined : (
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
          label={`Long side equals ${RENDITION_LONG_SIDE_PX}px (max of API width & height)`}
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

  const hasBase = Boolean(row.externalId.trim())

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
              <code className="break-all font-mono text-sm">{row.externalId}</code>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              No base external ID — cannot derive rendition IDs.
            </p>
          )}
        </div>
        <div className="shrink-0">
          {row.ok ? (
            <Badge className="bg-emerald-600 px-3 py-1 text-sm hover:bg-emerald-600">
              Rule pass
            </Badge>
          ) : (
            <Badge variant="destructive" className="px-3 py-1 text-sm">
              Rule fail
            </Badge>
          )}
        </div>
      </div>

      <RuleCaseVisualRow
        items={items}
        frontifyWebBase={frontifyWebBase}
        slots={[
          {
            label: "Master",
            hint: `PSD/PSB · .${row.psdExtension}`,
            assetIds: [row.psdId],
          },
          {
            label: "Rendition A — JPEG",
            hint: "Expected at {base}-rendition-jpeg-1200px",
            assetIds: jpegCandidates.map((c) => c.id),
          },
          {
            label: "Rendition B — PNG",
            hint: "Expected at {base}-rendition-png-1200px",
            assetIds: pngCandidates.map((c) => c.id),
          },
        ]}
      />

      {hasBase ? (
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <RenditionSlotVerification
            slotLabel="Rendition A — JPEG"
            expectedExternalId={expectedJpegRenditionExternalId(row.externalId)}
            candidates={jpegCandidates}
            acceptExtensions={["jpg", "jpeg"]}
          />
          <RenditionSlotVerification
            slotLabel="Rendition B — PNG"
            expectedExternalId={expectedPngRenditionExternalId(row.externalId)}
            candidates={pngCandidates}
            acceptExtensions={["png"]}
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
  items,
  frontifyWebBase,
}: Props) {
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
            Each <strong>master</strong> (PSD/PSB) is listed with its two expected
            renditions. Under each slot we verify presence, file type, and that{" "}
            <code className="font-mono text-xs">
              max(width, height) = {RENDITION_LONG_SIDE_PX}
            </code>{" "}
            from the API. The suite passes a master if either JPEG or PNG satisfies
            all checks.
          </>
        }
      />
      <CardContent className="space-y-6 pt-6">
        {psdCount === 0 ? (
          <p className="text-muted-foreground text-sm">
            No PSD or PSB assets in this library load — nothing to verify here.
          </p>
        ) : (
          sortRuleRowsFailsFirst(rows).map((row) => (
            <MasterVerificationBlock
              key={row.psdId}
              row={row}
              items={items}
              frontifyWebBase={frontifyWebBase}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
