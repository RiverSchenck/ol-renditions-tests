"use client"

import type { ReactNode } from "react"

import {
  ArrowRight,
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock,
  Image as ImageLucide,
  ImageIcon,
  Images,
  Layers,
  MinusCircle,
  Palette,
  Table2,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { EvaluateJpegRenditionWhiteBgRulesResult } from "@/lib/rules/jpeg-rendition-white-bg"
import type { EvaluateJpgNeedsPngRulesResult } from "@/lib/rules/jpg-needs-png"
import type { EvaluatePngNeedsJpegRulesResult } from "@/lib/rules/png-needs-jpeg"
import type { EvaluatePsdPngJpgRulesResult } from "@/lib/rules/psd-png-jpg"
import type { EvaluateTifPngJpgRulesResult } from "@/lib/rules/tif-png-jpg"
import {
  LIBRARY_SUITE_KEYS,
  type LibrarySuitesSkipped,
} from "@/lib/frontify/library-run-types"

export type LibraryCheckDetailView =
  | "psd"
  | "tif"
  | "png"
  | "jpg"
  | "jpegBg"
  | "assets"

type Props = {
  itemsLength: number
  total: number
  pagesFetched: number
  psdPngJpg: EvaluatePsdPngJpgRulesResult
  tifPngJpg: EvaluateTifPngJpgRulesResult
  pngNeedsJpeg: EvaluatePngNeedsJpegRulesResult
  jpgNeedsPng: EvaluateJpgNeedsPngRulesResult
  jpegRenditionWhiteBg: EvaluateJpegRenditionWhiteBgRulesResult
  suitesSkipped: LibrarySuitesSkipped
  onOpen: (view: LibraryCheckDetailView) => void
}

type SuiteTone = "pass" | "fail" | "neutral" | "skipped"

/** What each suite counts in its status line (PSD/TIF/PNG/JPG = masters; JPEG studio = renditions). */
type SuiteCountEntity = "master" | "rendition"

/** Card chrome for overview suite tiles — green when all pass, red when any fail. */
function suiteCardClass(tone: SuiteTone): string {
  switch (tone) {
    case "pass":
      return cn(
        "border-2 border-emerald-500/55 bg-emerald-500/[0.04] ring-0",
        "shadow-[0_4px_24px_-6px_rgba(34,197,94,0.45),0_0_0_1px_rgba(34,197,94,0.12)_inset]",
        "dark:border-emerald-500/45 dark:bg-emerald-500/[0.07]",
        "dark:shadow-[0_4px_28px_-6px_rgba(52,211,153,0.35),0_0_0_1px_rgba(52,211,153,0.1)_inset]"
      )
    case "fail":
      return cn(
        "border-2 border-destructive/65 bg-destructive/[0.05] ring-0",
        "shadow-[0_4px_24px_-6px_rgba(239,68,68,0.42),0_0_0_1px_rgba(239,68,68,0.1)_inset]",
        "dark:border-destructive/55 dark:bg-destructive/[0.08]",
        "dark:shadow-[0_4px_28px_-6px_rgba(248,113,113,0.35),0_0_0_1px_rgba(248,113,113,0.08)_inset]"
      )
    default:
      return "hover:shadow-md"
  }
}

function suiteTone(
  skipped: boolean,
  itemCount: number,
  failCount: number,
  entity: SuiteCountEntity = "master"
): { tone: SuiteTone; label: string } {
  if (skipped) {
    return { tone: "skipped", label: "Not run — disabled" }
  }
  if (itemCount === 0) {
    return {
      tone: "neutral",
      label:
        entity === "rendition"
          ? "No matching renditions in load"
          : "No matching masters in load",
    }
  }
  if (failCount === 0) {
    return {
      tone: "pass",
      label:
        entity === "rendition" ? "All renditions pass" : "All masters pass",
    }
  }
  const failNoun =
    entity === "rendition"
      ? failCount === 1
        ? "rendition"
        : "renditions"
      : failCount === 1
        ? "master"
        : "masters"
  return {
    tone: "fail",
    label: `${failCount} ${failNoun} need attention`,
  }
}

function SuiteOverviewEyebrow({ id }: { id: string }) {
  return (
    <p className="mb-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
      Suite · <span className="text-foreground/80">{id}</span>
    </p>
  )
}

function RunMetric({
  label,
  children,
  foot,
}: {
  label: string
  children: ReactNode
  foot?: string
}) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <div className="font-mono text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-[1.375rem]">
        {children}
      </div>
      {foot ? (
        <p className="max-w-[14rem] text-muted-foreground text-xs leading-snug">
          {foot}
        </p>
      ) : null}
    </div>
  )
}

