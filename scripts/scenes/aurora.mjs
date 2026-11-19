// Aurora: green and violet curtains of light rippling over snowy mountains on a polar night.
import { Grid, ROUND, rasterize } from '../lib/ascii.mjs'
import { CH, COLS, CW, H, W, clamp, fbm, noise, smooth } from '../lib/core.mjs'
import { stars } from '../lib/shapes.mjs'

const FRAMES = 4
// faint to bright, the bright end standing like rays
const RAYS = " .':;!|"

// The curtains in frame f: rays hanging up from slow wavy hems, brightest along the hem, each column's
// ray its own height so the light stands in folds.
function curtains(f, rows) {
  const t = (f / FRAMES) * Math.PI * 2
  const ribbons = [
    { y: 470, a: 95, k: 0.0029, p: 0.6, h: 300, w: 1, from: -200, to: 1150 },
    { y: 330, a: 80, k: 0.0033, p: 2.4, h: 250, w: 0.9, from: 900, to: 2150 },
    { y: 250, a: 40, k: 0.005, p: 4.2, h: 150, w: 0.55, from: 300, to: 1500 },
  ]
  return rasterize(COLS, rows, (x, y) => {
    let best = 0
    for (const [i, rb] of ribbons.entries()) {
      if (x < rb.from || x > rb.to) continue
      const edge = smooth(rb.from, rb.from + 300, x) * (1 - smooth(rb.to - 300, rb.to, x))
      const hem = rb.y + Math.sin(x * rb.k + rb.p + t * 0.5) * rb.a + Math.sin(x * rb.k * 3.1 + t + i) * rb.a * 0.22
      // folds drift along the curtain from frame to frame
      const fold = 0.6 * noise(x * 0.07 - f * 0.6 + i * 9, i, 3) + 0.4 * noise(x * 0.012 - f * 0.15, i, 4)
      const height = rb.h * (0.5 + 0.8 * fold)
      const up = (hem - y) / height
      if (up < -0.05 || up > 1) continue
      const v = (up < 0 ? 1 + up * 14 : (1 - up) ** 1.35) * (0.45 + 0.55 * fold) * rb.w * edge
      best = Math.max(best, v)
    }
    return best > 0.13 ? { l: clamp(best * 1.2) } : null
  }, { ramp: RAYS, min: 0.15 })
}

// A ridge line across the scene: peaks [x, top, half width] rising from `base`.
function ridgeOf(seed, base, peaks) {
  return x => {
    let y = base
    for (const [px, py, w] of peaks) {
      const d = Math.abs(x - px) / w
      if (d < 1) y = Math.min(y, py + (base - py) * (d ** 1.15))
    }
    return y + (fbm(x * 0.012, 1, seed, 3) - 0.5) * 34
  }
}

