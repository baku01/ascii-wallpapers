// Pieces several scenes share: scattered specks, starfields and thin lines drawn in glyphs.
import { Grid } from './ascii.mjs'
import { CH, COLS, CW, ROWS } from './core.mjs'

// A tile of cols x rows cells with `count` glyphs scattered over it (no two in one cell).
export function specks(rand, cols, rows, count, glyphs = '.') {
  const g = new Grid(cols, rows)
  for (let k = 0; k < count; k++) g.set(Math.floor(rand() * cols), Math.floor(rand() * rows), glyphs[Math.floor(rand() * glyphs.length)])
  return g
}

// Stars over the scene's cells where `where(x, y)` (scene units) holds, split into `groups` grids so each
// can twinkle on its own clock.
export function stars(rand, count, where, { groups = 3, glyphs = "..'+*" } = {}) {
  const out = Array.from({ length: groups }, () => new Grid(COLS, ROWS))
  let placed = 0, tries = 0
  while (placed < count && tries++ < count * 50) {
    const c = Math.floor(rand() * COLS), r = Math.floor(rand() * ROWS)
    if (!where((c + 0.5) * CW, (r + 0.5) * CH)) continue
    out[placed % groups].set(c, r, glyphs[Math.floor(rand() * rand() * glyphs.length)])
    placed++
  }
  return out
}

// A line of cells through points given in cells, each cell's glyph chosen by the line's slope there,
// thinning to `tail` glyphs over its last cells.
export function strand(g, pts, { m = 1, glyphs = { flat: '-', steep: '|', down: '\\', up: '/' }, tail = '', thin = 0 } = {}) {
  const cells = []
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))))
    for (let k = 0; k < n; k++) {
      const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t
      // slope in screen units: a cell is nearly twice as tall as it is wide
      const sx = (x1 - x0) * CW, sy = (y1 - y0) * CH
      const a = Math.abs((Math.atan2(sy, sx) * 180) / Math.PI)
      let ch = a < 25 || a > 155 ? glyphs.flat : a > 70 && a < 110 ? glyphs.steep : (sx > 0) === (sy > 0) ? glyphs.down : glyphs.up
      cells.push([Math.round(x), Math.round(y), ch])
    }
  }
  const seen = new Set()
  const uniq = cells.filter(([x, y]) => !seen.has(`${x},${y}`) && seen.add(`${x},${y}`))
  uniq.forEach(([x, y, ch], i) => {
    const left = uniq.length - 1 - i
    if (left < tail.length) ch = tail[tail.length - 1 - left]
    else if (thin && i % thin === thin - 1) ch = ch === glyphs.steep ? ':' : ch
    g.set(x, y, ch, m)
  })
  return g
}
