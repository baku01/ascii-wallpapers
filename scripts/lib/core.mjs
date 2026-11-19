// Shared constants and small helpers for the scene generator.

// The scene's box, and one character cell in it. A scene is drawn on a grid of COLS x ROWS cells.
export const W = 1920
export const H = 1200
export const CW = 10
export const CH = 19
export const COLS = W / CW
export const ROWS = Math.ceil(H / CH)
// where a glyph's baseline sits inside its cell
export const BASE = 14

// A seeded random source (mulberry32): the same seed draws the same scene on every build.
export function rng(seed) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  next.range = (lo, hi) => lo + next() * (hi - lo)
  next.int = (lo, hi) => Math.floor(lo + next() * (hi - lo + 1))
  next.pick = list => list[Math.floor(next() * list.length)]
  return next
}

function hash2(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// Smooth value noise in [0, 1].
export function noise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

// Fractal noise in [0, 1].
export function fbm(x, y, s = 0, octaves = 4) {
  let total = 0, amp = 0.5, f = 1, norm = 0
  for (let i = 0; i < octaves; i++) {
    total += amp * noise(x * f, y * f, s + i * 17)
    norm += amp
    f *= 2
    amp *= 0.5
  }
  return total / norm
}

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export const lerp = (a, b, t) => a + (b - a) * t
export const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
// a number as an SVG attribute wants it: at most two decimals, no trailing zeros
export const num = n => String(Math.round(n * 100) / 100)

// ---------- colour ----------

export function rgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map(c => c + c).join('') : h
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))
}
export function hex([r, g, b]) {
  return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')
}
export function mix(a, b, t) {
  const x = rgb(a), y = rgb(b)
  return hex(x.map((v, i) => lerp(v, y[i], t)))
}

// sRGB <-> OKLab / OKLCH, for palettes that step evenly in lightness
const toLin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGam = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
export function oklch(color) {
  const [r, g, b] = rgb(color).map(v => toLin(v / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 }
}
export function fromOklch({ l, c, h }) {
  const A = c * Math.cos((h * Math.PI) / 180), B = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3
  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
  const b = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_
  return hex([r, g, b].map(v => toGam(clamp(v)) * 255))
}
