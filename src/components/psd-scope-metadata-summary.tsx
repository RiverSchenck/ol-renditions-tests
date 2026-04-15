import { Badge } from "@/components/ui/badge"
import {
  PSD_METADATA_ASSET_TYPE_PROPERTY,
  PSD_METADATA_SUBCATEGORY_PROPERTY,
  type PsdPsbScopeMetadataSnapshot,
  type PsdPsbScopePath,
} from "@/lib/rules/psd-png-jpg"

function ValueBadges({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <Badge key={v} variant="secondary" className="font-mono text-[10px]">
          {v}
        </Badge>
      ))}
    </div>
  )
}

function scopePathDescription(path: PsdPsbScopePath): string {
  if (path === "photography_or_carousel") {
    return "Matched Photography or Carousel — expect JPEG + PNG at {base}-rendition-jpeg-1200px and {base}-rendition-png-1200px; 1200px long side on a matching JPEG or PNG."
  }
  if (path === "module_subcategory") {
    return "Matched Feature Module / Desktop / Mobile — expect JPEG + PNG at {base}-rendition-jpeg and {base}-rendition-png (no long-side rule)."
  }
  return "Did not match an in-scope profile — renditions not required. Values below are what Frontify returned on the master."
}

type Props = {
  scopePath: PsdPsbScopePath
  scopeMetadata: PsdPsbScopeMetadataSnapshot
  className?: string
}

/**
 * Shows master Asset Type / Sub-Category and how they map to PSD rendition eligibility.
 */
export function PsdScopeMetadataSummary({ scopePath, scopeMetadata, className }: Props) {
  return (
    <div
      className={
        className ??
        "rounded-lg border border-border bg-muted/25 px-3 py-2.5 dark:bg-muted/10"
      }
    >
      <p className="mb-1 font-medium text-foreground text-xs">Eligibility (master metadata)</p>
      <p className="mb-2 text-muted-foreground text-xs leading-snug">
        {scopePathDescription(scopePath)}
      </p>
      <dl className="grid gap-2 text-xs sm:grid-cols-[minmax(0,8.5rem)_1fr] sm:gap-x-3">
        <dt className="pt-0.5 text-muted-foreground">{PSD_METADATA_ASSET_TYPE_PROPERTY}</dt>
        <dd className="min-w-0">
          <ValueBadges values={scopeMetadata.assetType} />
        </dd>
        <dt className="pt-0.5 text-muted-foreground">{PSD_METADATA_SUBCATEGORY_PROPERTY}</dt>
        <dd className="min-w-0">
          <ValueBadges values={scopeMetadata.assetSubCategory} />
        </dd>
      </dl>
    </div>
  )
}
