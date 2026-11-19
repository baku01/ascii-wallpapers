// Character grids: shapes rasterized into ASCII cells, and how much ink each glyph lays down.
import { CH, CW, clamp } from './core.mjs'

// light to dense; index 0 is the empty cell
export const RAMP = ' .:-=+*#%@'
export const SOFT = ' .,:;~=+*'

// How much of its cell a glyph inks, for the picker's thumbnails.
const INK = {
  ' ': 0, '.': 0.08, ',': 0.1, "'": 0.08, '`': 0.06, ':': 0.16, ';': 0.2, '-': 0.16, '_': 0.14, '~': 0.2, '^': 0.16,
  '"': 0.14, '=': 0.3, '+': 0.3, '*': 0.34, '!': 0.22, '|': 0.24, '/': 0.24, '\\': 0.24, '(': 0.26, ')': 0.26,
  '<': 0.26, '>': 0.26, '[': 0.3, ']': 0.3, '{': 0.34, '}': 0.34, x: 0.36, o: 0.36, v: 0.3, c: 0.32, i: 0.24, l: 0.26,
  '#': 0.55, '%': 0.5, '&': 0.55, $: 0.55, '@': 0.62, '0': 0.48, O: 0.48, '8': 0.55, B: 0.58, M: 0.6, W: 0.6,
}
export const ink = ch => INK[ch] ?? 0.4

// A w x h block of cells, each a glyph and the material (1..255) it belongs to; 0 is empty.
export class Grid {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.ch = new Array(w * h).fill(' ')
    this.m = new Uint8Array(w * h)
  }
  set(x, y, c, m = 1) {
    if (typeof c !== 'string') throw new Error(`no glyph for cell ${x},${y}: ${c}`)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || c === ' ') return
    this.ch[y * this.w + x] = c
    this.m[y * this.w + x] = m
  }
  // a string laid left to right from (x, y); its spaces leave the cells beneath alone
  put(x, y, str, m = 1) {
    ;[...str].forEach((c, i) => this.set(x + i, y, c, m))
  }
  at(x, y) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? ' ' : this.ch[y * this.w + x]
  }
  materials() {
    return [...new Set(this.m)].filter(Boolean).sort((a, b) => a - b)
  }
  // another grid's cells written over this one's at (x, y)
  stamp(g, x = 0, y = 0) {
    for (let r = 0; r < g.h; r++) for (let c = 0; c < g.w; c++) if (g.m[r * g.w + c]) this.set(x + c, y + r, g.ch[r * g.w + c], g.m[r * g.w + c])
    return this
  }
  map(fn) {
    const out = new Grid(this.w, this.h)
    for (let i = 0; i < this.ch.length; i++) if (this.m[i]) {
      const c = fn(this.ch[i], this.m[i], i % this.w, Math.floor(i / this.w))
      if (c && c !== ' ') { out.ch[i] = c; out.m[i] = this.m[i] }
    }
    return out
  }
  // the cells of one material (or every material) as rows of [row, first column, text]
  runs(m) {
    const out = []
    for (let r = 0; r < this.h; r++) {
      let line = ''
      for (let c = 0; c < this.w; c++) {
        const i = r * this.w + c
        line += this.m[i] && (m === undefined || this.m[i] === m) ? this.ch[i] : ' '
      }
      // a long gap splits a row: a new <text> costs less than forty spaces
      const re = /\S+(?: {1,40}\S+)*/g
      let hit
      while ((hit = re.exec(line))) out.push([r, hit.index, hit[0]])
    }
    return out
  }
}

// Outward edges, by the side of the cell the shape fills.
export const ROUND = { below: '_', above: '-', right: '(', left: ')', downRight: '/', downLeft: '\\', upRight: '\\', upLeft: '/' }
export const HARD = { ...ROUND, right: '|', left: '|' }

