import { RuleSuitePanelHeader } from "@/components/rule-suite-panel-header"
import type {
  CountryMetadataTargetsRow,
} from "@/lib/rules/country-metadata-targets"
import {
  COUNTRY_TARGET_NAME_PREFIX,
  expectedCountryTargetName,
} from "@/lib/rules/country-metadata-targets"
import { RuleCaseVisualRow } from "@/components/rule-case-visual-row"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { previewHref, stringField } from "@/lib/frontify/asset-helpers"
import type { FrontifyWebBase } from "@/lib/frontify/frontify-web-base"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"
import { cn, sortRuleRowsFailsFirst } from "@/lib/utils"
import { AlertCircle, Check, Minus, X } from "lucide-react"
import type { ReactNode } from "react"

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
  label: string
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
        <span className="text-foreground">{label}</span>
        {detail != null && detail !== "" ? (
          <div className="mt-0.5 text-muted-foreground text-xs">{detail}</div>
        ) : null}
      </div>
    </div>
  )
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
  const sid = tone === "fail" ? "country-fail" : "country-pass"
  return (
    <section className="space-y-4" aria-labelledby={`country-section-${sid}`}>
      <div
        className={cn(
          "rounded-lg border-l-4 px-4 py-3",
          tone === "fail"
            ? "border-l-destructive bg-destructive/[0.04] dark:bg-destructive/10"
            : "border-l-emerald-600/70 bg-emerald-500/[0.04] dark:bg-emerald-500/10"
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id={`country-section-${sid}`}
            className="font-heading text-base font-semibold text-foreground tracking-tight"
          >
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
        <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  )
}

function CountryMetadataVerification({ row }: { row: CountryMetadataTargetsRow }) {
  const matchedCount = row.pairs.filter((p) => p.matched).length
  const pairFailCount = row.pairs.length - matchedCount

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border bg-muted/20 p-4 dark:bg-muted/10">
      <div>
        <p className="mb-1 font-medium text-foreground text-sm">
          Country metadata → targets
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Each <strong className="font-medium text-foreground">Country</strong> option
          must appear as a target named{" "}
          <code className="font-mono text-[10px]">{COUNTRY_TARGET_NAME_PREFIX}</code>
          <span className="font-mono text-[10px]">{"{option text}"}</span>.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-background/80 dark:bg-background/40">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-border border-b bg-muted/50 text-[10px] uppercase tracking-wide text-muted-foreground dark:bg-muted/25">
              <th className="px-3 py-2.5 font-medium">Metadata (Country)</th>
              <th className="px-3 py-2.5 font-medium">Target name</th>
              <th className="min-w-[7rem] px-3 py-2.5 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {row.pairs.map((p) => (
              <tr
                key={p.expectedTargetName}
                className={cn(
                  "bg-card/50",
                  !p.matched && "bg-destructive/[0.04] dark:bg-destructive/10"
                )}
              >
                <td className="px-3 py-2.5 font-mono text-xs text-foreground">
                  {p.countryText}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs break-all text-muted-foreground">
                  {p.expectedTargetName}
                </td>
                <td className="px-3 py-2.5">
                  {p.matched ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700 text-xs dark:text-emerald-400">
                      <Check className="size-3.5 shrink-0" aria-hidden />
                      Found
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-destructive text-xs">
                      <X className="size-3.5 shrink-0" aria-hidden />
                      Missing
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {row.extraTargets.map((name) => (
              <tr
                key={`extra:${name}`}
                className="bg-destructive/[0.04] dark:bg-destructive/10"
              >
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                  —
                </td>
                <td className="px-3 py-2.5 font-mono text-xs break-all text-muted-foreground">
                  {name}
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1 font-medium text-destructive text-xs">
                    <X className="size-3.5 shrink-0" aria-hidden />
                    Missing Country metadata
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {row.extraTargets.length === 0 ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          No additional targets — every target name maps to Country metadata for this
          check (
          <code className="font-mono text-[10px]">{COUNTRY_TARGET_NAME_PREFIX}</code>
          …). Additional rows appear in the table when the asset has other targets
          (e.g. region).
        </p>
      ) : (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Rows marked{" "}
          <span className="italic">Additional target</span> are on the asset but do
          not have matching Country metadata, so this case fails.
        </p>
      )}

      <div className="border-border border-t border-dashed pt-2">
        <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Automated checks
        </p>
        <CheckLine
          state={pairFailCount === 0 ? "pass" : "fail"}
          label="Country metadata values have matching targets"
          detail={
            pairFailCount === 0
              ? `${matchedCount} of ${row.pairs.length} mapped — all present.`
              : `${pairFailCount} missing (${row.missingTargets.join(", ")}).`
          }
        />
        <CheckLine
          state={row.extraTargets.length > 0 ? "fail" : "pass"}
          label="No targets exist without matching Country metadata"
          detail={
            row.extraTargets.length > 0
              ? `${row.extraTargets.length} additional target name(s) found (${row.extraTargets.join(", ")}).`
              : "No additional target names found."
          }
        />
      </div>
    </div>
  )
}

function CaseBlock({
  row,
  items,
  frontifyWebBase,
  variant,
}: {
  row: CountryMetadataTargetsRow
  items: FrontifyLibraryAssetItem[]
  frontifyWebBase: FrontifyWebBase | null
  variant: "fail" | "pass"
}) {
  const item = items.find((i) => i.id === row.assetId)
  const extension = item
    ? stringField(item, "extension").replace(/^\./, "") || "—"
    : "—"
  const externalId = item ? stringField(item, "externalId").trim() : ""
  const previewOk = item ? Boolean(previewHref(item)) : false

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-border border-b bg-muted/30 px-4 py-4 sm:flex-row sm:items-start sm:justify-between dark:bg-muted/15">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading font-semibold text-base text-foreground leading-tight">
              {row.title}
            </h3>
            <Badge variant="outline" className="font-mono text-xs">
              .{extension}
            </Badge>
            <span className="text-muted-foreground text-xs">asset</span>
          </div>
          {externalId ? (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                External ID
              </p>
              <code className="break-all font-mono text-sm">{externalId}</code>
            </div>
          ) : null}
          {variant === "fail" ? (
            <p className="flex items-start gap-1.5 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm leading-snug dark:bg-destructive/10">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-medium text-foreground">Finding: </span>
                {row.note}
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-emerald-800 text-sm dark:text-emerald-300">
              <Check className="size-4 shrink-0" aria-hidden />
              {row.note}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <Badge
            variant={variant === "fail" ? "destructive" : "secondary"}
            className={cn(
              "px-3 py-1 text-sm",
              variant === "pass" &&
                "border-emerald-600/30 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
            )}
          >
            {variant === "fail" ? "Fail" : "Pass"}
          </Badge>
        </div>
      </div>

      <RuleCaseVisualRow
        items={items}
        frontifyWebBase={frontifyWebBase}
        slots={[
          {
            label: "Asset — preview",
            hint: previewOk
              ? "From GraphQL previewUrl"
              : "No preview URL in this load",
            assetIds: [row.assetId],
          },
        ]}
      />

      <div className="p-4">
        <CountryMetadataVerification row={row} />
      </div>
    </article>
  )
}

type Props = {
  rows: CountryMetadataTargetsRow[]
  assetCount: number
  passCount: number
  failCount: number
  items: FrontifyLibraryAssetItem[]
  frontifyWebBase: FrontifyWebBase | null
}

export function CountryMetadataTargetsRulePanel({
  rows,
  assetCount,
  passCount,
  failCount,
  items,
  frontifyWebBase,
}: Props) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <RuleSuitePanelHeader
        suiteId="COUNTRY-META-TARGETS"
        title="Country metadata → targets"
        casesLabel="Assets"
        caseCount={assetCount}
        passCount={passCount}
        failCount={failCount}
        description={
          <>
            For the custom metadata property{" "}
            <strong className="font-medium">Country</strong>, each selected option
            text must have a Frontify target whose name is{" "}
            <code className="font-mono text-xs">{COUNTRY_TARGET_NAME_PREFIX}</code>
            plus that same text — e.g.{" "}
            <code className="font-mono text-xs">AU - Australia</code> →{" "}
            <code className="font-mono text-xs">
              {expectedCountryTargetName("AU - Australia")}
            </code>
            . Any additional target name on the asset that is not represented by
            Country metadata also fails this check. Other metadata properties are
            ignored.
          </>
        }
      />
      <CardContent className="space-y-8 pt-6">
        {assetCount === 0 ? (
          <p className="text-muted-foreground text-sm">
            No assets in this load carry Country custom metadata with at least one
            option — nothing to verify.
          </p>
        ) : (
          (() => {
            const ordered = sortRuleRowsFailsFirst(rows)
            const failRows = ordered.filter((r) => !r.ok)
            const passRows = ordered.filter((r) => r.ok)
            return (
              <>
                {failCount > 0 ? (
                  <SuiteSection
                    title="Non-conformities"
                    subtitle="Per-case evidence: preview, Country ↔ target table, and target names without matching Country metadata."
                    count={failCount}
                    tone="fail"
                  >
                    <div className="space-y-6">
                      {failRows.map((row) => (
                        <CaseBlock
                          key={row.assetId}
                          row={row}
                          items={items}
                          frontifyWebBase={frontifyWebBase}
                          variant="fail"
                        />
                      ))}
                    </div>
                  </SuiteSection>
                ) : null}
                {passCount > 0 ? (
                  <SuiteSection
                    title="Conformities"
                    subtitle="Country metadata and target names are fully aligned (no missing or extra target names)."
                    count={passCount}
                    tone="pass"
                  >
                    <div className="space-y-6">
                      {passRows.map((row) => (
                        <CaseBlock
                          key={row.assetId}
                          row={row}
                          items={items}
                          frontifyWebBase={frontifyWebBase}
                          variant="pass"
                        />
                      ))}
                    </div>
                  </SuiteSection>
                ) : null}
              </>
            )
          })()
        )}
      </CardContent>
    </Card>
  )
}
