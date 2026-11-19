// Paper Boats: origami boats drifting on a calm lake at dusk, wakes and reflections behind them.
import { Grid, ROUND, rasterize } from '../lib/ascii.mjs'
import { CH, COLS, CW, H, W, fbm, lerp } from '../lib/core.mjs'
import { stars } from '../lib/shapes.mjs'

const HORIZON = Math.round((H * 0.34) / CH) * CH
const BW = 32, BH = 9

// A paper boat seen from the side, drawn cell by cell: the sail's lit half (1) and folded shadow (2),
// the hull's middle panel (3) and its folded-back flaps (4).
function boat() {
  const g = new Grid(BW, BH)
  const mid = BW / 2
  // the sail, widening two cells a row so it sits broad on the deck
  for (let y = 0; y <= 5; y++) {
    const l = mid - 1 - y * 2, r = mid + y * 2
    g.set(l, y, '/', 2)
    g.set(r, y, '\\', 1)
    for (let x = l + 1; x < r; x++) g.set(x, y, x < mid ? ':' : '=', x < mid ? 2 : 1)
  }
  // the deck line either side of the sail
  for (let x = 1; x < BW - 1; x++) if (x < mid - 11 || x > mid + 10) g.set(x, 5, '_', 3)
  // the hull narrowing to its keel, two folds running down from the sail's corners
  for (let y = 6; y < BH; y++) {
    const k = y - 5, left = k, right = BW - 1 - k
    const fl = mid - 11 + k * 2, fr = mid + 10 - k * 2
    g.set(left, y, '\\', 4)
    g.set(right, y, '/', 4)
    for (let x = left + 1; x < right; x++) {
      if (y === BH - 1) g.set(x, y, '_', 4)
      else if (x === fl) g.set(x, y, '\\', 3)
      else if (x === fr) g.set(x, y, '/', 3)
      else if (x > fl && x < fr) g.set(x, y, '=', 3)
      else g.set(x, y, ':', 4)
    }
  }
  return g
}

// The same grid upside down, as the water shows it, each row nudged a little by ripples.
const VFLIP = { '/': '\\', '\\': '/', _: '-', '-': '_', "'": '.', '.': "'" }
function reflect(g) {
  const out = new Grid(g.w + 2, g.h)
  for (let r = 0; r < g.h; r++) {
    const nudge = r % 3 === 1 ? 1 : r % 3 === 2 ? -1 : 0
    for (let c = 0; c < g.w; c++) {
      const i = (g.h - 1 - r) * g.w + c
      if (g.m[i]) out.set(c + 1 + nudge, r, VFLIP[g.ch[i]] ?? g.ch[i], g.m[i])
    }
  }
  return out
}

// The wake trailing to the left of a boat moving right: ripples spreading and thinning with distance.
function wake() {
  const g = new Grid(40, 3)
  for (let c = 0; c < 40; c++) {
    const far = 1 - c / 40
    if ((c * 7) % 5 < 4 - far * 2) g.set(c, 0, c % 4 === 0 ? '-' : '~')
    if (c > 8 && (c * 3) % 7 < 3 - far * 2) g.set(c, 1, '~')
    if (c > 20 && c % 5 === 0) g.set(c, 2, '-')
  }
  return g
}

// The lake in one shimmer frame: ripple marks, finer and denser toward the horizon, longer near by;
// under the afterglow they turn to the sky's colour (2).
// frame f of `n`: the noise is read around a circle, so the last frame runs into the first
function water(f, glintX, n) {
  const a = (f / n) * Math.PI * 2, ox = Math.cos(a) * 0.9, oy = Math.sin(a) * 0.9
  const rows = Math.ceil((H - HORIZON) / CH)
  const g = new Grid(COLS, rows)
  for (let r = 0; r < rows; r++) {
    const z = r / rows
    const glyphs = z < 0.2 ? '-.-' : z < 0.55 ? '~-~' : '~-~_~'
    const scale = lerp(3, 10, z)
    for (let c = 0; c < COLS; c++) {
      const n = fbm(c / scale + ox, r * 0.8 + oy * 0.15, 17, 2)
      const near = Math.abs(c * CW - glintX) < 40 + z * 170
      const p = near ? 0.44 : lerp(0.6, 0.69, z)
      if (n > p) g.set(c, r, glyphs[Math.floor(fbm(c / 2.3 + ox, r * 1.7 + oy, 29, 1) * glyphs.length * 0.999)], near ? 2 : 1)
    }
  }
  return g
}

