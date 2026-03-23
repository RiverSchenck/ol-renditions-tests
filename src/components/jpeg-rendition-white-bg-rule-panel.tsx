"use client"

import type { ReactNode } from "react"
import { AlertCircle, Check, Clock, Minus, X } from "lucide-react"

import {
  JPEG_BORDER_BLACK_FRACTION_FAIL,
  JPEG_BORDER_BLACK_MAX_CHANNEL,
  JPEG_BORDER_BLACK_MAX_CHROMA_SPREAD,
} from "@/lib/image/jpeg-white-border-constants"
import type { JpegRenditionWhiteBgRow } from "@/lib/rules/jpeg-rendition-white-bg"
import { RuleCaseVisualRow } from "@/components/rule-case-visual-row"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RuleSuitePanelHeader } from "@/components/rule-suite-panel-header"
import type { FrontifyWebBase } from "@/lib/frontify/frontify-web-base"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"
import { cn, sortRuleRowsFailsFirst } from "@/lib/utils"

type Props = {
  rows: JpegRenditionWhiteBgRow[]
  jpegRenditionCount: number
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
      <X className={cn("size-4 shrink-0 text-destructive", className)} aria-hidden />
    )
  }
  return (
    <Minus className={cn("size-4 shrink-0 text-muted-foreground", className)} aria-hidden />
  )
}

function CheckLine({
  state,
  label,
  detail,
}: {
  state: "pass" | "fail" | "na"
  label: ReactNode
  detail?: ReactNode
}) {
  return (
    <div className="flex gap-2.5 py-1.5 text-sm leading-snug">
      <span
        className="mt-0.5"
        title={state === "pass" ? "Pass" : state === "fail" ? "Fail" : "N/A"}
      >
        <StatusIcon state={state} />
      </span>
      <div className="min-w-0">
        <div className="text-foreground">{label}</div>
        {detail != null && detail !== "" ? (
          <div className="mt-0.5 text-muted-foreground text-xs">{detail}</div>
        ) : null}
      </div>
    </div>
  )
}

function PixelVerificationBlock({ row }: { row: JpegRenditionWhiteBgRow }) {
  const hasUrl = Boolean(row.previewUrl.trim())
  const sampled = row.minRgb != null

  const urlState: "pass" | "fail" = hasUrl ? "pass" : "fail"
  const urlDetail = hasUrl ? undefined : "No previewUrl on this asset — cannot sample pixels."

  const sampleState: "pass" | "fail" | "na" = !hasUrl
    ? "na"
    : sampled
      ? "pass"
      : "fail"
  const sampleDetail: ReactNode =
    !hasUrl ? undefined : sampled ? undefined : row.note

  const bgState: "pass" | "fail" | "na" = !sampled
    ? "na"
    : row.ok
      ? "pass"
      : "fail"
  const bgDetail: ReactNode =
    !sampled ? undefined : (
      <>
        {row.note}
        {row.minRgb != null ? (
          <span className="mt-1 block font-mono text-[11px] leading-relaxed">
            Darkest edge sample RGB: {row.minRgb.r}, {row.minRgb.g}, {row.minRgb.b}
            {row.sampleCount != null ? (
              <span className="text-muted-foreground/90">
                {" "}
                · {row.sampleCount} border samples
              </span>
            ) : null}
            {row.blackPixelFraction != null ? (
              <span className="text-muted-foreground/90">
                {" "}
                · {(row.blackPixelFraction * 100).toFixed(1)}% black-fill pixels
              </span>
            ) : null}
          </span>
        ) : null}
      </>
    )

  return (
    <div className="border-border border-t p-4">
      <div className="flex flex-col rounded-lg border border-dashed border-border bg-muted/20 p-4 dark:bg-muted/10">
        <p className="mb-3 font-medium text-foreground text-sm">Pixel analysis</p>
        <div className="rounded-md bg-background/80 px-2 py-1.5 dark:bg-background/40">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Rendition external ID
          </p>
          <code className="break-all font-mono text-xs leading-relaxed">
            {row.externalId || "—"}
          </code>
        </div>
        <div className="border-border border-t pt-3">
          <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Verification
          </p>
          <CheckLine
            state={urlState}
            label="GraphQL previewUrl present"
            detail={urlDetail}
          />
          <CheckLine
            state={sampleState}
            label="JPEG downloaded and sampled"
            detail={sampleDetail}
          />
          <CheckLine
            state={bgState}
            label={
              <>
                Studio fill on border (fail if ≥{" "}
                <code className="font-mono text-[11px]">
                  {(JPEG_BORDER_BLACK_FRACTION_FAIL * 100).toFixed(0)}%
                </code>{" "}
                black on <strong>all four</strong> edges; max RGB ≤{" "}
                <code className="font-mono text-[11px]">{JPEG_BORDER_BLACK_MAX_CHANNEL}</code>
                , neutral Δ ≤{" "}
                <code className="font-mono text-[11px]">
                  {JPEG_BORDER_BLACK_MAX_CHROMA_SPREAD}
                </code>
                )
              </>
            }
            detail={bgDetail}
          />
        </div>
      </div>
    </div>
  )
}

