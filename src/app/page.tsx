import type { ReactNode } from "react"
import { Library } from "lucide-react"

import { LibraryCheckWorkspace } from "@/components/library-check-workspace"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ErrorPanel } from "@/components/error-panel"
import { parseFrontifyLibraryIdFromEnv } from "@/lib/frontify/library-id-from-env"

function graphqlDisplayOrigin(raw: string | undefined): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  try {
    return new URL(trimmed).origin
  } catch {
    return trimmed
  }
}

function PageHeader({
  title,
  description,
}: {
  title: string
  description: ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Library className="size-5 shrink-0" aria-hidden />
        <span className="text-xs font-medium tracking-wide uppercase">
          Frontify
        </span>
      </div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {title}
      </h1>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {description}
      </div>
    </div>
  )
}

export default function Home() {
  const libraryParsed = parseFrontifyLibraryIdFromEnv(
    process.env.FRONTIFY_LIBRARY_ID
  )
  const graphqlUrl = process.env.FRONTIFY_GRAPHQL_URL?.trim()
  const endpointOrigin = graphqlDisplayOrigin(graphqlUrl)

  if (!libraryParsed.ok) {
    const missing = libraryParsed.kind === "missing"
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pr-16 pt-8 sm:px-6 sm:pr-20 md:pt-12">
          <PageHeader
            title="OL Renditions tests"
            description="Configure environment variables to load your library."
          />
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                {missing ? (
                  <>
                    Set{" "}
                    <code className="font-mono text-xs">FRONTIFY_LIBRARY_ID</code>{" "}
                    to a positive integer in your env file.
                  </>
                ) : (
                  <>
                    <code className="font-mono text-xs">FRONTIFY_LIBRARY_ID</code>{" "}
                    must be a positive integer (digits only, e.g.{" "}
                    <code className="font-mono text-xs">23</code>).
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorPanel
                summary={
                  missing
                    ? "Missing FRONTIFY_LIBRARY_ID. Set it in your environment file."
                    : "Invalid FRONTIFY_LIBRARY_ID. Use a positive integer (digits only)."
                }
                detail={JSON.stringify(
                  missing
                    ? { code: "MISSING_ENV", variable: "FRONTIFY_LIBRARY_ID" }
                    : { code: "INVALID_LIBRARY_ID" },
                  null,
                  2
                )}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const libraryId = libraryParsed.id

  const metaDescription = (
    <>
      <span>Library</span>
      <Badge variant="secondary" className="font-mono font-normal">
        {libraryId}
      </Badge>
      {endpointOrigin ? (
        <>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {endpointOrigin}
          </span>
        </>
      ) : null}
    </>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pr-16 pt-8 sm:px-6 sm:pr-20 md:pt-12">
        <PageHeader title="OL Renditions tests" description={metaDescription} />
        <LibraryCheckWorkspace />
      </div>
    </div>
  )
}
