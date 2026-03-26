import { stringField } from "@/lib/frontify/asset-helpers"
import type { FrontifyLibraryAssetItem } from "@/lib/frontify/types"
import { expectedPngRenditionForJpgMaster } from "@/lib/rules/jpg-needs-png"
import {
  expectedJpegRenditionForPngMaster,
  isRenditionExternalId,
} from "@/lib/rules/png-needs-jpeg"
import {
  expectedJpegRenditionExternalId,
  expectedPngRenditionExternalId,
} from "@/lib/rules/psd-png-jpg"
import {
  expectedTifJpegRenditionExternalId,
  expectedTifPngRenditionExternalId,
} from "@/lib/rules/tif-png-jpg"

function normExt(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\./, "")
}

function isJpegExt(ext: string): boolean {
  return ext === "jpg" || ext === "jpeg"
}

type MasterKind = "psdPsb" | "tifTiff" | "jpgJpeg" | "png"

type RenditionExpectation = {
  slot: "jpeg" | "png"
  expectedExternalId: string
  expectedType: "jpeg" | "png"
}

export type MasterRenditionMatchRow = {
  masterId: string
  title: string
  masterExtension: string
  masterExternalId: string
  kind: MasterKind
  ok: boolean
  note: string
  checks: {
    slot: "jpeg" | "png"
    expectedExternalId: string
    renditionId: string | null
    renditionExtension: string | null
    found: boolean
    metadataEqual: boolean
    targetsEqual: boolean
    metadataRows: {
      property: string
      masterValues: string[]
      renditionValues: string[]
      equal: boolean
    }[]
    targetRows: {
      name: string
      inMaster: boolean
      inRendition: boolean
      equal: boolean
    }[]
    ok: boolean
    note: string
  }[]
}

function metadataMap(item: FrontifyLibraryAssetItem): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  const raw = item.customMetadata
  if (!Array.isArray(raw)) return out
  for (const m of raw) {
    if (!m || typeof m !== "object") continue
    const prop = (m as { property?: unknown }).property
    if (!prop || typeof prop !== "object") continue
    const key = (prop as { name?: unknown }).name
    if (typeof key !== "string" || key.trim() === "") continue
    const values = (m as { values?: unknown }).values
    const set = new Set<string>()
    if (Array.isArray(values)) {
      for (const v of values) {
        if (!v || typeof v !== "object") continue
        const text = (v as { text?: unknown }).text
        if (typeof text !== "string") continue
        const t = text.trim()
        if (t) set.add(t)
      }
    }
    out.set(key.trim(), set)
  }
  return out
}

function targetSet(item: FrontifyLibraryAssetItem): Set<string> {
  const out = new Set<string>()
  const raw = item.targets
  if (!Array.isArray(raw)) return out
  for (const t of raw) {
    if (!t || typeof t !== "object") continue
    const name = (t as { name?: unknown }).name
    if (typeof name !== "string") continue
    const n = name.trim()
    if (n) out.add(n)
  }
  return out
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const x of a) if (!b.has(x)) return false
  return true
}

function mapsEqual(a: Map<string, Set<string>>, b: Map<string, Set<string>>): boolean {
  if (a.size !== b.size) return false
  for (const [k, av] of a) {
    const bv = b.get(k)
    if (!bv) return false
    if (!setsEqual(av, bv)) return false
  }
  return true
}

function metadataRows(
  master: Map<string, Set<string>>,
  rendition: Map<string, Set<string>>
): {
  property: string
  masterValues: string[]
  renditionValues: string[]
  equal: boolean
}[] {
  const keys = new Set<string>([...master.keys(), ...rendition.keys()])
  return [...keys]
    .sort((a, b) => a.localeCompare(b))
    .map((property) => {
      const m = [...(master.get(property) ?? new Set<string>())].sort((a, b) =>
        a.localeCompare(b)
      )
      const r = [...(rendition.get(property) ?? new Set<string>())].sort((a, b) =>
        a.localeCompare(b)
      )
      const equal = m.length === r.length && m.every((v, i) => v === r[i])
      return { property, masterValues: m, renditionValues: r, equal }
    })
}

function targetRows(
  master: Set<string>,
  rendition: Set<string>
): {
  name: string
  inMaster: boolean
  inRendition: boolean
  equal: boolean
}[] {
  const keys = new Set<string>([...master, ...rendition])
  return [...keys]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const inMaster = master.has(name)
      const inRendition = rendition.has(name)
      return { name, inMaster, inRendition, equal: inMaster === inRendition }
    })
}

function expectationForMaster(item: FrontifyLibraryAssetItem): RenditionExpectation[] {
  const ext = normExt(stringField(item, "extension"))
  const base = stringField(item, "externalId").trim()
  if (!base) return []
  if (ext === "psd" || ext === "psb") {
    return [
      {
        slot: "jpeg",
        expectedExternalId: expectedJpegRenditionExternalId(base),
        expectedType: "jpeg",
      },
      {
        slot: "png",
        expectedExternalId: expectedPngRenditionExternalId(base),
        expectedType: "png",
      },
    ]
  }
  if (ext === "tif" || ext === "tiff") {
    return [
      {
        slot: "jpeg",
        expectedExternalId: expectedTifJpegRenditionExternalId(base),
        expectedType: "jpeg",
      },
      {
        slot: "png",
        expectedExternalId: expectedTifPngRenditionExternalId(base),
        expectedType: "png",
      },
    ]
  }
  if (isJpegExt(ext)) {
    return [
      {
        slot: "png",
        expectedExternalId: expectedPngRenditionForJpgMaster(base),
        expectedType: "png",
      },
    ]
  }
  if (ext === "png") {
    return [
      {
        slot: "jpeg",
        expectedExternalId: expectedJpegRenditionForPngMaster(base),
        expectedType: "jpeg",
      },
    ]
  }
  return []
}