// A mountain range: a filled silhouette, rock texture lit from the upper left (2), snow on the peaks (3).
function range(s, seed, base, peaks, { body, rock, snow, opacity = 1 }) {
  const ridge = ridgeOf(seed, base, peaks)
  const top = Math.min(...peaks.map(p => p[1])) - 30
  const rows = Math.ceil((H - top) / CH)
  const d = ['M-20 ' + H]
  for (let x = -20; x <= W + 20; x += 12) d.push(`L${x} ${Math.round(ridge(x))}`)
  d.push(`L${W + 20} ${H}Z`)
  const fill = s.linear(body, [0, top, 0, H])
  const shape = new Grid(COLS, rows)
  const peakAt = x => peaks.reduce((best, [px, py, w]) => (Math.abs(x - px) < w ? Math.min(best, py) : best), base)
  const lit = x => (ridge(x + 8) - ridge(x - 8) > 0 ? 0.25 : 0.8)
  // snow, outlined where it meets the sky
  const snowy = rasterize(COLS, rows, (x, y) => {
    y += top
    const r = ridge(x), peak = peakAt(x)
    const snowline = peak + (base - peak) * (0.28 + 0.2 * noise(x * 0.02, 0, seed + 2))
    if (y < r - 2 || y > snowline || y - r > 120) return null
    return { m: 3, l: lit(x) + 0.2 * noise(x * 0.08, y * 0.05, seed) }
  }, { outline: ROUND, ramp: " .:'=+*#%" })
  // the rock below it: sparse strata, faint
  const g = rasterize(COLS, rows, (x, y) => {
    y += top
    if (y < ridge(x) + 30) return null
    const grain = noise(x * 0.05, y * 0.11, seed + 5) * noise(x * 0.013, y * 0.02, seed + 6)
    return grain > 0.36 ? { m: 2, l: lit(x) * 0.5 } : null
  }, { ramp: " .':-", min: 0.4 }).stamp(snowy)
  for (let c = 0; c < COLS; c++) for (let rr = 0; rr < rows; rr++) if (rr * CH + top > ridge(c * CW + 5)) shape.set(c, rr, '@')
  const silhouette = s.raw(`<path d="${d.join('')}" fill="${fill.ref}"/>`, [{ k: 'cells', grid: shape, x: 0, y: top, paint: fill, a: 1, ox: 0, oy: 0 }])
  return s.group([
    silhouette,
    s.text(g, { y: top, m: 2, paint: s.linear(rock, [0, top, 0, H]), cls: 'r', opacity: 0.7 }),
    s.text(g, { y: top, m: 3, paint: s.linear(snow, [0, top, 0, base]) }),
  ], { opacity })
}

// A pine as a filled silhouette with tiers of boughs, snow along their upper edges.
function pine(s, x0, h, paints) {
  const w = Math.ceil((h * 0.5) / CW) * 2 + 1, rows = Math.ceil(h / CH)
  const cx = (w * CW) / 2
  const half = y => {
    const t = y / h
    if (t > 0.93) return 6
    const tier = (t * 5.5) % 1
    return (0.06 + t * 0.4) * h * (0.6 + 0.4 * tier)
  }
  const d = [`M${cx} 0`]
  for (let y = 0; y <= h; y += 6) d.push(`L${(cx + half(y)).toFixed(0)} ${y}`)
  for (let y = h; y >= 0; y -= 6) d.push(`L${(cx - half(y)).toFixed(0)} ${y}`)
  const g = rasterize(w, rows, (x, y) => {
    if (Math.abs(x - cx) > half(y)) return null
    const tier = ((y / h) * 5.5) % 1
    if (tier < 0.18 && y > h * 0.06 && y < h * 0.9) return { m: 3, l: 0.8 }
    return noise(x * 0.12, y * 0.1, 3) > 0.5 ? { m: 1, l: 0.3 } : null
  }, { ramp: ' .:-=+', min: 0.3 })
  const y0 = H - h + 4
  const shape = new Grid(w, rows)
  for (let c = 0; c < w; c++) for (let r = 0; r < rows; r++) if (Math.abs((c + 0.5) * CW - cx) < half((r + 0.5) * CH)) shape.set(c, r, '@')
  return s.group([
    s.raw(`<path d="${d.join('')}Z" fill="${paints.body.ref}"/>`, [{ k: 'cells', grid: shape, x: 0, y: 0, paint: paints.body, a: 1, ox: 0, oy: 0 }]),
    s.text(g, { m: 1, paint: paints.needles, cls: 'r' }),
    s.text(g, { m: 3, paint: paints.snow }),
  ], { x: x0, y: y0 })
}

