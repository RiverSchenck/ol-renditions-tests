import {
  expectedPngRenditionForJpgMaster,
  type JpgNeedsPngRasterInfo,
  type JpgNeedsPngRow,
} from "@/lib/rules/jpg-needs-png"
import type { FrontifyWebBase } from "@/lib/frontify/frontify-web-base"
import { RuleCaseVisualRow } from "@/components/rule-case-visual-row"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RuleSuitePanelHeader } from "@/components/rule-suite-panel-header"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"
import { cn, sortRuleRowsFailsFirst } from "@/lib/utils"
import type { ReactNode } from "react"
import { AlertCircle, Check, Minus, X } from "lucide-react"

type Props = {
  rows: JpgNeedsPngRow[]
  jpgMasterCount: number
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

function PngRenditionVerification({
  expectedExternalId,
  candidates,
}: {
  expectedExternalId: string
  candidates: JpgNeedsPngRasterInfo[]
}) {
  const hasAnyAsset = candidates.length > 0
  const matching = candidates.filter((c) => c.extension.toLowerCase() === "png")
  const wrongType = candidates.filter((c) => c.extension.toLowerCase() !== "png")

  const typeState: "pass" | "fail" | "na" = !hasAnyAsset
    ? "na"
    : matching.length > 0
      ? "pass"
      : "fail"

  const typeDetail = !hasAnyAsset
    ? "No asset uses this external ID."
    : matching.length > 0
      ? `${matching.length} file(s) with .png.`
      : wrongType.length > 0
        ? `Wrong type at this ID: ${wrongType.map((w) => `.${w.extension}`).join(", ")} (need png).`
        : undefined

  const dimLines =
    matching.length > 0 ? (
      <ul className="mt-1 space-y-1 pl-0.5">
        {matching.map((c) => (
          <li
            key={c.id}
            className="list-none font-mono text-[11px] leading-relaxed text-muted-foreground"
          >
            {c.width != null && c.height != null ? (
              <>
                {c.width}×{c.height}px
                {c.longSide != null ? ` · long side ${c.longSide}px` : null}
              </>
            ) : (
              <>API dimensions not available · id {c.id}</>
            )}
          </li>
        ))}
      </ul>
    ) : null

  return (
    <div className="flex flex-col rounded-lg border border-dashed border-border bg-muted/20 p-4 dark:bg-muted/10">
      <p className="mb-3 font-medium text-foreground text-sm">
        Expected PNG rendition
      </p>
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
          label="File type (png)"
          detail={typeDetail}
        />
        {matching.length > 0 ? (
          <div className="mt-1 border-border border-t border-dashed pt-2">
            <p className="mb-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Dimensions (reference only — no size rule)
            </p>
            {dimLines}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function FailureRegisterTable({ rows }: { rows: JpgNeedsPngRow[] }) {
  if (rows.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-lg border border-destructive/25 bg-destructive/[0.03] dark:bg-destructive/5">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="border-border border-b px-4 py-3 text-left">
          <span className="font-semibold text-foreground">Failure register</span>
          <span className="ml-2 text-muted-foreground font-normal">
            — quick scan; full evidence follows in each case below.
          </span>
        </caption>
        <thead>
          <tr className="border-border border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground dark:bg-muted/20">
            <th className="px-4 py-2.5 font-medium">#</th>
            <th className="px-4 py-2.5 font-medium">Master title</th>
            <th className="px-4 py-2.5 font-medium">Base external ID</th>
            <th className="px-4 py-2.5 font-medium">Expected PNG ID</th>
            <th className="min-w-[200px] px-4 py-2.5 font-medium">Finding</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => {
            const expected =
              row.externalId.trim() === ""
                ? "—"
                : expectedPngRenditionForJpgMaster(row.externalId)
            return (
              <tr
                key={row.jpgId}
                className="bg-card/80 text-foreground hover:bg-muted/30"
              >
                <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">
                  {i + 1}
                </td>
                <td className="max-w-[220px] px-4 py-2.5 font-medium leading-snug">
                  {row.title}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs break-all">
                  {row.externalId.trim() || "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs break-all">
                  {expected}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs leading-relaxed">
                  {row.note}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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
  return (
    <section className="space-y-4" aria-labelledby={`jpg-section-${tone}`}>
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
            id={`jpg-section-${tone}`}
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

function ConformityCaseBlock({
  row,
  items,
  frontifyWebBase,
}: {
  row: JpgNeedsPngRow
  items: FrontifyLibraryAssetItem[]
  frontifyWebBase: FrontifyWebBase | null
}) {
  const hasBase = Boolean(row.externalId.trim())

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-border border-b bg-muted/30 px-4 py-4 sm:flex-row sm:items-start sm:justify-between dark:bg-muted/15">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading font-semibold text-base text-foreground leading-tight">
              {row.title}
            </h3>
            <Badge variant="outline" className="font-mono text-xs">
              .{row.jpgExtension}
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
          ) : null}
        </div>
        <div className="shrink-0">
          <Badge className="bg-emerald-600 px-3 py-1 text-sm hover:bg-emerald-600">
            Pass
          </Badge>
        </div>
      </div>

      <RuleCaseVisualRow
        items={items}
        frontifyWebBase={frontifyWebBase}
        slots={[
          {
            label: "Master — JPEG",
            hint: `JPG/JPEG · .${row.jpgExtension}`,
            assetIds: [row.jpgId],
          },
          {
            label: "Rendition — PNG",
            hint: "Expected at {base}-rendition-png",
            assetIds: row.pngRasters.map((r) => r.id),
          },
        ]}
      />

      {hasBase ? (
        <div className="p-4">
          <PngRenditionVerification
            expectedExternalId={expectedPngRenditionForJpgMaster(row.externalId)}
            candidates={row.pngRasters}
          />
        </div>
      ) : null}
    </article>
  )
}

function NonConformityCaseBlock({
  row,
  items,
  frontifyWebBase,
}: {
  row: JpgNeedsPngRow
  items: FrontifyLibraryAssetItem[]
  frontifyWebBase: FrontifyWebBase | null
}) {
  const hasBase = Boolean(row.externalId.trim())

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-border border-b bg-muted/30 px-4 py-4 sm:flex-row sm:items-start sm:justify-between dark:bg-muted/15">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading font-semibold text-base text-foreground leading-tight">
              {row.title}
            </h3>
            <Badge variant="outline" className="font-mono text-xs">
              .{row.jpgExtension}
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
              No base external ID — cannot derive PNG rendition ID.
            </p>
          )}
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm leading-snug dark:bg-destructive/10">
            <span className="font-medium text-foreground">Finding: </span>
            {row.note}
          </p>
        </div>
        <div className="shrink-0">
          <Badge variant="destructive" className="px-3 py-1 text-sm">
            Fail
          </Badge>
        </div>
      </div>

      <RuleCaseVisualRow
        items={items}
        frontifyWebBase={frontifyWebBase}
        slots={[
          {
            label: "Master — JPEG",
            hint: `JPG/JPEG · .${row.jpgExtension}`,
            assetIds: [row.jpgId],
          },
          {
            label: "Rendition — PNG",
            hint: "Expected at {base}-rendition-png",
            assetIds: row.pngRasters.map((r) => r.id),
          },
        ]}
      />

      {hasBase ? (
        <div className="p-4">
          <PngRenditionVerification
            expectedExternalId={expectedPngRenditionForJpgMaster(row.externalId)}
            candidates={row.pngRasters}
          />
        </div>
      ) : null}
    </article>
  )
}

export function JpgNeedsPngRulePanel({
  rows,
  jpgMasterCount,
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
        suiteId="JPG-MASTER-PNG"
        title="JPG masters — PNG rendition"
        casesLabel="Masters"
        caseCount={jpgMasterCount}
        passCount={passCount}
        failCount={failCount}
        description={
          <>
            Each <strong>master JPG/JPEG</strong> (not a rendition by external ID)
            must have a sibling PNG at{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              {"{base}-rendition-png"}
            </code>{" "}
            — e.g.{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              GO12HOWE
            </code>{" "}
            →{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              GO12HOWE-rendition-png
            </code>
            . There is <strong>no</strong> pixel-size requirement for this suite.
          </>
        }
      />
      <CardContent className="space-y-8 pt-6">
        {jpgMasterCount === 0 ? (
          <p className="text-muted-foreground text-sm">
            No JPG/JPEG master assets in this library load (or every JPEG is
            classified as a rendition by external ID) — nothing to verify here.
          </p>
        ) : (
          <>
            {failCount > 0 ? (
              <>
                <FailureRegisterTable rows={failRows} />
                <SuiteSection
                  title="Non-conformities"
                  subtitle="Per-case evidence: master preview, expected PNG slot, and automated checks."
                  count={failCount}
                  tone="fail"
                >
                  <div className="space-y-6">
                    {failRows.map((row) => (
                      <NonConformityCaseBlock
                        key={row.jpgId}
                        row={row}
                        items={items}
                        frontifyWebBase={frontifyWebBase}
                      />
                    ))}
                  </div>
                </SuiteSection>
              </>
            ) : null}

            {passCount > 0 ? (
              <SuiteSection
                title="Conformities"
                subtitle="Same layout as other suites: master and PNG rendition side by side, then automated checks."
                count={passCount}
                tone="pass"
              >
                <div className="space-y-6">
                  {passRows.map((row) => (
                    <ConformityCaseBlock
                      key={row.jpgId}
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