function masterKind(item: FrontifyLibraryAssetItem): MasterKind | null {
  const ext = normExt(stringField(item, "extension"))
  if (ext === "psd" || ext === "psb") return "psdPsb"
  if (ext === "tif" || ext === "tiff") return "tifTiff"
  if (isJpegExt(ext)) return "jpgJpeg"
  if (ext === "png") return "png"
  return null
}

function isMasterCandidate(item: FrontifyLibraryAssetItem): boolean {
  const kind = masterKind(item)
  if (!kind) return false
  const extId = stringField(item, "externalId").trim()
  if (!extId) return true
  if (kind === "jpgJpeg" || kind === "png") return !isRenditionExternalId(extId)
  return true
}

function indexByExternalId(
  items: FrontifyLibraryAssetItem[]
): Map<string, FrontifyLibraryAssetItem[]> {
  const map = new Map<string, FrontifyLibraryAssetItem[]>()
  for (const item of items) {
    const id = stringField(item, "externalId").trim()
    if (!id) continue
    const list = map.get(id)
    if (list) list.push(item)
    else map.set(id, [item])
  }
  return map
}

export function evaluateMasterRenditionMetadataTargetsRules(
  items: FrontifyLibraryAssetItem[]
): { rows: MasterRenditionMatchRow[]; masterCount: number; passCount: number; failCount: number } {
  const byExternalId = indexByExternalId(items)
  const rows: MasterRenditionMatchRow[] = []

  for (const master of items) {
    if (!isMasterCandidate(master)) continue
    const kind = masterKind(master)
    if (!kind) continue
    const masterExternalId = stringField(master, "externalId").trim()
    const masterExtension = normExt(stringField(master, "extension")) || "—"
    const title = stringField(master, "title") || "—"
    const expected = expectationForMaster(master)

    if (expected.length === 0) continue
    if (!masterExternalId) {
      rows.push({
        masterId: master.id,
        title,
        masterExtension,
        masterExternalId: "",
        kind,
        ok: false,
        note: "Master has no external ID (cannot derive expected rendition IDs).",
        checks: [],
      })
      continue
    }

    const mMeta = metadataMap(master)
    const mTargets = targetSet(master)

    const checks = expected.map((exp) => {
      const candidates = byExternalId.get(exp.expectedExternalId) ?? []
      const typed = candidates.filter((c) => {
        const ext = normExt(stringField(c, "extension"))
        return exp.expectedType === "jpeg" ? isJpegExt(ext) : ext === "png"
      })
      const rendition = typed[0] ?? null
      if (!rendition) {
        return {
          slot: exp.slot,
          expectedExternalId: exp.expectedExternalId,
          renditionId: null,
          renditionExtension: null,
          found: false,
          metadataEqual: false,
          targetsEqual: false,
          metadataRows: metadataRows(mMeta, new Map<string, Set<string>>()),
          targetRows: targetRows(mTargets, new Set<string>()),
          ok: false,
          note:
            candidates.length === 0
              ? `No rendition found at ${exp.expectedExternalId}.`
              : `Rendition exists at ${exp.expectedExternalId} but file type is not ${exp.expectedType}.`,
        }
      }

      const rMeta = metadataMap(rendition)
      const rTargets = targetSet(rendition)
      const metadataEqual = mapsEqual(mMeta, rMeta)
      const targetsEqual = setsEqual(mTargets, rTargets)
      const ok = metadataEqual && targetsEqual
      return {
        slot: exp.slot,
        expectedExternalId: exp.expectedExternalId,
        renditionId: rendition.id,
        renditionExtension: normExt(stringField(rendition, "extension")) || null,
        found: true,
        metadataEqual,
        targetsEqual,
        metadataRows: metadataRows(mMeta, rMeta),
        targetRows: targetRows(mTargets, rTargets),
        ok,
        note: ok
          ? "Metadata and targets match master exactly."
          : [
              !metadataEqual ? "Custom metadata differs from master." : null,
              !targetsEqual ? "Targets differ from master." : null,
            ]
              .filter(Boolean)
              .join(" "),
      }
    })

    const ok = checks.length > 0 && checks.every((c) => c.ok)
    const failed = checks.filter((c) => !c.ok)
    rows.push({
      masterId: master.id,
      title,
      masterExtension,
      masterExternalId,
      kind,
      ok,
      note: ok
        ? "All expected renditions match master metadata and targets."
        : failed.map((c) => `${c.slot.toUpperCase()}: ${c.note}`).join(" "),
      checks,
    })
  }

  const passCount = rows.filter((r) => r.ok).length
  const failCount = rows.filter((r) => !r.ok).length
  return { rows, masterCount: rows.length, passCount, failCount }
}

export type EvaluateMasterRenditionMetadataTargetsRulesResult = ReturnType<
  typeof evaluateMasterRenditionMetadataTargetsRules
>
