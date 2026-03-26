"use client"

import * as React from "react"
import {
  Ban,
  ChevronDown,
  Clock,
  GitCompare,
  Globe,
  Image as ImageLucide,
  ImageIcon,
  Images,
  LayoutDashboard,
  Layers,
  Loader2,
  Palette,
  Play,
  SlidersHorizontal,
  Table2,
} from "lucide-react"

import { ErrorPanel } from "@/components/error-panel"
import {
  LibraryCheckOverview,
  type LibraryCheckDetailView,
} from "@/components/library-check-overview"
import { LibraryAssetsTable } from "@/components/library-assets-table"
import { CountryMetadataTargetsRulePanel } from "@/components/country-metadata-targets-rule-panel"
import { JpegRenditionWhiteBgRulePanel } from "@/components/jpeg-rendition-white-bg-rule-panel"
import { JpgNeedsPngRulePanel } from "@/components/jpg-needs-png-rule-panel"
import { MasterRenditionMetadataTargetsRulePanel } from "@/components/master-rendition-metadata-targets-rule-panel"
import { PngNeedsJpegRulePanel } from "@/components/png-needs-jpeg-rule-panel"
import { PsdPngJpgRulePanel } from "@/components/psd-png-jpg-rule-panel"
import { TifPngJpgRulePanel } from "@/components/tif-png-jpg-rule-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { RunProgressLine } from "@/lib/frontify/run-library-check"
import type {
  LibraryRunResponseBody,
  LibrarySuitesSkipped,
  LibrarySuiteKey,
} from "@/lib/frontify/library-run-types"
import {
  RunProgressTerminal,
  type TerminalLine,
} from "@/components/run-progress-terminal"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

type Phase =
  | { status: "idle" }
  | { status: "loading"; lines: TerminalLine[] }
  | { status: "error"; summary: string; detail: string }
  | { status: "success"; data: Extract<LibraryRunResponseBody, { ok: true }> }

type ResultView = "overview" | LibraryCheckDetailView

const ALL_CHECKS_ON: Record<LibrarySuiteKey, boolean> = {
  psdPngJpg: true,
  tifPngJpg: true,
  pngNeedsJpeg: true,
  jpgNeedsPng: true,
  countryMetadataTargets: true,
  masterRenditionMetadataTargets: true,
  jpegRenditionWhiteBg: true,
}

const SUITE_TOGGLE_ROWS: {
  key: LibrarySuiteKey
  title: string
  hint: string
  /** Prominent badge for suites that materially extend run time */
  slowRunBadge?: string
}[] = [
  {
    key: "psdPngJpg",
    title: "PSD / PSB — 1200px JPEG or PNG rendition",
    hint: "Local GraphQL row scan only.",
  },
  {
    key: "tifPngJpg",
    title: "TIF / TIFF — dual JPEG + PNG renditions",
    hint: "Local GraphQL row scan only.",
  },
  {
    key: "pngNeedsJpeg",
    title: "PNG masters → JPEG rendition ID",
    hint: "Local GraphQL row scan only.",
  },
  {
    key: "jpgNeedsPng",
    title: "JPG masters → PNG rendition ID",
    hint: "Local GraphQL row scan only.",
  },
  {
    key: "countryMetadataTargets",
    title: "Country metadata → matching targets",
    hint: "Local GraphQL row scan only. Requires Country custom metadata and targets named `Country | {text}`.",
  },
  {
    key: "masterRenditionMetadataTargets",
    title: "Master/rendition metadata + targets parity",
    hint: "Local GraphQL row scan only. Fails if rendition metadata or targets differ from master.",
  },
  {
    key: "jpegRenditionWhiteBg",
    title: "JPEG previews — studio white-border sampling",
    hint: "Downloads and decodes each preview URL before border sampling. The full run stays busy until every rendition finishes.",
    slowRunBadge: "Long-running",
  },
]

const TAB_SUITE_KEY: Partial<Record<LibraryCheckDetailView, LibrarySuiteKey>> = {
  psd: "psdPngJpg",
  tif: "tifPngJpg",
  png: "pngNeedsJpeg",
  jpg: "jpgNeedsPng",
  country: "countryMetadataTargets",
  masterParity: "masterRenditionMetadataTargets",
  jpegBg: "jpegRenditionWhiteBg",
}

