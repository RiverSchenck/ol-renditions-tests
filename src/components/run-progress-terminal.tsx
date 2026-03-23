"use client"

import * as React from "react"

import type { RunProgressLine } from "@/lib/frontify/run-library-check"
import { cn } from "@/lib/utils"

export type TerminalLine = RunProgressLine & { id: string }

type Props = {
  lines: TerminalLine[]
  active: boolean
  className?: string
}

function lineClass(variant: RunProgressLine["variant"]): string {
  switch (variant) {
    case "command":
      return "text-sky-700 dark:text-sky-400"
    case "output":
      return "text-foreground/90"
    case "success":
      return "text-emerald-700 dark:text-emerald-400"
    case "muted":
      return "text-muted-foreground"
    case "error":
      return "text-destructive"
    default:
      return "text-foreground/90"
  }
}

function prefixFor(variant: RunProgressLine["variant"]): string {
  switch (variant) {
    case "command":
      return "$ "
    case "error":
      return "!! "
    case "success":
    case "muted":
    case "output":
    default:
      return "   "
  }
}

export function RunProgressTerminal({ lines, active, className }: Props) {
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [lines.length, active])

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/30 px-3 py-3 dark:bg-muted/15",
        className
      )}
      aria-live="polite"
      aria-busy={active}
    >
      <div
        className="max-h-[min(22rem,50vh)] min-h-[10rem] overflow-y-auto font-mono text-xs leading-relaxed sm:text-sm sm:leading-relaxed"
        tabIndex={0}
      >
        {lines.length === 0 ? (
          <p className="text-muted-foreground">Starting…</p>
        ) : null}
        <ul className="space-y-0.5">
          {lines.map((row) => (
            <li
              key={row.id}
              className={cn("whitespace-pre-wrap break-all", lineClass(row.variant))}
            >
              <span className="select-none text-muted-foreground">
                {prefixFor(row.variant)}
              </span>
              {row.text}
            </li>
          ))}
        </ul>
        {active ? (
          <p className="mt-2 text-muted-foreground text-xs">
            <span className="inline-block size-2 animate-pulse rounded-full bg-primary align-middle" />{" "}
            In progress…
          </p>
        ) : null}
        <div ref={bottomRef} className="h-px w-full shrink-0" aria-hidden />
      </div>
    </div>
  )
}
