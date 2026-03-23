import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Stable copy with failures first (for rule test UIs). */
export function sortRuleRowsFailsFirst<T extends { ok: boolean }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.ok === b.ok) return 0
    return a.ok ? 1 : -1
  })
}