function SkippedSuitePanel({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className="overflow-hidden border-dashed border-amber-500/35 bg-amber-500/[0.04] shadow-none dark:bg-amber-500/[0.06]">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200">
            <Ban className="size-5" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-pretty text-sm">
              {description}
            </CardDescription>
          </div>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Re-run with this suite enabled in <strong>Run check</strong> to populate
          results. Asset inventory is unchanged.
        </p>
      </CardHeader>
    </Card>
  )
}

const VIEW_TABS: {
  id: ResultView
  label: string
  shortLabel: string
  narrowLabel: string
  icon: typeof LayoutDashboard
}[] = [
  {
    id: "overview",
    label: "Testing overview",
    shortLabel: "Overview",
    narrowLabel: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "psd",
    label: "PSD / PSB test",
    shortLabel: "PSD / PSB",
    narrowLabel: "PSD",
    icon: Layers,
  },
  {
    id: "tif",
    label: "TIF / TIFF test",
    shortLabel: "TIF / TIFF",
    narrowLabel: "TIF",
    icon: ImageIcon,
  },
  {
    id: "png",
    label: "PNG masters — JPEG rendition",
    shortLabel: "PNG + JPEG",
    narrowLabel: "PNG",
    icon: Images,
  },
  {
    id: "jpg",
    label: "JPG masters — PNG rendition",
    shortLabel: "JPG + PNG",
    narrowLabel: "JPG",
    icon: ImageLucide,
  },
  {
    id: "country",
    label: "Country metadata — matching targets",
    shortLabel: "Country",
    narrowLabel: "CC",
    icon: Globe,
  },
  {
    id: "masterParity",
    label: "Master/rendition metadata + targets parity",
    shortLabel: "Master parity",
    narrowLabel: "Parity",
    icon: GitCompare,
  },
  {
    id: "jpegBg",
    label:
      "JPEG renditions — studio background (slow: downloads + decodes each preview)",
    shortLabel: "JPEG studio BG",
    narrowLabel: "JBG",
    icon: Palette,
  },
  {
    id: "assets",
    label: "Asset inventory table",
    shortLabel: "Assets",
    narrowLabel: "Data",
    icon: Table2,
  },
]

const TEST_SUITE_TABS = VIEW_TABS.filter((t) => t.id !== "assets")
const ASSETS_TAB = VIEW_TABS.find((t) => t.id === "assets")!

