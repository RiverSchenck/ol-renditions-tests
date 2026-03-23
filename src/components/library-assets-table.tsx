"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  FilterX,
  Search,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { previewHref, stringField } from "@/lib/frontify/asset-helpers"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"

type Props = {
  items: FrontifyLibraryAssetItem[]
}

type SortKey = "title" | "externalId" | "extension"
type SortDir = "asc" | "desc"

const filterInputClass =
  "h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

function normExt(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\./, "")
}

function sortValue(item: FrontifyLibraryAssetItem, key: SortKey): string {
  if (key === "title") return stringField(item, "title").toLowerCase()
  if (key === "externalId") {
    return stringField(item, "externalId").toLowerCase()
  }
  return normExt(stringField(item, "extension"))
}

function compareItems(
  a: FrontifyLibraryAssetItem,
  b: FrontifyLibraryAssetItem,
  key: SortKey,
  dir: SortDir
): number {
  const av = sortValue(a, key)
  const bv = sortValue(b, key)
  const primary = av.localeCompare(bv, undefined, { sensitivity: "base" })
  const ordered = dir === "asc" ? primary : -primary
  if (ordered !== 0) return ordered
  return a.id.localeCompare(b.id)
}

function uniqueExtensions(items: FrontifyLibraryAssetItem[]): string[] {
  const set = new Set<string>()
  for (const item of items) {
    const e = normExt(stringField(item, "extension"))
    if (e) set.add(e)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

function SortColumnHeader({
  label,
  columnKey,
  activeKey,
  direction,
  onRequestSort,
}: {
  label: string
  columnKey: SortKey
  activeKey: SortKey
  direction: SortDir
  onRequestSort: (key: SortKey) => void
}) {
  const active = activeKey === columnKey
  return (
    <TableHead
      className="min-w-0 whitespace-normal"
      aria-sort={
        active
          ? direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        className={cn(
          "-mx-1 -my-0.5 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-left font-medium text-foreground transition-colors",
          "hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        onClick={() => onRequestSort(columnKey)}
      >
        <span>{label}</span>
        {active ? (
          direction === "asc" ? (
            <ArrowUp className="size-3.5 shrink-0 text-primary" aria-hidden />
          ) : (
            <ArrowDown className="size-3.5 shrink-0 text-primary" aria-hidden />
          )
        ) : (
          <ChevronsUpDown
            className="size-3.5 shrink-0 text-muted-foreground/60"
            aria-hidden
          />
        )}
      </button>
    </TableHead>
  )
}

/**
 * Assets table with per-column filter row (title, external ID, extension) and sortable headers.
 */
export function LibraryAssetsTable({ items }: Props) {
  const [titleQuery, setTitleQuery] = React.useState("")
  const [externalIdQuery, setExternalIdQuery] = React.useState("")
  /** Empty string = all extensions */
  const [extensionFilter, setExtensionFilter] = React.useState("")
  const [sortKey, setSortKey] = React.useState<SortKey>("title")
  const [sortDir, setSortDir] = React.useState<SortDir>("asc")

  const extensionOptions = React.useMemo(
    () => uniqueExtensions(items),
    [items]
  )

  const handleSort = React.useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        return prevKey
      }
      setSortDir("asc")
      return key
    })
  }, [])

  const clearFilters = React.useCallback(() => {
    setTitleQuery("")
    setExternalIdQuery("")
    setExtensionFilter("")
  }, [])

  const filtered = React.useMemo(() => {
    let next = items

    const tq = titleQuery.trim().toLowerCase()
    if (tq) {
      next = next.filter((item) =>
        stringField(item, "title").toLowerCase().includes(tq)
      )
    }

    const eq = externalIdQuery.trim().toLowerCase()
    if (eq) {
      next = next.filter((item) =>
        stringField(item, "externalId").toLowerCase().includes(eq)
      )
    }

    if (extensionFilter) {
      next = next.filter(
        (item) => normExt(stringField(item, "extension")) === extensionFilter
      )
    }

    return [...next].sort((a, b) => compareItems(a, b, sortKey, sortDir))
  }, [
    items,
    titleQuery,
    externalIdQuery,
    extensionFilter,
    sortKey,
    sortDir,
  ])

  const hasActiveFilters =
    Boolean(titleQuery.trim()) ||
    Boolean(externalIdQuery.trim()) ||
    Boolean(extensionFilter)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortColumnHeader
                label="Title"
                columnKey="title"
                activeKey={sortKey}
                direction={sortDir}
                onRequestSort={handleSort}
              />
              <SortColumnHeader
                label="External ID"
                columnKey="externalId"
                activeKey={sortKey}
                direction={sortDir}
                onRequestSort={handleSort}
              />
              <SortColumnHeader
                label="Extension"
                columnKey="extension"
                activeKey={sortKey}
                direction={sortDir}
                onRequestSort={handleSort}
              />
              <TableHead className="w-[18%] whitespace-normal align-bottom">
                <span className="inline-flex px-2 py-1.5 font-medium">Preview</span>
              </TableHead>
            </TableRow>
            <TableRow className="border-b bg-muted/40 hover:bg-muted/40 dark:bg-muted/25 dark:hover:bg-muted/25">
              <TableHead className="min-w-0 align-top pb-3 pt-1">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    placeholder="Filter…"
                    value={titleQuery}
                    onChange={(e) => setTitleQuery(e.target.value)}
                    className={cn(filterInputClass, "pl-8")}
                    aria-label="Filter by title"
                  />
                </div>
              </TableHead>
              <TableHead className="min-w-0 align-top pb-3 pt-1">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    placeholder="Filter…"
                    value={externalIdQuery}
                    onChange={(e) => setExternalIdQuery(e.target.value)}
                    className={cn(filterInputClass, "pl-8 font-mono")}
                    aria-label="Filter by external ID"
                  />
                </div>
              </TableHead>
              <TableHead className="align-top pb-3 pt-1">
                <select
                  value={extensionFilter}
                  onChange={(e) => setExtensionFilter(e.target.value)}
                  className={cn(filterInputClass, "cursor-pointer font-mono")}
                  aria-label="Filter by extension"
                >
                  <option value="">All</option>
                  {extensionOptions.map((ext) => (
                    <option key={ext} value={ext}>
                      .{ext}
                    </option>
                  ))}
                </select>
              </TableHead>
              <TableHead className="align-top pb-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full gap-1 px-2 text-xs"
                  disabled={!hasActiveFilters}
                  onClick={clearFilters}
                >
                  <FilterX className="size-3.5 shrink-0" aria-hidden />
                  Clear
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {items.length === 0
                    ? "No assets in this load."
                    : "No rows match the current filters."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const href = previewHref(item)
                const ext = stringField(item, "extension")
                return (
                  <TableRow key={item.id}>
                    <TableCell className="min-w-0 align-top whitespace-normal break-words font-medium">
                      {stringField(item, "title") || "—"}
                    </TableCell>
                    <TableCell className="min-w-0 align-top whitespace-normal break-all font-mono text-xs">
                      {stringField(item, "externalId") || "—"}
                    </TableCell>
                    <TableCell className="align-top">
                      {ext ? (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {ext}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {href ? (
                        <Link
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "no-underline"
                          )}
                        >
                          Preview
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={4}
                className="py-2.5 text-center font-normal text-muted-foreground text-xs"
              >
                Showing{" "}
                <span className="font-mono text-foreground tabular-nums">
                  {filtered.length}
                </span>{" "}
                of{" "}
                <span className="font-mono text-foreground tabular-nums">
                  {items.length}
                </span>{" "}
                assets
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  )
}