export default {
  key: 'paperBoats',
  name: 'Paper Boats',
  tone: 'dark',
  accent: '#f6f7f2',
  ink: '#1d4a4f',
  alt: 'Origami boats drifting on a calm lake at dusk, ripples spreading behind them',
  build(s) {
    const r = s.rand
    const h0 = HORIZON / H
    s.add(s.ground(s.linear([
      [0, '#0b2630'], [h0 * 0.5, '#173f4a'], [h0 * 0.85, '#527679'], [h0 - 0.002, '#d6a681'],
      [h0 + 0.004, '#4a7b79'], [0.55, '#255458'], [0.8, '#163c41'], [1, '#0c272b'],
    ], [0, 0, 0, H])))
    // the afterglow low over the far shore, and its light on the water
    const gx = 1330
    s.add(s.glow(gx, HORIZON, 640, '#ffbf8a', 0.32), s.glow(gx, HORIZON, 180, '#ffe2c4', 0.45))
    for (let k = 1; k <= 4; k++) s.add(s.glow(gx, HORIZON + k * 140, 120 + k * 40, '#ffcf9f', 0.16 - k * 0.025))
    stars(r, 40, (x, y) => y < HORIZON * 0.55, { glyphs: "..'+" }).forEach((g, i) => {
      s.add(s.twinkle(s.text(g, { paint: s.solid('#d8ece9'), opacity: 0.45, cls: 'r' }), 0.15, 5 + i * 2, i * 0.3))
    })

    // the far shore: low hills in shadow, treetops catching the last light, and their shape in the water
    const ridge = x => HORIZON - 40 - (1 - fbm(x / 420, 2.2, 3, 3)) * 120 - Math.max(0, 1 - Math.abs(x - 420) / 300) * 50 - (fbm(x / 16, 7.7, 4, 2) - 0.5) * 18
    const line = Array.from({ length: 97 }, (_, i) => `${i * 20},${Math.round(ridge(i * 20))}`).join(' ')
    const shore = s.linear([[0, '#1f4b4f'], [1, '#143a3e']], [0, HORIZON - 200, 0, HORIZON])
    s.add(s.raw(`<polygon points="0,${HORIZON} ${line} ${W},${HORIZON}" fill="${shore.ref}"/>`, [
      { k: 'paint', paint: { at: (x, y) => (y < ridge(x) || y > HORIZON ? [0, 0, 0, 0] : shore.at(x, y)) } },
    ]))
    const mirrorLine = Array.from({ length: 97 }, (_, i) => `${i * 20},${Math.round(2 * HORIZON - ridge(i * 20))}`).join(' ')
    s.add(s.raw(`<polygon points="0,${HORIZON} ${mirrorLine} ${W},${HORIZON}" fill="${s.linear([[0, '#1f4b4f', 0.55], [1, '#1f4b4f', 0]], [0, HORIZON, 0, HORIZON + 200]).ref}"/>`))
    const hillRows = 12, hillTop = HORIZON - hillRows * CH
    const tops = rasterize(COLS, hillRows, (x, y) => {
      const e = ridge(x) - hillTop
      if (y < e || y > e + 34) return null
      return { l: 0.3 + 0.5 * fbm(x / 20, y / 14, 5, 2) }
    }, { outline: ROUND, ramp: " .,:;+*", min: 0.25 })
    s.add(s.text(tops, { y: hillTop, paint: s.linear([[0, '#5f8f86'], [1, '#2b5a5a']], [0, 0, 0, hillRows * CH]), opacity: 0.8 }))

    // the lake's ripples, shimmering through six frames
    const rows = Math.ceil((H - HORIZON) / CH)
    const ripple = s.linear([[0, '#9fd0cb', 0.6], [0.5, '#6aa9a6', 0.45], [1, '#4d8f8f', 0.35]], [0, 0, 0, rows * CH])
    const glint = s.linear([[0, '#ffe1c2', 0.9], [1, '#ffc79a', 0.35]], [0, 0, 0, rows * CH])
    const frames = [0, 1, 2, 3, 4, 5].map(f => {
      const g = water(f, gx, 6)
      return s.group([s.text(g, { m: 1, paint: ripple, cls: 'r' }), s.text(g, { m: 2, paint: glint })])
    })
    s.add(s.group([s.frames(frames, 6)], { y: HORIZON }))

    // the boats: one shape, every boat a copy; nearer ones bigger, lower and brighter
    const hull = s.sprite(boat()), mirror = s.sprite(reflect(boat())), trail = s.sprite(wake())
    const foam = s.linear([[0, '#cfeee8', 0], [1, '#cfeee8', 0.7]], [0, 0, 40 * CW, 0])
    const BOATS = [
      { y: 470, scale: 0.36, dur: 360, phase: 0.62, a: 0.65 },
      { y: 520, scale: 0.48, dur: 320, phase: 0.9, a: 0.75 },
      { y: 640, scale: 0.66, dur: 270, phase: 0.38, a: 0.85 },
      { y: 820, scale: 0.92, dur: 230, phase: 0.76, a: 1 },
      { y: 940, scale: 1.15, dur: 210, phase: 0.12, a: 1 },
    ]
    for (const b of BOATS) {
      const lit = {
        1: s.linear([[0, '#fffdf6'], [1, '#f1e8d3']], [0, 0, 0, 6 * CH]),
        2: s.linear([[0, '#d4c7ad'], [1, '#b3a488']], [0, 0, 0, 6 * CH]),
        3: s.solid('#f4ecda'),
        4: s.solid('#bfb196'),
      }
      const dim = Object.fromEntries([1, 2, 3, 4].map(m => [m, s.solid(['#d6ece6', '#a9c5c0', '#c7dfda', '#86a7a3'][m - 1])]))
      const waterline = BH * CH - 6
      const bob = 4.2 + b.scale * 1.5
      const parts = s.group([
        s.group([trail({ 1: foam })], { x: -38 * CW, y: waterline - CH }),
        s.sway(s.group([mirror(dim)], { y: waterline + 2, opacity: 0.3 }), 0, -5, bob, b.phase),
        s.sway(hull(lit), 0, 5, bob, b.phase),
      ])
      const scaled = s.scale(parts, b.scale)
      const top = b.y - waterline * b.scale
      s.add(s.group([s.move(scaled, [[-400, top], [W + 120, top]], b.dur, { phase: b.phase })], { opacity: b.a }))
    }
  },
}