export default {
  key: 'aurora',
  name: 'Aurora',
  tone: 'dark',
  accent: '#5dffb0',
  ink: '#0b2230',
  alt: 'Green and violet aurora rippling over snowy mountains, stars twinkling',
  build(s) {
    const r = s.rand
    s.add(s.ground(s.linear([[0, '#030a14'], [0.5, '#081a26'], [1, '#0d2533']], [0, 0, 0, H])))

    // stars, each group twinkling on its own clock
    const sky = stars(r, 260, (x, y) => y < 760 - 120 * noise(x * 0.004, 0, 5), { groups: 4, glyphs: "..'.+*" })
    sky.forEach((g, i) => s.add(s.twinkle(s.text(g, { paint: s.solid(i % 2 ? '#dcecff' : '#bfe9ff'), cls: 'r', opacity: 0.8 }), 0.25, 3.5 + i * 1.7, i * 0.31)))

    // the aurora's glow, breathing behind the curtains
    s.add(s.twinkle(s.group([
      s.glow(560, 380, 520, '#3ddc97', 0.2),
      s.glow(1400, 300, 560, '#3ad1c9', 0.16),
      s.glow(1100, 160, 420, '#8f6bff', 0.12),
    ]), 0.6, 14))

    const rows = Math.ceil(620 / CH)
    const paint = s.linear([[0, '#a07bff', 0.55], [0.35, '#7f9bff', 0.8], [0.6, '#3ad1c9'], [0.85, '#5dffb0'], [1, '#b8ffd9']], [0, 60, 0, 520])
    const waves = Array.from({ length: FRAMES }, (_, f) => s.text(curtains(f, rows), { paint }))
    s.add(s.sway(s.frames(waves, 7.2), 24, 0, 23))

    // the far range, misty, and the near one
    s.add(range(s, 11, 1010, [[230, 640, 430], [760, 730, 360], [1210, 680, 420], [1700, 610, 470]], {
      body: [[0, '#1d3247'], [1, '#13253a']], rock: [[0, '#4c6a86'], [1, '#2a4158']], snow: [[0, '#cfe2f3'], [1, '#7894ad']], opacity: 0.85,
    }))
    s.add(range(s, 23, 1070, [[40, 720, 520], [560, 860, 330], [1450, 820, 420], [1930, 690, 520]], {
      body: [[0, '#14243a'], [1, '#0a1626']], rock: [[0, '#3d5874'], [1, '#1c2c40']], snow: [[0, '#f4f9ff'], [1, '#a5bfd6']],
    }))

    // the frozen lake at their feet, catching the aurora's light
    const ice = s.linear([[0, '#10283a'], [1, '#06121c']], [0, 1050, 0, H])
    const iceShape = new Grid(COLS, 8)
    for (let c = 0; c < COLS; c++) for (let rr = 0; rr < 8; rr++) iceShape.set(c, rr, '@')
    s.add(s.raw(`<rect y="1050" width="${W}" height="${H - 1050}" fill="${ice.ref}"/>`, [{ k: 'cells', grid: iceShape, x: 0, y: 1050, paint: ice, a: 1, ox: 0, oy: 0 }]))
    s.add(s.glow(560, 1080, 460, '#3ddc97', 0.14), s.glow(1450, 1070, 380, '#3ad1c9', 0.1))
    const lake = new Grid(COLS, 8)
    for (let i = 0; i < 300; i++) {
      const c = Math.floor(r() * COLS), row = Math.floor(r() * 8)
      lake.set(c, row, r() < 0.6 ? '-' : r() < 0.5 ? '~' : '_')
    }
    // the curtains' reflection: a few streaks under the brightest folds
    for (let i = 0; i < 90; i++) {
      const c = Math.floor(r() * COLS), row = Math.floor(r() * 3)
      if (noise(c * 0.07, 0, 3) > 0.45) lake.set(c, row, r() < 0.5 ? '|' : ':')
    }
    s.add(s.twinkle(s.text(lake, { y: 1052, paint: s.linear([[0, '#5dffb0', 0.6], [1, '#3ad1c9', 0.12]], [0, 0, 0, 150]), cls: 'r', opacity: 0.55 }), 0.45, 9, 0.2))

    // pines at the corners, darkest of all
    const paints = { body: s.linear([[0, '#08131b'], [1, '#03080c']], [0, 0, 0, 380]), needles: s.solid('#1f3b46'), snow: s.solid('#d9eaf7') }
    for (const [x, h] of [[-60, 360], [60, 250], [170, 190], [1700, 300], [1810, 380], [1620, 200]].sort((a, b) => a[1] - b[1])) s.add(pine(s, x, h, paints))
  },
}
