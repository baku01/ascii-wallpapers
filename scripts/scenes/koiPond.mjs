// Koi Pond: a jade pond from above. Koi circle under lily pads and lotus, rings spread where something
// touched the water, and petals drift across.
import { Grid, ROUND, rasterize } from '../lib/ascii.mjs'
import { CH, COLS, CW, H, ROWS, W, fbm, noise } from '../lib/core.mjs'
import { stars } from '../lib/shapes.mjs'
import { headings, loop, swim } from './_topdown.mjs'

// Lily pads along the sides and the top: [x, y, radius, notch angle, flower?]
const PADS = [
  [110, 170, 110, 0.6, true], [270, 420, 78, 2.4, false], [80, 650, 130, -0.4, false], [300, 905, 92, 1.2, true], [130, 1110, 84, 3.6, false],
  [1810, 150, 118, 2.8, false], [1650, 380, 74, 0.9, true], [1840, 610, 100, 4.2, false], [1690, 905, 124, 2.0, true], [1880, 1120, 88, 5.1, false],
  [690, 30, 62, 1.8, false], [1250, 55, 72, 4.6, true], [470, 120, 50, 3.0, false],
]

// Pad (1) with lighter veins (2); lotus petals pink (3) and white (5) round a golden heart (4).
function pond() {
  return rasterize(COLS, ROWS, (x, y) => {
    for (const [cx, cy, rad, notch, flower] of PADS) {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy)
      if (d > rad * (0.97 + 0.03 * noise(x / 20, y / 20, cx))) continue
      const a = Math.atan2(dy, dx)
      const off = Math.abs(((a - notch + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
      if (off < 0.42 * (d / rad) + 0.04 && d > rad * 0.08) return null
      if (flower) {
        const fr = rad * 0.58, t = d / fr
        if (t < 0.28) return { m: 4, l: 0.9 }
        const petal = Math.abs(Math.cos(a * 4 + cx)) ** 0.6
        if (t < petal) return { m: t > petal * 0.7 ? 5 : 3, l: 0.9 - t * 0.4 }
      }
      const vein = Math.abs(Math.sin(((a - notch) * 9) / 2)) < 0.1 && d > rad * 0.2 && d < rad * 0.86
      // lit from the top left
      const l = 0.35 + 0.45 * (1 - d / rad) ** 0.5 + 0.2 * ((-dx - dy) / (rad * 2))
      return { m: vein ? 2 : 1, l: vein ? 0.3 : l }
    }
    return null
  }, { outline: ROUND, edge: 0.7, ramp: ' .,:;~=+*' }).map((ch, m, c, r) => {
    // lotus: full petals, pale tips, a golden heart
    if (m === 3) return '_-()/\\'.includes(ch) ? ch : { '*': '@', '+': '%', '=': '%', '~': '*' }[ch] ?? '*'
    if (m === 5) return '_-()/\\'.includes(ch) ? ch : "*'"[(c + r) % 2]
    if (m === 4) return (c + r) % 2 ? 'o' : '@'
    if (m !== 2) return ch
    // a vein runs out from the pad's heart: its glyph follows it
    const x = (c + 0.5) * CW, y = (r + 0.5) * CH
    const [cx, cy] = PADS.reduce((a, b) => (Math.hypot(x - a[0], y - a[1]) - a[2] < Math.hypot(x - b[0], y - b[1]) - b[2] ? a : b))
    const a = (Math.atan2((y - cy) * (CW / CH), x - cx) * 180) / Math.PI
    const t = ((a % 180) + 180) % 180
    return t < 22 || t > 158 ? '-' : t > 68 && t < 112 ? '|' : t < 90 ? '\\' : '/'
  })
}

// A koi from above, facing +u, its body (1) patched with colour (2, 3) and its fins (4) pale. Frame f
// swings the tail.
// `frames` tail beats a cycle: the tail swings on a sine through them
function koi(seed, frames) {
  return (u, v, f) => {
    const L = 172, t = (u + L / 2) / L
    const swing = Math.cos((f / frames) * Math.PI * 2) * 9
    const bend = swing * (1 - Math.min(1, t * 1.3)) ** 1.6
    const vv = v - (t < 0 ? swing * 1.05 + (t * -1) * swing * 0.6 : bend)
    if (t >= 0 && t <= 1.02) {
      const hw = t > 0.62 ? 27 * Math.sqrt(Math.max(0, 1 - ((t - 0.62) / 0.4) ** 2)) : 27 * (0.3 + 0.7 * (t / 0.62) ** 0.8)
      if (Math.abs(vv) < hw) {
        const p = noise(u / 34 + seed, v / 22, 3)
        const m = p > 0.74 ? 3 : p > 0.46 || t > 0.9 ? 2 : 1
        return { m, l: 0.95 - 0.55 * (vv / hw) ** 2 }
      }
      // pectoral fins, just behind the head
      if (t > 0.6 && t < 0.76 && Math.abs(vv) < hw + 70 * (0.76 - t) && Math.abs(vv) > hw) return { m: 4, l: 0.3 }
      return null
    }
    // the tail fan, forked
    if (t < 0 && t > -0.34) {
      const s = -t / 0.34
      const w = 7 + 30 * s
      if (Math.abs(vv) < w && !(s > 0.6 && Math.abs(vv) < (s - 0.6) * 40)) return { m: 4, l: 0.4 }
    }
    return null
  }
}

// rings spreading where something touched the water: one ring per frame, then still water
function ring(radius) {
  const n = Math.ceil((radius * 2.2) / CW) + 2, m = Math.ceil((radius * 2.2) / CH) + 2
  const g = new Grid(n, m)
  const cx = (n * CW) / 2, cy = (m * CH) / 2
  const steps = Math.ceil(radius * 0.9) + 8
  for (let k = 0; k < steps; k++) {
    const a = (k / steps) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a)
    const x = Math.floor((cx + c * radius) / CW), y = Math.floor((cy + s * radius * 0.9) / CH)
    if (g.at(x, y) !== ' ') continue
    g.set(x, y, Math.abs(c) > 0.94 ? (c > 0 ? ')' : '(') : s < 0 ? '.' : "'")
  }
  return g
}

const VARIETIES = [
  { 1: '#fff6ee', 2: '#ff8a4c', 3: '#e2382f', 4: '#ffd9c2' }, // kohaku: white, orange and red
  { 1: '#ffd36b', 2: '#ffe7a3', 3: '#f2a33a', 4: '#fff0c6' }, // ogon: gold
  { 1: '#fdf8f2', 2: '#ef5a3a', 3: '#2b2f33', 4: '#e8eef0' }, // sanke: white, red and black
  { 1: '#ff9a52', 2: '#ffc08a', 3: '#fff3e6', 4: '#ffd6b0' }, // orange with pale saddles
]

export default {
  key: 'koiPond',
  name: 'Koi Pond',
  tone: 'dark',
  accent: '#ff7a59',
  ink: '#1f4a3c',
  alt: 'Koi circling a jade pond under lily pads and drifting petals',
  build(s) {
    const r = s.rand
    s.add(s.ground(s.radial([[0, '#0e382d'], [0.5, '#164e3f'], [0.82, '#25694f'], [1, '#2f7d64']], [W / 2, H / 2, 1150])))
    s.add(s.glow(260, 120, 700, '#bff2d6', 0.1))

    // a faint grain of ripples on the surface, sliding with the breeze
    const grain = new Grid(48, 24)
    for (let rr = 0; rr < grain.h; rr++) for (let c = 0; c < grain.w; c++) {
      const v = fbm(c / 6, rr / 3, 8)
      if (v > 0.6 && (c + rr) % 2 === 0) grain.set(c, rr, v > 0.68 ? '~' : '-')
    }
    s.add(s.move(s.tile(grain, { color: '#cdf3df', tw: 480, th: 456, opacity: 0.08, cls: 'r' }), [[0, 0], [480, 0]], 180))

    // koi, under the pads: one koi at every heading with four tail beats, each swimmer in its variety's colours
    const koiSprites = headings(s, { n: 12, frames: 4, w: 28, h: 15, shape: koi(3.1, 4) })
    const shadow = s.glow(10, 18, 110, '#06231b', 0.45)
    const swimmers = [
      { v: 0, pts: loop(420, 520, 250, 190, { tilt: 0.4, wobble: 0.2, dir: 1, seed: 1 }), dur: 52, phase: 0.1, k: 1.05 },
      { v: 1, pts: loop(1500, 640, 230, 260, { tilt: -0.3, wobble: 0.25, dir: -1, seed: 3 }), dur: 58, phase: 0.4, k: 0.95 },
      { v: 2, pts: loop(1450, 230, 300, 120, { tilt: 0.15, wobble: 0.2, dir: 1, seed: 5 }), dur: 64, phase: 0.75, k: 0.85 },
      { v: 3, pts: loop(470, 930, 260, 130, { tilt: -0.2, wobble: 0.22, dir: -1, seed: 7 }), dur: 56, phase: 0.55, k: 0.8 },
      { v: 0, pts: loop(960, 600, 620, 420, { tilt: 0.05, wobble: 0.12, dir: 1, seed: 2 }), dur: 110, phase: 0.3, k: 0.7 },
    ]
    for (const k of swimmers) {
      const paints = Object.fromEntries(Object.entries(VARIETIES[k.v]).map(([m, c]) => [m, s.solid(c)]))
      s.add(s.group([swim(s, koiSprites, paints, { pts: k.pts, dur: k.dur, phase: k.phase, beat: 1.3, w: 28, h: 15, scale: k.k, under: shadow })], { opacity: 0.95 }))
    }

    // rings spreading
    for (const [x, y, dur, phase] of [[600, 270, 7, 0], [1360, 960, 8.5, 0.4], [1520, 470, 9.5, 0.7], [380, 760, 8, 0.2]]) {
      const radii = [14, 30, 48, 68, 90]
      const rings = radii.map((rad, i) => {
        const g = ring(rad)
        return s.text(g, { x: x - (g.w * CW) / 2, y: y - (g.h * CH) / 2, paint: s.solid('#d8fbe9'), opacity: 0.7 * (1 - i / radii.length) + 0.1, cls: 'r' })
      })
      s.add(s.frames([...rings, s.raw(''), s.raw(''), s.raw(''), s.raw('')], dur, phase))
    }

    // pads and lotus on top, each casting a soft shadow
    for (const [cx, cy, rad] of PADS) s.add(s.glow(cx + 16, cy + 22, rad * 1.35, '#05241b', 0.4))
    const pads = pond()
    const padPaint = s.linear([[0, '#7cc77a'], [0.5, '#4f9a57'], [1, '#2f7344']], [0, 0, W * 0.2, H])
    s.add(s.text(pads, { m: 1, paint: padPaint }))
    s.add(s.text(pads, { m: 2, paint: s.solid('#a8e39a'), opacity: 0.8 }))
    s.add(s.text(pads, { m: 3, paint: s.solid('#ff9ec4') }))
    s.add(s.text(pads, { m: 5, paint: s.solid('#fff1f6') }))
    s.add(s.text(pads, { m: 4, paint: s.solid('#ffd86b') }))

    // drops of light on the water
    stars(r, 40, (x, y) => !PADS.some(([cx, cy, rad]) => Math.hypot(x - cx, y - cy) < rad + 10), { groups: 2, glyphs: "'.*" })
      .forEach((g, i) => s.add(s.twinkle(s.text(g, { paint: s.solid('#e9fff3'), opacity: 0.6 }), 0, 4 + i * 1.7, i * 0.4)))

    // petals drifting over everything, tumbling
    for (let i = 0; i < 9; i++) {
      const tumble = s.frames([',', "'", '`', '*'].map(ch => {
        const g = new Grid(1, 1)
        g.set(0, 0, ch)
        return s.text(g, { paint: s.solid(i % 3 ? '#ffb3cf' : '#ffe1ec') })
      }), 1.6 + (i % 3) * 0.5, r())
      const y0 = -40 + r() * 500, x0 = -60 + r() * 900
      const drift = s.sway(tumble, 0, 30, 6 + r() * 4, r())
      s.add(s.move(drift, [[x0, y0], [x0 + 1500, y0 + 900]], 70 + r() * 50, { phase: r() }))
    }
  },
}
