import { RuleSuitePanelHeader } from "@/components/rule-suite-panel-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RuleCaseVisualRow } from "@/components/rule-case-visual-row"
import type { FrontifyWebBase } from "@/lib/frontify/frontify-web-base"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"
import type { MasterRenditionMatchRow } from "@/lib/rules/master-rendition-metadata-targets"
import { cn, sortRuleRowsFailsFirst } from "@/lib/utils"
import { Check, X } from "lucide-react"
import type { ReactNode } from "react"

type Props = {
  rows: MasterRenditionMatchRow[]
  masterCount: number
  passCount: number
  failCount: number
  items: FrontifyLibraryAssetItem[]
  frontifyWebBase: FrontifyWebBase | null
}

function SuiteSection({
  title,
  subtitle,
  count,
  tone,
  children,
}: {
  title: string
  subtitle: string
  count: number
  tone: "fail" | "pass"
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div
        className={cn(
          "rounded-lg border-l-4 px-4 py-3",
          tone === "fail"
            ? "border-l-destructive bg-destructive/[0.04] dark:bg-destructive/10"
            : "border-l-emerald-600/70 bg-emerald-500/[0.04] dark:bg-emerald-500/10"
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-base font-semibold text-foreground tracking-tight">
            {title}
          </h2>
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-xs tabular-nums",
              tone === "fail"
                ? "border-destructive/40 text-destructive"
                : "border-emerald-600/40 text-emerald-800 dark:text-emerald-300"
            )}
          >
            {count} {count === 1 ? "case" : "cases"}
          </Badge>
        </div>
        <p className="mt-1 text-muted-foreground text-sm leading-relaxed">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function ResultMark({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 font-medium text-emerald-700 text-xs dark:text-emerald-400">
      <Check className="size-3.5 shrink-0" aria-hidden />
      Match
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-medium text-destructive text-xs">
      <X className="size-3.5 shrink-0" aria-hidden />
      Differs
    </span>
  )
}

function ValueList({ values }: { values: string[] }) {
  if (values.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <Badge key={v} variant="outline" className="font-mono text-[10px]">
          {v}
        </Badge>
      ))}
    </div>
  )
}

