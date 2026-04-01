"use client"

import * as React from "react"
import { ExternalLink, ImageOff } from "lucide-react"

import {
  formatModifiedAtDisplay,
  modifiedAtField,
  previewHref,
  stringField,
} from "@/lib/frontify/asset-helpers"
import {
  frontifyScreenHref,
  frontifyScreenIdFromGraphqlAssetId,
  type FrontifyWebBase,
} from "@/lib/frontify/frontify-web-base"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"
import { cn } from "@/lib/utils"

export type RuleCaseVisualSlot = {
  label: string
  /** Short line under label, e.g. file role */
  hint?: string
  /** GraphQL asset ids for this slot (0 = missing, 1 = single preview, 2+ = picker) */
  assetIds: string[]
}

type Props = {
  items: FrontifyLibraryAssetItem[]
  slots: RuleCaseVisualSlot[]
  frontifyWebBase: FrontifyWebBase | null
  className?: string
}

function itemMap(items: FrontifyLibraryAssetItem[]) {
  const m = new Map<string, FrontifyLibraryAssetItem>()
  for (const it of items) m.set(it.id, it)
  return m
}

function SlotCell({
  label,
  hint,
  assetIds,
  byId,
  frontifyWebBase,
}: {
  label: string
  hint?: string
  assetIds: string[]
  byId: Map<string, FrontifyLibraryAssetItem>
  frontifyWebBase: FrontifyWebBase | null
}) {
  const [pick, setPick] = React.useState("")

  React.useEffect(() => {
    if (assetIds.length === 0) {
      setPick("")
      return
    }
    setPick((p) => (p && assetIds.includes(p) ? p : assetIds[0]))
  }, [assetIds])

  const id = pick || assetIds[0] || ""
  const item = id ? byId.get(id) : undefined
  const modifiedRaw = item ? modifiedAtField(item) : null
  const modifiedDisplay = formatModifiedAtDisplay(modifiedRaw)
  const url = item ? previewHref(item) : null
  const href =
    frontifyWebBase && id ? frontifyScreenHref(frontifyWebBase, id) : null
  const screenId = id ? frontifyScreenIdFromGraphqlAssetId(id) : ""

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="space-y-0.5">
        <p className="font-medium text-foreground text-xs leading-tight">{label}</p>
        {hint ? (
          <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>
        ) : null}
      </div>

      {assetIds.length > 1 ? (
        <select
          aria-label={`${label} — choose asset`}
          className={cn(
            "h-8 w-full min-w-0 rounded-md border border-input bg-transparent px-2 text-xs outline-none",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
          )}
          value={id}
          onChange={(e) => setPick(e.target.value)}
        >
          {assetIds.map((aid) => {
            const it = byId.get(aid)
            const t = it ? stringField(it, "title").trim() || aid : aid
            const e = it
              ? stringField(it, "extension").replace(/^\./, "") || "—"
              : "—"
            return (
              <option key={aid} value={aid}>
                {t.length > 56 ? `${t.slice(0, 53)}…` : t} · .{e}
              </option>
            )
          })}
        </select>
      ) : null}

      <div
        className={cn(
          "flex min-h-[120px] flex-1 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/25 p-2 dark:bg-muted/15",
          assetIds.length === 0 && "min-h-[100px]"
        )}
      >
        {assetIds.length === 0 ? (
          <p className="px-2 text-center text-muted-foreground text-xs">
            No asset in this slot
          </p>
        ) : url ? (
          <img
            src={url}
            alt=""
            className="max-h-[min(200px,28vh)] w-full object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-2 text-center">
            <ImageOff className="size-8 text-muted-foreground/55" aria-hidden />
            <p className="text-muted-foreground text-[11px] leading-snug">
              No preview in API — open in Frontify
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary text-[11px] underline-offset-2 hover:underline"
          >
            <ExternalLink className="size-3 shrink-0 opacity-80" aria-hidden />
            Open in Frontify
          </a>
        ) : null}
        {id ? (
          <div className="min-w-0 max-w-full space-y-0.5 font-mono text-[10px] text-muted-foreground">
            <p className="truncate" title={id}>
              <span className="text-[9px] uppercase tracking-wide opacity-80">
                GraphQL id ·{" "}
              </span>
              {id}
            </p>
            {screenId && screenId !== id ? (
              <p className="text-foreground/90">
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  Screen id ·{" "}
                </span>
                {screenId}
              </p>
            ) : null}
            {modifiedDisplay && modifiedRaw ? (
              <p className="text-foreground/90" title={modifiedRaw}>
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  Modified ·{" "}
                </span>
                <time dateTime={modifiedRaw}>{modifiedDisplay}</time>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function RuleCaseVisualRow({
  items,
  slots,
  frontifyWebBase,
  className,
}: Props) {
  const byId = React.useMemo(() => itemMap(items), [items])

  const gridCols =
    slots.length <= 1
      ? "grid-cols-1"
      : slots.length === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-3"

  return (
    <div
      className={cn(
        "border-border border-b bg-muted/10 px-4 py-4 dark:bg-muted/5",
        className
      )}
    >
      <p className="mb-3 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Visual preview — this case
      </p>
      <div className={cn("grid grid-cols-1 gap-6", gridCols)}>
        {slots.map((slot) => (
          <SlotCell
            key={slot.label}
            label={slot.label}
            hint={slot.hint}
            assetIds={slot.assetIds}
            byId={byId}
            frontifyWebBase={frontifyWebBase}
          />
        ))}
      </div>
    </div>
  )
}