function ResultsTabBar({
  active,
  onChange,
  suitesSkipped,
  psdFailCount,
  tifFailCount,
  pngFailCount,
  jpgFailCount,
  countryFailCount,
  masterParityFailCount,
  jpegBgFailCount,
}: {
  active: ResultView
  onChange: (v: ResultView) => void
  suitesSkipped: LibrarySuitesSkipped
  psdFailCount: number
  tifFailCount: number
  pngFailCount: number
  jpgFailCount: number
  countryFailCount: number
  masterParityFailCount: number
  jpegBgFailCount: number
}) {
  function renderTabButton(
    id: ResultView,
    label: string,
    shortLabel: string,
    narrowLabel: string,
    Icon: (typeof VIEW_TABS)[number]["icon"]
  ) {
    const isActive = active === id
    const suiteKey = TAB_SUITE_KEY[id as LibraryCheckDetailView]
    const skipped = suiteKey ? suitesSkipped[suiteKey] === true : false
    const failDot =
      !skipped &&
      ((id === "psd" && psdFailCount > 0) ||
        (id === "tif" && tifFailCount > 0) ||
        (id === "png" && pngFailCount > 0) ||
        (id === "jpg" && jpgFailCount > 0) ||
        (id === "country" && countryFailCount > 0) ||
        (id === "masterParity" && masterParityFailCount > 0) ||
        (id === "jpegBg" && jpegBgFailCount > 0))
    return (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={isActive}
        aria-controls={`check-panel-${id}`}
        id={`check-tab-${id}`}
        title={label}
        onClick={() => onChange(id)}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          skipped && !isActive && "opacity-70"
        )}
      >
        <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
        <span className="inline sm:hidden">{narrowLabel}</span>
        <span className="hidden sm:inline">{shortLabel}</span>
        {skipped ? (
          <Ban
            className="size-3 shrink-0 text-amber-600 dark:text-amber-400"
            aria-label="Skipped on last run"
          />
        ) : null}
        {failDot ? (
          <span
            className="size-2 shrink-0 rounded-full bg-destructive"
            aria-label="Has failures"
          />
        ) : null}
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-0.5 px-0.5 sm:flex-row sm:items-end sm:justify-between">
        <p className="font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
          Results
        </p>
        <p className="text-muted-foreground text-xs">
          Tests and overview on the left; inventory is separate. Red dot = suite
          failures.
        </p>
      </div>
      <div
        className="rounded-xl border border-border bg-background/90 p-2 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/75 sm:p-1.5"
        role="tablist"
        aria-label="Test results and asset inventory"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="px-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
              Automated tests
            </p>
            <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TEST_SUITE_TABS.map(({ id, label, shortLabel, narrowLabel, icon }) =>
                renderTabButton(id, label, shortLabel, narrowLabel, icon)
              )}
            </div>
          </div>

          <div
            className="h-px w-full shrink-0 bg-border sm:hidden"
            aria-hidden
          />
          <div
            className="hidden w-px shrink-0 self-stretch bg-border sm:block"
            role="separator"
            aria-orientation="vertical"
            aria-hidden
          />

          <div className="shrink-0 space-y-1.5 sm:pr-0.5">
            <p className="px-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
              Library data
            </p>
            <div className="flex gap-1">
              {renderTabButton(
                ASSETS_TAB.id,
                ASSETS_TAB.label,
                ASSETS_TAB.shortLabel,
                ASSETS_TAB.narrowLabel,
                ASSETS_TAB.icon
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LibraryCheckWorkspace() {
  const [phase, setPhase] = React.useState<Phase>({ status: "idle" })
  const [resultView, setResultView] = React.useState<ResultView>("overview")
  const [checkEnabled, setCheckEnabled] =
    React.useState<Record<LibrarySuiteKey, boolean>>(ALL_CHECKS_ON)
  const [runConfigOpen, setRunConfigOpen] = React.useState(true)
  const enabledSuiteCount = React.useMemo(
    () => Object.values(checkEnabled).filter(Boolean).length,
    [checkEnabled]
  )

  function setCheck(key: LibrarySuiteKey, value: boolean) {
    setCheckEnabled((prev) => ({ ...prev, [key]: value }))
  }

  function setAllChecks(value: boolean) {
    setCheckEnabled({
      psdPngJpg: value,
      tifPngJpg: value,
      pngNeedsJpeg: value,
      jpgNeedsPng: value,
      countryMetadataTargets: value,
      masterRenditionMetadataTargets: value,
      jpegRenditionWhiteBg: value,
    })
  }

  async function runCheck() {
    setRunConfigOpen(false)
    setPhase({ status: "loading", lines: [] })
    let lineCounter = 0

    const pushLines = (raw: RunProgressLine[]) => {
      if (raw.length === 0) return
      const next: TerminalLine[] = raw.map((line) => ({
        ...line,
        id: `ln-${++lineCounter}`,
      }))
      setPhase((p) =>
        p.status === "loading"
          ? { status: "loading", lines: [...p.lines, ...next] }
          : p
      )
    }

    try {
      const res = await fetch("/api/frontify/library/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checks: checkEnabled }),
      })

      if (!res.ok) {
        const detail = await res.text()
        setPhase({
          status: "error",
          summary: `HTTP ${res.status}`,
          detail: detail || res.statusText,
        })
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setPhase({
          status: "error",
          summary: "No response body",
          detail: "The server closed the stream before any data arrived.",
        })
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let finalBody: LibraryRunResponseBody | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n")
        buffer = parts.pop() ?? ""
        for (const part of parts) {
          const trimmed = part.trim()
          if (!trimmed) continue
          let msg: unknown
          try {
            msg = JSON.parse(trimmed)
          } catch {
            continue
          }
          if (typeof msg !== "object" || msg === null) continue
          const row = msg as {
            type?: string
            line?: RunProgressLine
            body?: LibraryRunResponseBody
          }
          if (row.type === "line" && row.line) {
            pushLines([row.line])
          } else if (row.type === "result" && row.body !== undefined) {
            finalBody = row.body
          }
        }
      }

      const tail = buffer.trim()
      if (tail) {
        let msg: unknown
        try {
          msg = JSON.parse(tail)
        } catch {
          /* ignore incomplete JSON */
        }
        if (typeof msg === "object" && msg !== null) {
          const row = msg as {
            type?: string
            line?: RunProgressLine
            body?: LibraryRunResponseBody
          }
          if (row.type === "line" && row.line) {
            pushLines([row.line])
          } else if (row.type === "result" && row.body !== undefined) {
            finalBody = row.body
          }
        }
      }

      if (finalBody == null) {
        setPhase({
          status: "error",
          summary: "Stream ended without a result",
          detail:
            "The connection closed before the final JSON payload. Try again or check server logs.",
        })
        return
      }

      const outcome: LibraryRunResponseBody = finalBody
      if (!outcome.ok) {
        setPhase({
          status: "error",
          summary: outcome.errorSummary,
          detail: outcome.errorDetail,
        })
        return
      }

      setResultView("overview")
      setPhase({ status: "success", data: outcome })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed"
      setPhase({
        status: "error",
        summary: message,
        detail: JSON.stringify(
          e instanceof Error
            ? { name: e.name, message: e.message, stack: e.stack }
            : { thrown: String(e) },
          null,
          2
        ),
      })
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Run check</CardTitle>
              <CardDescription>
                Load assets from Frontify and evaluate selected suites. Adjust suite
                toggles below, then execute.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="lg"
              disabled={phase.status === "loading"}
              onClick={runCheck}
              className="shrink-0 gap-2"
            >
              {phase.status === "loading" ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading…
                </>
              ) : (
                <>
                  <Play className="size-4" aria-hidden />
                  {phase.status === "success" ? "Run again" : "Run check"}
                </>
              )}
            </Button>
          </div>

          <Collapsible open={runConfigOpen} onOpenChange={setRunConfigOpen}>
            <div className="overflow-hidden rounded-xl border border-border bg-muted/15 dark:bg-muted/10">
              <CollapsibleTrigger
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
                  "hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                <SlidersHorizontal
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">
                    Run configuration
                  </p>
                  {!runConfigOpen ? (
                    <p className="mt-1 truncate text-muted-foreground text-xs">
                      {enabledSuiteCount}/7 suites enabled
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground text-xs">
                      Suite toggles — collapses after you run.
                    </p>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    runConfigOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-border border-t">
                <div className="p-4 pt-5">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground text-sm">
                        Suites to execute
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setAllChecks(true)}
                        >
                          All on
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setAllChecks(false)}
                        >
                          All off
                        </Button>
                      </div>
                    </div>
                    <ul className="grid gap-2">
                      {SUITE_TOGGLE_ROWS.map(
                        ({ key, title, hint, slowRunBadge }) => (
                        <li key={key}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-lg border border-border/90 bg-background/80 p-3 shadow-sm transition-colors",
                              "hover:border-border hover:bg-muted/25",
                              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checkEnabled[key]}
                              onChange={() => setCheck(key, !checkEnabled[key])}
                              className="mt-1 size-4 shrink-0 rounded border-input accent-primary"
                              aria-describedby={`suite-hint-${key}`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground text-sm leading-snug">
                                  {title}
                                </span>
                                {slowRunBadge ? (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "gap-1 border-amber-600/55 bg-amber-500/20 px-2 py-0.5 font-semibold text-[10px] text-amber-950 uppercase tracking-wide",
                                      "shadow-sm dark:border-amber-500/50 dark:bg-amber-500/25 dark:text-amber-50"
                                    )}
                                  >
                                    <Clock
                                      className="size-3 shrink-0 opacity-90"
                                      aria-hidden
                                    />
                                    {slowRunBadge}
                                  </Badge>
                                ) : null}
                              </span>
                              <span
                                id={`suite-hint-${key}`}
                                className="mt-0.5 block text-muted-foreground text-xs"
                              >
                                {hint}
                              </span>
                            </span>
                          </label>
                        </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </CardHeader>
        {phase.status === "loading" ? (
          <CardContent className="border-t border-border pt-6">
            <p className="mb-3 text-sm text-muted-foreground">
              Live server log — GraphQL pagination and JPEG downloads stream here
              as they run.
            </p>
            <RunProgressTerminal lines={phase.lines} active />
          </CardContent>
        ) : null}
      </Card>

      {phase.status === "error" ? (
        <Card>
          <CardHeader>
            <CardTitle>Request failed</CardTitle>
            <CardDescription>
              Frontify returned an error. Full payload is below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorPanel summary={phase.summary} detail={phase.detail} />
          </CardContent>
        </Card>
      ) : null}

      {phase.status === "success" ? (
        <div className="space-y-4">
          <ResultsTabBar
            active={resultView}
            onChange={setResultView}
            suitesSkipped={phase.data.suitesSkipped}
            psdFailCount={phase.data.psdPngJpg.failCount}
            tifFailCount={phase.data.tifPngJpg.failCount}
            pngFailCount={phase.data.pngNeedsJpeg.failCount}
            jpgFailCount={phase.data.jpgNeedsPng.failCount}
            countryFailCount={phase.data.countryMetadataTargets.failCount}
            masterParityFailCount={phase.data.masterRenditionMetadataTargets.failCount}
            jpegBgFailCount={phase.data.jpegRenditionWhiteBg.failCount}
          />

          <div
            role="tabpanel"
            id={`check-panel-${resultView}`}
            aria-labelledby={`check-tab-${resultView}`}
            className="min-h-[12rem]"
          >
            {resultView === "overview" ? (
              <Card className="overflow-hidden shadow-sm">
                <CardHeader className="border-border border-b bg-muted/25 pb-5 pt-6 dark:bg-muted/10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                        <span className="font-semibold text-foreground/80">Test run</span>
                        <span className="mx-2 font-normal text-border">·</span>
                        <span className="text-foreground/90">Summary</span>
                      </p>
                      <CardTitle className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                        Results overview
                      </CardTitle>
                      <CardDescription className="text-pretty text-sm leading-relaxed">
                        Run summary, then automated test suites, then asset inventory
                        (raw rows — not part of rule checks).
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="h-fit w-fit shrink-0 font-mono text-xs"
                    >
                      Library {phase.data.libraryId}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <LibraryCheckOverview
                    itemsLength={phase.data.items.length}
                    total={phase.data.total}
                    pagesFetched={phase.data.pagesFetched}
                    psdPngJpg={phase.data.psdPngJpg}
                    tifPngJpg={phase.data.tifPngJpg}
                    pngNeedsJpeg={phase.data.pngNeedsJpeg}
                    jpgNeedsPng={phase.data.jpgNeedsPng}
                    countryMetadataTargets={phase.data.countryMetadataTargets}
                    masterRenditionMetadataTargets={phase.data.masterRenditionMetadataTargets}
                    jpegRenditionWhiteBg={phase.data.jpegRenditionWhiteBg}
                    suitesSkipped={phase.data.suitesSkipped}
                    onOpen={(view) => setResultView(view)}
                  />
                </CardContent>
              </Card>
            ) : null}

            {resultView === "psd" ? (
              phase.data.suitesSkipped.psdPngJpg ? (
                <SkippedSuitePanel
                  title="PSD / PSB suite skipped"
                  description="This run did not evaluate PSD or PSB masters against 1200px JPEG/PNG renditions."
                />
              ) : (
                <PsdPngJpgRulePanel
                  {...phase.data.psdPngJpg}
                  items={phase.data.items}
                  frontifyWebBase={phase.data.frontifyWebBase}
                />
              )
            ) : null}

            {resultView === "tif" ? (
              phase.data.suitesSkipped.tifPngJpg ? (
                <SkippedSuitePanel
                  title="TIF / TIFF suite skipped"
                  description="This run did not evaluate TIF masters for dual JPEG and PNG renditions."
                />
              ) : (
                <TifPngJpgRulePanel
                  {...phase.data.tifPngJpg}
                  items={phase.data.items}
                  frontifyWebBase={phase.data.frontifyWebBase}
                />
              )
            ) : null}

            {resultView === "png" ? (
              phase.data.suitesSkipped.pngNeedsJpeg ? (
                <SkippedSuitePanel
                  title="PNG → JPEG suite skipped"
                  description="This run did not check PNG masters for matching JPEG rendition external IDs."
                />
              ) : (
                <PngNeedsJpegRulePanel
                  {...phase.data.pngNeedsJpeg}
                  items={phase.data.items}
                  frontifyWebBase={phase.data.frontifyWebBase}
                />
              )
            ) : null}

            {resultView === "jpg" ? (
              phase.data.suitesSkipped.jpgNeedsPng ? (
                <SkippedSuitePanel
                  title="JPG → PNG suite skipped"
                  description="This run did not check JPEG masters for matching PNG rendition external IDs."
                />
              ) : (
                <JpgNeedsPngRulePanel
                  {...phase.data.jpgNeedsPng}
                  items={phase.data.items}
                  frontifyWebBase={phase.data.frontifyWebBase}
                />
              )
            ) : null}

            {resultView === "country" ? (
              phase.data.suitesSkipped.countryMetadataTargets ? (
                <SkippedSuitePanel
                  title="Country metadata / targets suite skipped"
                  description="This run did not check Country custom metadata against Frontify target names."
                />
              ) : (
                <CountryMetadataTargetsRulePanel
                  {...phase.data.countryMetadataTargets}
                  items={phase.data.items}
                  frontifyWebBase={phase.data.frontifyWebBase}
                />
              )
            ) : null}

            {resultView === "masterParity" ? (
              phase.data.suitesSkipped.masterRenditionMetadataTargets ? (
                <SkippedSuitePanel
                  title="Master/rendition metadata + targets parity suite skipped"
                  description="This run did not compare master metadata/targets against expected renditions."
                />
              ) : (
                <MasterRenditionMetadataTargetsRulePanel
                  {...phase.data.masterRenditionMetadataTargets}
                  items={phase.data.items}
                  frontifyWebBase={phase.data.frontifyWebBase}
                />
              )
            ) : null}

            {resultView === "jpegBg" ? (
              phase.data.suitesSkipped.jpegRenditionWhiteBg ? (
                <SkippedSuitePanel
                  title="JPEG preview / studio background suite skipped"
                  description="This run did not download preview JPEGs or sample borders for studio white detection."
                />
              ) : (
                <JpegRenditionWhiteBgRulePanel
                  {...phase.data.jpegRenditionWhiteBg}
                  items={phase.data.items}
                  frontifyWebBase={phase.data.frontifyWebBase}
                />
              )
            ) : null}

            {resultView === "assets" ? (
              <Card className="overflow-hidden shadow-sm">
                <CardHeader className="border-border border-b bg-muted/25 pb-6 pt-6 dark:bg-muted/10">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                        <span className="font-semibold text-foreground/80">Test run</span>
                        <span className="mx-2 font-normal text-border">·</span>
                        <span className="text-foreground/90">ASSET-INVENTORY</span>
                      </p>
                      <CardTitle className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                        Asset inventory
                      </CardTitle>
                      <CardDescription className="max-w-prose text-pretty text-sm leading-relaxed">
                        Full GraphQL payload fields per row for manual verification and
                        export workflows.
                      </CardDescription>
                    </div>
                    <dl className="grid shrink-0 grid-cols-2 gap-0 overflow-hidden rounded-lg border border-border bg-card text-center shadow-sm sm:grid-cols-2">
                      <div className="border-border border-r px-4 py-3">
                        <dt className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Loaded
                        </dt>
                        <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">
                          {phase.data.items.length}
                        </dd>
                      </div>
                      <div className="px-4 py-3">
                        <dt className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Total
                        </dt>
                        <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">
                          {phase.data.total}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  {phase.data.pagesFetched > 1 ? (
                    <p className="mt-3 text-muted-foreground text-xs">
                      Fetched across{" "}
                      <span className="font-mono text-foreground">
                        {phase.data.pagesFetched}
                      </span>{" "}
                      API pages.
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="px-0 pt-0">
                  <div className="overflow-x-auto px-4 pb-4 pt-4 sm:px-6">
                    <LibraryAssetsTable items={phase.data.items} />
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
