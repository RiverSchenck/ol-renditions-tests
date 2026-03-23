/**
 * Black studio background (#000-style): a border pixel counts toward the black
 * fraction only if max(R,G,B) ≤ this (same pixel, not independent channel mins).
 */
export const JPEG_BORDER_BLACK_MAX_CHANNEL = 40

/**
 * Same-pixel neutrality: max(R,G,B) − min(R,G,B) must be ≤ this so we do not
 * treat saturated edge noise as black fill.
 */
export const JPEG_BORDER_BLACK_MAX_CHROMA_SPREAD = 22

/**
 * Fail when at least this fraction of border-band pixels read as black fill.
 * Centered product on true black frame yields a very high fraction; cream/light
 * backgrounds stay near 0%.
 */
export const JPEG_BORDER_BLACK_FRACTION_FAIL = 0.32

/**
 * In addition to the global border fraction above, this many of the non-empty
 * edge bands must meet that fraction. Set to 4 so **all** sides (top, bottom,
 * left, right) read as black — a black table or prop on one edge only, with
 * tile/sky/wall on another, stays a pass.
 */
export const JPEG_BORDER_BLACK_MIN_EDGES_QUALIFIED = 4