function CaseBlock({
  row,
  items,
  frontifyWebBase,
}: {
  row: MasterRenditionMatchRow
  items: FrontifyLibraryAssetItem[]
  frontifyWebBase: FrontifyWebBase | null
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-border border-b bg-muted/30 px-4 py-4 sm:flex-row sm:items-start sm:justify-between dark:bg-muted/15">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading font-semibold text-base text-foreground">{row.title}</h3>
            <Badge variant="outline" className="font-mono text-xs">
              .{row.masterExtension}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[10px] uppercase">
              {row.kind}
            </Badge>
          </div>
          <p className="font-mono text-xs break-all text-muted-foreground">
            {row.masterExternalId || "—"}
          </p>
          <p
            className={cn(
              "text-sm",
              row.ok ? "text-emerald-800 dark:text-emerald-300" : "text-destructive"
            )}
          >
            {row.note}
          </p>
        </div>
        <Badge
          variant={row.ok ? "secondary" : "destructive"}
          className={cn(
            "px-3 py-1 text-sm",
            row.ok &&
              "border-emerald-600/30 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
          )}
        >
          {row.ok ? "Pass" : "Fail"}
        </Badge>
      </div>

      <RuleCaseVisualRow
        items={items}
        frontifyWebBase={frontifyWebBase}
        slots={[
          { label: "Master", hint: "Source asset", assetIds: [row.masterId] },
          ...row.checks.map((c) => ({
            label: `Rendition — ${c.slot.toUpperCase()}`,
            hint: c.expectedExternalId,
            assetIds: c.renditionId ? [c.renditionId] : [],
          })),
        ]}
      />

      <div className="p-4">
        <div className="space-y-4">
          {row.checks.map((c) => (
            <section
              key={`${row.masterId}:${c.slot}`}
              className={cn(
                "overflow-hidden rounded-lg border",
                c.ok ? "border-border" : "border-destructive/35"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2 dark:bg-muted/15">
                <div className="min-w-0">
                  <p className="font-mono text-xs uppercase">
                    Rendition · {c.slot}
                  </p>
                  <p className="font-mono text-[11px] break-all text-muted-foreground">
                    {c.expectedExternalId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ResultMark ok={c.found && c.metadataEqual} />
                  <ResultMark ok={c.found && c.targetsEqual} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-border border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground dark:bg-muted/20">
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Key</th>
                      <th className="px-3 py-2 font-medium">Master</th>
                      <th className="px-3 py-2 font-medium">Rendition</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {c.metadataRows.map((m) => (
                      <tr
                        key={`m:${m.property}`}
                        className={cn(!m.equal && "bg-destructive/[0.04] dark:bg-destructive/10")}
                      >
                        <td className="px-3 py-2 text-xs text-muted-foreground">Metadata</td>
                        <td className="px-3 py-2 font-mono text-xs">{m.property}</td>
                        <td className="px-3 py-2"><ValueList values={m.masterValues} /></td>
                        <td className="px-3 py-2"><ValueList values={m.renditionValues} /></td>
                        <td className="px-3 py-2"><ResultMark ok={m.equal} /></td>
                      </tr>
                    ))}
                    {c.targetRows.map((t) => (
                      <tr
                        key={`t:${t.name}`}
                        className={cn(!t.equal && "bg-destructive/[0.04] dark:bg-destructive/10")}
                      >
                        <td className="px-3 py-2 text-xs text-muted-foreground">Target</td>
                        <td className="px-3 py-2 font-mono text-xs break-all">{t.name}</td>
                        <td className="px-3 py-2 text-xs">{t.inMaster ? "Present" : "—"}</td>
                        <td className="px-3 py-2 text-xs">{t.inRendition ? "Present" : "—"}</td>
                        <td className="px-3 py-2"><ResultMark ok={t.equal} /></td>
                      </tr>
                    ))}
                    {c.metadataRows.length === 0 && c.targetRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-3 text-xs text-muted-foreground">
                          No metadata or targets present on either side.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                {c.note}
              </p>
            </section>
          ))}
        </div>
      </div>
    </article>
  )
}

export function MasterRenditionMetadataTargetsRulePanel({
  rows,
  masterCount,
  passCount,
  failCount,
  items,
  frontifyWebBase,
}: Props) {
  const ordered = sortRuleRowsFailsFirst(rows)
  const failRows = ordered.filter((r) => !r.ok)
  const passRows = ordered.filter((r) => r.ok)

  return (
    <Card className="overflow-hidden shadow-sm">
      <RuleSuitePanelHeader
        suiteId="MASTER-REND-META-TARGETS"
        title="Masters vs renditions — metadata + targets parity"
        casesLabel="Masters"
        caseCount={masterCount}
        passCount={passCount}
        failCount={failCount}
        description={
          <>
            For supported masters (PSD/PSB, TIF/TIFF, JPG/JPEG, PNG), each expected
            rendition must exist and have exactly the same custom metadata values and
            target names as its master.
          </>
        }
      />
      <CardContent className="space-y-8 pt-6">
        {masterCount === 0 ? (
          <p className="text-muted-foreground text-sm">
            No supported masters found in this load.
          </p>
        ) : (
          <>
            {failRows.length > 0 ? (
              <SuiteSection
                title="Non-conformities"
                subtitle="Rendition missing or metadata/targets differ from master."
                count={failRows.length}
                tone="fail"
              >
                <div className="space-y-6">
                  {failRows.map((row) => (
                    <CaseBlock
                      key={row.masterId}
                      row={row}
                      items={items}
                      frontifyWebBase={frontifyWebBase}
                    />
                  ))}
                </div>
              </SuiteSection>
            ) : null}
            {passRows.length > 0 ? (
              <SuiteSection
                title="Conformities"
                subtitle="All expected renditions match master metadata and targets."
                count={passRows.length}
                tone="pass"
              >
                <div className="space-y-6">
                  {passRows.map((row) => (
                    <CaseBlock
                      key={row.masterId}
                      row={row}
                      items={items}
                      frontifyWebBase={frontifyWebBase}
                    />
                  ))}
                </div>
              </SuiteSection>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
