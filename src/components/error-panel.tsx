import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ErrorPanel({
  summary,
  detail,
}: {
  summary: string
  detail?: string
}) {
  return (
    <div className="space-y-3">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription className="whitespace-pre-wrap font-sans text-destructive/90">
          {summary}
        </AlertDescription>
      </Alert>
      {detail ? (
        <pre className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-muted p-4 text-left font-mono text-xs leading-relaxed text-foreground">
          {detail}
        </pre>
      ) : null}
    </div>
  )
}