function SuiteStatusPill({
  tone,
  label,
}: {
  tone: SuiteTone
  label: string
}) {
  const Icon =
    tone === "pass"
      ? CheckCircle2
      : tone === "fail"
        ? XCircle
        : tone === "skipped"
          ? Ban
          : MinusCircle
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "pass" &&
          "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
        tone === "fail" && "bg-destructive/12 text-destructive",
        tone === "skipped" &&
          "bg-amber-500/15 text-amber-950 dark:text-amber-200",
        tone === "neutral" && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </div>
  )
}

export function LibraryCheckOverview({
  itemsLength,
  total,
  pagesFetched,
  psdPngJpg,
  tifPngJpg,
  pngNeedsJpeg,
  jpgNeedsPng,
  jpegRenditionWhiteBg,
  suitesSkipped,
  onOpen,
}: Props) {
  const sk = suitesSkipped
  const psdMeta = suiteTone(!!sk.psdPngJpg, psdPngJpg.psdCount, psdPngJpg.failCount)
  const tifMeta = suiteTone(!!sk.tifPngJpg, tifPngJpg.tifCount, tifPngJpg.failCount)
  const pngMeta = suiteTone(
    !!sk.pngNeedsJpeg,
    pngNeedsJpeg.pngMasterCount,
    pngNeedsJpeg.failCount
  )
  const jpgMeta = suiteTone(
    !!sk.jpgNeedsPng,
    jpgNeedsPng.jpgMasterCount,
    jpgNeedsPng.failCount
  )
  const jpegBgMeta = suiteTone(
    !!sk.jpegRenditionWhiteBg,
    jpegRenditionWhiteBg.jpegRenditionCount,
    jpegRenditionWhiteBg.failCount,
    "rendition"
  )

  const skippedSuiteCount = LIBRARY_SUITE_KEYS.filter((k) => sk[k] === true)
    .length
  const executedSuiteCount = LIBRARY_SUITE_KEYS.length - skippedSuiteCount

  let aggregatePass = 0
  let aggregateFail = 0
  if (!sk.psdPngJpg) {
    aggregatePass += psdPngJpg.passCount
    aggregateFail += psdPngJpg.failCount
  }
  if (!sk.tifPngJpg) {
    aggregatePass += tifPngJpg.passCount
    aggregateFail += tifPngJpg.failCount
  }
  if (!sk.pngNeedsJpeg) {
    aggregatePass += pngNeedsJpeg.passCount
    aggregateFail += pngNeedsJpeg.failCount
  }
  if (!sk.jpgNeedsPng) {
    aggregatePass += jpgNeedsPng.passCount
    aggregateFail += jpgNeedsPng.failCount
  }
  if (!sk.jpegRenditionWhiteBg) {
    aggregatePass += jpegRenditionWhiteBg.passCount
    aggregateFail += jpegRenditionWhiteBg.failCount
  }

  const aggregateScored = aggregatePass + aggregateFail
  const passBarPct =
    aggregateScored > 0 ? (aggregatePass / aggregateScored) * 100 : 0
  const failBarPct =
    aggregateScored > 0 ? (aggregateFail / aggregateScored) * 100 : 0

  const masterCasesInScope =
    (sk.psdPngJpg ? 0 : psdPngJpg.psdCount) +
    (sk.tifPngJpg ? 0 : tifPngJpg.tifCount) +
    (sk.pngNeedsJpeg ? 0 : pngNeedsJpeg.pngMasterCount) +
    (sk.jpgNeedsPng ? 0 : jpgNeedsPng.jpgMasterCount)

  const jpegRenditionCasesInScope = sk.jpegRenditionWhiteBg
    ? 0
    : jpegRenditionWhiteBg.jpegRenditionCount

  const ruleRowsInScope = masterCasesInScope + jpegRenditionCasesInScope

  const suitesWithFailures = [
    !sk.psdPngJpg && psdPngJpg.failCount > 0,
    !sk.tifPngJpg && tifPngJpg.failCount > 0,
    !sk.pngNeedsJpeg && pngNeedsJpeg.failCount > 0,
    !sk.jpgNeedsPng && jpgNeedsPng.failCount > 0,
    !sk.jpegRenditionWhiteBg && jpegRenditionWhiteBg.failCount > 0,
  ].filter(Boolean).length

  const loadPercentRounded =
    total > 0
      ? Math.min(100, Math.round((itemsLength / total) * 1000) / 10)
      : null

  return (
    <div className="space-y-6">
      <Card
        className="overflow-hidden shadow-sm"
        role="region"
        aria-label="Run summary aggregates"
      >
        <CardHeader className="border-border border-b bg-muted/30 pb-4 dark:bg-muted/15">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-sm ring-1 ring-border">
                <ClipboardList className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                  Summary
                </p>
                <CardTitle className="text-base font-semibold leading-tight">
                  Run summary
                </CardTitle>
                <CardDescription className="max-w-lg text-pretty text-xs leading-relaxed">
                  Fetch coverage and rolled-up rule outcomes. Pass and fail
                  totals count <strong>rows</strong> per suite; the same asset may
                  appear in more than one suite.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          <div className="grid gap-6 border-border border-b p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4 lg:gap-8">
            <RunMetric
              label="Assets loaded"
              foot={
                total > 0
                  ? `${loadPercentRounded ?? "—"}% of reported library total`
                  : itemsLength === 0
                    ? "No rows in this response"
                    : "Library total not reported by API"
              }
            >
              {itemsLength}
              <span className="font-normal text-muted-foreground"> / </span>
              {total}
            </RunMetric>
            <RunMetric
              label="API pages"
              foot={
                pagesFetched === 1
                  ? "Single GraphQL pagination pass"
                  : `${pagesFetched} sequential page requests`
              }
            >
              {pagesFetched}
            </RunMetric>
            <RunMetric
              label="Suites executed"
              foot={
                skippedSuiteCount > 0
                  ? `${skippedSuiteCount} disabled for this run`
                  : "All automated suites ran"
              }
            >
              {executedSuiteCount}
              <span className="font-normal text-muted-foreground">
                {" "}
                / {LIBRARY_SUITE_KEYS.length}
              </span>
            </RunMetric>
            <RunMetric
              label="Rule cases in scope"
              foot={`${masterCasesInScope} master rows · ${jpegRenditionCasesInScope} JPEG rendition rows`}
            >
              {ruleRowsInScope}
            </RunMetric>
          </div>

          <div className="bg-muted/20 p-4 sm:p-5 dark:bg-muted/10">
            <p className="mb-3 font-medium text-foreground text-xs">
              Check outcomes
            </p>
            {aggregateScored > 0 ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
                <dl className="flex gap-10 sm:gap-14">
                  <div>
                    <dt className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Passed
                    </dt>
                    <dd className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {aggregatePass}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Failed
                    </dt>
                    <dd
                      className={cn(
                        "mt-0.5 font-mono text-2xl font-semibold tabular-nums",
                        aggregateFail > 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      {aggregateFail}
                    </dd>
                  </div>
                  <div className="hidden sm:block">
                    <dt className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Scored rows
                    </dt>
                    <dd className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
                      {aggregateScored}
                    </dd>
                  </div>
                </dl>
                <div className="min-h-[2.5rem] flex-1 lg:max-w-md">
                  <div
                    className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${aggregatePass} passed, ${aggregateFail} failed of ${aggregateScored} scored rows`}
                  >
                    {passBarPct > 0 ? (
                      <span
                        className="bg-emerald-500 transition-[width] dark:bg-emerald-600"
                        style={{ width: `${passBarPct}%` }}
                      />
                    ) : null}
                    {failBarPct > 0 ? (
                      <span
                        className="bg-destructive"
                        style={{ width: `${failBarPct}%` }}
                      />
                    ) : null}
                  </div>
                  {aggregateFail > 0 ? (
                    <p className="mt-2 text-muted-foreground text-xs">
                      {suitesWithFailures > 0 ? (
                        <>
                          Failures span{" "}
                          <span className="font-medium text-foreground">
                            {suitesWithFailures}
                          </span>{" "}
                          suite{suitesWithFailures === 1 ? "" : "s"}. Open each
                          tab for cases.
                        </>
                      ) : (
                        <>Open the relevant suite tabs to review failing rows.</>
                      )}
                    </p>
                  ) : aggregateScored > 0 ? (
                    <p className="mt-2 text-muted-foreground text-xs">
                      All scored rows passed the enabled checks.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {executedSuiteCount === 0
                  ? "No suites ran — enable checks on the next run to produce outcomes."
                  : "No scored rows: no masters or JPEG renditions matched the enabled suites in this load."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
          Automated test suites
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card
          className={cn(
            "group flex flex-col transition-shadow",
            suiteCardClass(psdMeta.tone)
          )}
        >
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
                  <Layers className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <SuiteOverviewEyebrow id="PSD-REND-1200" />
                  <CardTitle className="text-base">PSD / PSB</CardTitle>
                  <CardDescription className="text-pretty text-xs">
                    Rendition check — 1200px long side, JPEG or PNG path.
                  </CardDescription>
                </div>
              </div>
            </div>
            <SuiteStatusPill tone={psdMeta.tone} label={psdMeta.label} />
            <div className="flex flex-wrap gap-2">
              {sk.psdPngJpg ? (
                <Badge
                  variant="outline"
                  className="border-dashed border-amber-500/40 font-mono text-xs text-amber-900 dark:text-amber-200"
                >
                  Suite off
                </Badge>
              ) : (
                <>
                  <Badge variant="outline" className="font-mono text-xs">
                    {psdPngJpg.psdCount} masters
                  </Badge>
                  {psdPngJpg.psdCount > 0 ? (
                    <>
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                      >
                        {psdPngJpg.passCount} pass
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-destructive/15 text-destructive"
                      >
                        {psdPngJpg.failCount} fail
                      </Badge>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 group-hover:bg-accent"
              onClick={() => onOpen("psd")}
            >
              View suite
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "group flex flex-col transition-shadow",
            suiteCardClass(tifMeta.tone)
          )}
        >
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                  <ImageIcon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <SuiteOverviewEyebrow id="TIF-REND-DUAL" />
                  <CardTitle className="text-base">TIF / TIFF</CardTitle>
                  <CardDescription className="text-pretty text-xs">
                    Both JPEG and PNG renditions at derived external IDs.
                  </CardDescription>
                </div>
              </div>
            </div>
            <SuiteStatusPill tone={tifMeta.tone} label={tifMeta.label} />
            <div className="flex flex-wrap gap-2">
              {sk.tifPngJpg ? (
                <Badge
                  variant="outline"
                  className="border-dashed border-amber-500/40 font-mono text-xs text-amber-900 dark:text-amber-200"
                >
                  Suite off
                </Badge>
              ) : (
                <>
                  <Badge variant="outline" className="font-mono text-xs">
                    {tifPngJpg.tifCount} masters
                  </Badge>
                  {tifPngJpg.tifCount > 0 ? (
                    <>
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                      >
                        {tifPngJpg.passCount} pass
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-destructive/15 text-destructive"
                      >
                        {tifPngJpg.failCount} fail
                      </Badge>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 group-hover:bg-accent"
              onClick={() => onOpen("tif")}
            >
              View suite
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "group flex flex-col transition-shadow",
            suiteCardClass(pngMeta.tone)
          )}
        >
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-300">
                  <Images className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <SuiteOverviewEyebrow id="PNG-MASTER-JPEG" />
                  <CardTitle className="text-base">PNG masters</CardTitle>
                  <CardDescription className="text-pretty text-xs">
                    Each master PNG needs{" "}
                    <code className="font-mono text-[10px]">{"{base}-rendition-jpeg"}</code>
                    .
                  </CardDescription>
                </div>
              </div>
            </div>
            <SuiteStatusPill tone={pngMeta.tone} label={pngMeta.label} />
            <div className="flex flex-wrap gap-2">
              {sk.pngNeedsJpeg ? (
                <Badge
                  variant="outline"
                  className="border-dashed border-amber-500/40 font-mono text-xs text-amber-900 dark:text-amber-200"
                >
                  Suite off
                </Badge>
              ) : (
                <>
                  <Badge variant="outline" className="font-mono text-xs">
                    {pngNeedsJpeg.pngMasterCount} masters
                  </Badge>
                  {pngNeedsJpeg.pngMasterCount > 0 ? (
                    <>
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                      >
                        {pngNeedsJpeg.passCount} pass
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-destructive/15 text-destructive"
                      >
                        {pngNeedsJpeg.failCount} fail
                      </Badge>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 group-hover:bg-accent"
              onClick={() => onOpen("png")}
            >
              View suite
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "group flex flex-col transition-shadow",
            suiteCardClass(jpgMeta.tone)
          )}
        >
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-800 dark:text-orange-300">
                  <ImageLucide className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <SuiteOverviewEyebrow id="JPG-MASTER-PNG" />
                  <CardTitle className="text-base">JPG masters — PNG rendition</CardTitle>
                  <CardDescription className="text-pretty text-xs">
                    Master JPEGs need a sibling PNG at{" "}
                    <code className="font-mono text-[10px]">{"{base}-rendition-png"}</code>
                    . No pixel-size rule.
                  </CardDescription>
                </div>
              </div>
            </div>
            <SuiteStatusPill tone={jpgMeta.tone} label={jpgMeta.label} />
            <div className="flex flex-wrap gap-2">
              {sk.jpgNeedsPng ? (
                <Badge
                  variant="outline"
                  className="border-dashed border-amber-500/40 font-mono text-xs text-amber-900 dark:text-amber-200"
                >
                  Suite off
                </Badge>
              ) : (
                <>
                  <Badge variant="outline" className="font-mono text-xs">
                    {jpgNeedsPng.jpgMasterCount} masters
                  </Badge>
                  {jpgNeedsPng.jpgMasterCount > 0 ? (
                    <>
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                      >
                        {jpgNeedsPng.passCount} pass
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-destructive/15 text-destructive"
                      >
                        {jpgNeedsPng.failCount} fail
                      </Badge>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 group-hover:bg-accent"
              onClick={() => onOpen("jpg")}
            >
              View suite
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "group flex flex-col transition-shadow",
            suiteCardClass(jpegBgMeta.tone)
          )}
        >
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-lime-600/10 text-lime-900 dark:text-lime-300">
                  <Palette className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <SuiteOverviewEyebrow id="JPEG-STUDIO-BG" />
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">JPEG renditions</CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 border-amber-600/55 bg-amber-500/20 px-2 py-0.5 font-semibold text-[10px] text-amber-950 uppercase tracking-wide",
                        "shadow-sm dark:border-amber-500/50 dark:bg-amber-500/25 dark:text-amber-50"
                      )}
                    >
                      <Clock className="size-3 shrink-0 opacity-90" aria-hidden />
                      Long-running
                    </Badge>
                  </div>
                  <CardDescription className="text-pretty text-xs">
                    Black studio on <strong>all</strong> edges via{" "}
                    <code className="font-mono text-[10px]">previewUrl</code>.
                    Each match downloads a full preview JPEG.
                  </CardDescription>
                </div>
              </div>
            </div>
            <SuiteStatusPill tone={jpegBgMeta.tone} label={jpegBgMeta.label} />
            <div className="flex flex-wrap gap-2">
              {sk.jpegRenditionWhiteBg ? (
                <Badge
                  variant="outline"
                  className="border-dashed border-amber-500/40 font-mono text-xs text-amber-900 dark:text-amber-200"
                >
                  Suite off
                </Badge>
              ) : (
                <>
                  <Badge variant="outline" className="font-mono text-xs">
                    {jpegRenditionWhiteBg.jpegRenditionCount} renditions
                  </Badge>
                  {jpegRenditionWhiteBg.jpegRenditionCount > 0 ? (
                    <>
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                      >
                        {jpegRenditionWhiteBg.passCount} pass
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-destructive/15 text-destructive"
                      >
                        {jpegRenditionWhiteBg.failCount} fail
                      </Badge>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 group-hover:bg-accent"
              onClick={() => onOpen("jpegBg")}
            >
              View suite
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>

      <div className="border-border border-t pt-8">
        <h2 className="mb-1 font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
          Asset inventory
        </h2>
        <p className="mb-4 max-w-prose text-muted-foreground text-xs leading-relaxed">
          Browse every row returned from this library fetch. This is reference
          data only — it does not run rendition or background checks.
        </p>
        <Card className="group flex max-w-xl flex-col transition-shadow hover:shadow-md">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300">
                <Table2 className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <SuiteOverviewEyebrow id="ASSET-INVENTORY" />
                <CardTitle className="text-base">Full asset table</CardTitle>
                <CardDescription className="text-pretty text-xs">
                  Raw GraphQL fields for export and spot-checks.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {itemsLength} / {total} rows
              </Badge>
              {pagesFetched > 1 ? (
                <Badge variant="secondary">{pagesFetched} API pages</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 group-hover:bg-accent"
              onClick={() => onOpen("assets")}
            >
              Browse assets
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
