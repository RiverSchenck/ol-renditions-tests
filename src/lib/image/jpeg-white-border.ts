import sharp from "sharp"

import {
  JPEG_BORDER_BLACK_FRACTION_FAIL,
  JPEG_BORDER_BLACK_MAX_CHANNEL,
  JPEG_BORDER_BLACK_MAX_CHROMA_SPREAD,
  JPEG_BORDER_BLACK_MIN_EDGES_QUALIFIED,
} from "./jpeg-white-border-constants"

export {
  JPEG_BORDER_BLACK_FRACTION_FAIL,
  JPEG_BORDER_BLACK_MAX_CHANNEL,
  JPEG_BORDER_BLACK_MAX_CHROMA_SPREAD,
  JPEG_BORDER_BLACK_MIN_EDGES_QUALIFIED,
} from "./jpeg-white-border-constants"

export type WhiteBorderAnalysis = {
  ok: boolean
  summary: string
  sampleCount: number
  /** RGB of the border pixel with the lowest max channel (darkest “overall” edge sample). */
  minRgb: { r: number; g: number; b: number } | null
  /** Share of border pixels classified as black studio fill (0–1). */
  blackPixelFraction: number | null
}

function isBlackStudioBorderPixel(
  r: number,
  g: number,
  b: number,
  blackMax: number,
  maxChromaSpread: number
): boolean {
  const mx = Math.max(r, g, b)
  if (mx > blackMax) return false
  const mn = Math.min(r, g, b)
  if (mx - mn > maxChromaSpread) return false
  return true
}

type EdgeKey = "top" | "bottom" | "left" | "right"

function disjointEdgeFor(
  x: number,
  y: number,
  w: number,
  h: number,
  strip: number
): EdgeKey | null {
  const onBorder =
    y < strip || y >= h - strip || x < strip || x >= w - strip
  if (!onBorder) return null
  if (y < strip) return "top"
  if (y >= h - strip) return "bottom"
  if (x < strip) return "left"
  if (x >= w - strip) return "right"
  return null
}

function edgesQualificationNeeded(nonEmptyEdgeCount: number): number {
  if (nonEmptyEdgeCount <= 0) return 0
  if (nonEmptyEdgeCount >= 4) return JPEG_BORDER_BLACK_MIN_EDGES_QUALIFIED
  return nonEmptyEdgeCount
}

/**
 * Samples an edge band (after EXIF rotate + downscale). Fails when the overall
 * border reads as black studio fill **and** black fill appears on **all** edge
 * bands (true #000 frame on every side). Partial black (table, hair, shadow) on
 * some edges only stays a pass.
 */
export async function analyzeJpegBufferWhiteBorder(
  buffer: Buffer
): Promise<WhiteBorderAnalysis> {
  try {
    const { data, info } = await sharp(buffer)
      .rotate()
      .resize({
        width: 384,
        height: 384,
        fit: "inside",
        withoutEnlargement: true,
      })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const w = info.width
    const h = info.height
    const channels = info.channels
    if (!w || !h || channels < 3) {
      return {
        ok: false,
        summary: "Could not decode RGB raster from preview.",
        sampleCount: 0,
        minRgb: null,
        blackPixelFraction: null,
      }
    }

    const strip = Math.max(1, Math.min(8, Math.floor(Math.min(w, h) * 0.04)))
    const blackMax = JPEG_BORDER_BLACK_MAX_CHANNEL
    const chroma = JPEG_BORDER_BLACK_MAX_CHROMA_SPREAD
    const failFraction = JPEG_BORDER_BLACK_FRACTION_FAIL

    const edgeCount: Record<EdgeKey, number> = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }
    const edgeBlack: Record<EdgeKey, number> = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }

    let count = 0
    let blackCount = 0
    let minPeak = 256
    let minPeakR = 0
    let minPeakG = 0
    let minPeakB = 0

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const edge = disjointEdgeFor(x, y, w, h, strip)
        if (edge === null) continue

        const i = (y * w + x) * channels
        const r = data[i] ?? 0
        const g = data[i + 1] ?? 0
        const b = data[i + 2] ?? 0
        count++
        edgeCount[edge]++

        const peak = Math.max(r, g, b)
        if (peak < minPeak) {
          minPeak = peak
          minPeakR = r
          minPeakG = g
          minPeakB = b
        }

        const black = isBlackStudioBorderPixel(r, g, b, blackMax, chroma)
        if (black) {
          blackCount++
          edgeBlack[edge]++
        }
      }
    }

    if (count === 0) {
      return {
        ok: false,
        summary: "No border pixels sampled (image dimensions too small).",
        sampleCount: 0,
        minRgb: null,
        blackPixelFraction: null,
      }
    }

    const blackPixelFraction = blackCount / count
    const globalHigh = blackPixelFraction >= failFraction

    const edgeKeys: EdgeKey[] = ["top", "bottom", "left", "right"]
    const nonEmptyEdges = edgeKeys.filter((k) => edgeCount[k] > 0)
    const qualifyingEdges = nonEmptyEdges.filter((k) => {
      return edgeBlack[k] / edgeCount[k] >= failFraction
    }).length
    const need = edgesQualificationNeeded(nonEmptyEdges.length)
    const enoughEdges = qualifyingEdges >= need

    const isBlackBackground = globalHigh && enoughEdges
    const ok = !isBlackBackground

    const minRgb = { r: minPeakR, g: minPeakG, b: minPeakB }
    const pct = (blackPixelFraction * 100).toFixed(1)

    const edgeSummary = `${qualifyingEdges}/${nonEmptyEdges.length} edge bands ≥ ${(failFraction * 100).toFixed(0)}% black (need ${need})`

    return {
      ok,
      sampleCount: count,
      minRgb,
      blackPixelFraction,
      summary: ok
        ? `${pct}% black border pixels; ${edgeSummary} — pass.`
        : `${pct}% black border pixels; ${edgeSummary} — fail (studio black frame).`,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      summary: `Image decode failed: ${msg}`,
      sampleCount: 0,
      minRgb: null,
      blackPixelFraction: null,
    }
  }
}
