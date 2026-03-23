import type { ReactNode } from "react"
import { CheckCircle2, Layers, XCircle } from "lucide-react"

import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type RuleSuitePanelHeaderProps = {
  /** Short stable id shown in the eyebrow (e.g. `PSD-REND-1200`). */
  suiteId: string
  title: string
  description: ReactNode
  /** Label for the first metric column (e.g. Masters, Renditions). */
  casesLabel: string
  caseCount: number
  passCount: number
  failCount: number
  /** Optional controls (e.g. preview toggle) rendered above the metrics strip. */
  headerActions?: ReactNode
}

/**
 * Shared header for full-page rule suite panels — report-style layout with
 * suite id, title, spec copy, and a compact pass/fail summary strip.
 */
export function RuleSuitePanelHeader({
  suiteId,
  title,
  description,
  casesLabel,
  caseCount,
  passCount,
  failCount,
  headerActions,
}: RuleSuitePanelHeaderProps) {
  const passRatePct =
    caseCount > 0 ? Math.round((passCount / caseCount) * 100) : null

  return (
    <CardHeader className="space-y-0 border-border border-b bg-muted/25 pb-6 pt-6 dark:bg-muted/10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
            <span className="font-semibold text-foreground/80">Test suite</span>
            <span className="mx-2 font-normal text-border">·</span>
            <span className="text-foreground/90">{suiteId}</span>
          </p>
          <CardTitle className="font-heading text-balance font-semibold text-xl tracking-tight sm:text-2xl">
            {title}
          </CardTitle>
          <CardDescription className="text-pretty text-sm leading-relaxed">
            {description}
          </CardDescription>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-auto lg:min-w-[min(100%,320px)]">
          {headerActions ? (
            <div className="lg:flex lg:justify-end">{headerActions}</div>
          ) : null}
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              Execution summary
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div
                className={cn(
                  "flex gap-3 rounded-lg border border-border bg-card px-3 py-3 shadow-sm",
                  "sm:flex-col sm:gap-1 sm:py-3.5"
                )}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground sm:size-8">
                  <Layers className="size-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground leading-tight">
                    {casesLabel} evaluated
                  </p>
                  <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums leading-none text-foreground sm:text-2xl">
                    {caseCount}
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "flex gap-3 rounded-lg border bg-card px-3 py-3 shadow-sm",
                  "border-emerald-500/25 bg-emerald-500/[0.06] dark:bg-emerald-500/10",
                  "sm:flex-col sm:gap-1 sm:py-3.5"
                )}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 sm:size-8">
                  <CheckCircle2 className="size-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground leading-tight">
                    Passed
                  </p>
                  <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums leading-none text-emerald-800 dark:text-emerald-300 sm:text-2xl">
                    {passCount}
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "flex gap-3 rounded-lg border bg-card px-3 py-3 shadow-sm",
                  failCount > 0
                    ? "border-destructive/30 bg-destructive/[0.06] dark:bg-destructive/10"
                    : "border-border",
                  "sm:flex-col sm:gap-1 sm:py-3.5"
                )}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md sm:size-8",
                    failCount > 0
                      ? "bg-destructive/15 text-destructive"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <XCircle className="size-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground leading-tight">
                    Failed
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-mono text-xl font-semibold tabular-nums leading-none sm:text-2xl",
                      failCount > 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {failCount}
                  </p>
                </div>
              </div>
            </div>
            {passRatePct != null && caseCount > 0 ? (
              <p className="text-muted-foreground text-xs tabular-nums">
                Pass rate:{" "}
                <span className="font-medium text-foreground">{passRatePct}%</span>
                {failCount > 0 ? (
                  <span className="text-destructive"> — review failures below</span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </CardHeader>
  )
}