function edgeChar(dx, dy, set) {
  // (dx, dy): from the cell's centre toward what the shape fills, in scene units
  const a = (Math.atan2(dy, dx) * 180) / Math.PI
  if (a > 67.5 && a <= 112.5) return set.below
  if (a < -67.5 && a >= -112.5) return set.above
  if (a > -22.5 && a <= 22.5) return set.right
  if (a > 157.5 || a <= -157.5) return set.left
  if (a > 22.5 && a <= 67.5) return set.downRight
  if (a > 112.5 && a <= 157.5) return set.downLeft
  if (a < -22.5 && a >= -67.5) return set.upRight
  return set.upLeft
}

// Rasterizes a shape into a w x h grid. `sample(x, y)`, in scene units from the grid's top left, answers
// null outside the shape, or { m: material, l: level 0..1 } inside it: the level picks the glyph from `ramp`.
// With `outline`, a cell the shape only partly fills takes an edge glyph pointing along the boundary.
export function rasterize(w, h, sample, { ramp = RAMP, outline = null, min = 0.2, edge = 0.78, ss = [3, 5] } = {}) {
  const g = new Grid(w, h)
  const [sx, sy] = ss
  const n = sx * sy
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      let hits = 0, level = 0, cx = 0, cy = 0
      const counts = new Map()
      for (let j = 0; j < sy; j++) {
        for (let i = 0; i < sx; i++) {
          const ox = (i + 0.5) / sx, oy = (j + 0.5) / sy
          const s = sample((c + ox) * CW, (r + oy) * CH)
          if (!s) continue
          hits++
          level += s.l ?? 1
          cx += (ox - 0.5) * CW
          cy += (oy - 0.5) * CH
          const m = s.m ?? 1
          counts.set(m, (counts.get(m) || 0) + 1)
        }
      }
      const cover = hits / n
      if (cover < min) continue
      let m = 1, best = -1
      for (const [k, v] of counts) if (v > best) { best = v; m = k }
      const l = Number.isFinite(level) ? clamp(level / hits) : 1
      const lean = Math.hypot(cx / hits, cy / hits)
      let ch
      if (outline && cover < edge && lean > 1.2) ch = edgeChar(cx / hits, cy / hits, outline)
      else ch = ramp[Math.min(ramp.length - 1, 1 + Math.floor(clamp(outline ? l : l * Math.sqrt(cover)) * (ramp.length - 1.001)))]
      g.set(c, r, ch, m)
    }
  }
  return g
}

// The same cells with some glyphs traded for a look-alike, so two copies flickering read as live cells.
const TWIN = {
  '.': ',', ',': '.', ':': ';', ';': ':', '-': '~', '~': '-', '=': '+', '+': '=', '*': 'x', x: '*', '#': '%', '%': '#',
  '@': '&', '&': '@', o: '0', '0': 'o', "'": '`', '`': "'", '^': "'", '!': 'i', i: '!', '|': '!', l: '|',
}
export function shimmer(g, rand, p = 0.35) {
  return g.map(ch => (rand() < p && TWIN[ch] ? TWIN[ch] : ch))
}

// A grid read from text art: each line a row; `key` maps a glyph to its material (default 1), and a
// glyph listed in `blank` is left empty, so art can mark materials by stand-in glyphs.
export function art(text, { key = {}, glyph = {} } = {}) {
  const lines = text.replace(/^\n/, '').replace(/\n\s*$/, '').split('\n')
  const w = Math.max(...lines.map(l => [...l].length))
  const g = new Grid(w, lines.length)
  lines.forEach((line, r) => [...line].forEach((c, i) => {
    if (c === ' ') return
    g.set(i, r, glyph[c] ?? c, key[c] ?? 1)
  }))
  return g
}

// Mirror a grid left to right, turning the glyphs that lean.
const FLIP = { '/': '\\', '\\': '/', '(': ')', ')': '(', '<': '>', '>': '<', '[': ']', ']': '[', '{': '}', '}': '{', '`': "'", "'": '`' }
export function flip(g) {
  const out = new Grid(g.w, g.h)
  for (let r = 0; r < g.h; r++) for (let c = 0; c < g.w; c++) {
    const i = r * g.w + c
    if (g.m[i]) out.set(g.w - 1 - c, r, FLIP[g.ch[i]] ?? g.ch[i], g.m[i])
  }
  return out
}