function CaseBlock({
  row,
  items,
  frontifyWebBase,
}: {
  row: JpegRenditionWhiteBgRow
  items: FrontifyLibraryAssetItem[]
  frontifyWebBase: FrontifyWebBase | null
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-border border-b bg-muted/30 px-4 py-4 sm:flex-row sm:items-start sm:justify-between dark:bg-muted/15">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading font-semibold text-base text-foreground leading-tight">
              {row.title}
            </h3>
            <Badge variant="outline" className="font-mono text-xs">
              JPEG rendition
            </Badge>
          </div>
          {!row.externalId.trim() ? (
            <p className="flex items-center gap-1.5 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              No external ID on this asset.
            </p>
          ) : null}
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
            label: "JPEG rendition",
            hint: "Same preview the suite samples for edge pixels",
            assetIds: [row.id],
          },
        ]}
      />

      <PixelVerificationBlock row={row} />
    </div>
  )
}

export function JpegRenditionWhiteBgRulePanel({
  rows,
  jpegRenditionCount,
  passCount,
  failCount,
  items,
  frontifyWebBase,
}: Props) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <RuleSuitePanelHeader
        suiteId="JPEG-STUDIO-BG"
        title="JPEG renditions — studio background"
        casesLabel="Cases"
        caseCount={jpegRenditionCount}
        passCount={passCount}
        failCount={failCount}
        headerActions={
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 border-amber-600/55 bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-950 text-xs",
              "shadow-sm dark:border-amber-500/50 dark:bg-amber-500/25 dark:text-amber-50"
            )}
          >
            <Clock className="size-3.5 shrink-0 opacity-90" aria-hidden />
            Long-running — downloads every preview
          </Badge>
        }
        description={
          <>
            For every asset with a JPEG file and an external ID ending in{" "}
            <code className="font-mono text-xs">-rendition-jpeg</code> or{" "}
            <code className="font-mono text-xs">-rendition-jpeg-1200px</code>, we
            download <strong>previewUrl</strong>, sample an edge band (after
            rotate + downscale), and count pixels that look like{" "}
            <strong>true black studio fill</strong> (max RGB ≤{" "}
            <code className="font-mono text-xs">{JPEG_BORDER_BLACK_MAX_CHANNEL}</code>
            , neutral within{" "}
            <code className="font-mono text-xs">{JPEG_BORDER_BLACK_MAX_CHROMA_SPREAD}</code>
            ). We <strong>fail</strong> only if ≥{" "}
            <code className="font-mono text-xs">
              {(JPEG_BORDER_BLACK_FRACTION_FAIL * 100).toFixed(0)}%
            </code>{" "}
            of the full border matches <strong>and</strong>{" "}
            <strong>all four</strong> edge bands (top, bottom, left, right) do too
            — a black table or dark hair along one side with tile or wall on
            another side stays a pass. Each case shows the preview here and an{" "}
            <strong>Open in Frontify</strong> link like the other suites.
          </>
        }
      />
      <CardContent className="space-y-6 pt-6">
        {jpegRenditionCount === 0 ? (
          <p className="text-muted-foreground text-sm">
            No JPEG rendition assets in this load (jpg/jpeg with matching
            rendition external ID) — nothing to verify here.
          </p>
        ) : (
          sortRuleRowsFailsFirst(rows).map((row) => (
            <CaseBlock
              key={row.id}
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
