// Honu Lagoon: a turquoise lagoon from above. Caustic light ripples over sand and reef; sea turtles paddle
// slow loops, a manta glides through and small fish cross in schools.
import { Grid, rasterize } from '../lib/ascii.mjs'
import { CH, COLS, CW, H, ROWS, W, fbm, noise, smooth } from '../lib/core.mjs'
import { stars } from '../lib/shapes.mjs'
import { headings, loop, swim } from './_topdown.mjs'

// A tile of caustic light: the contour lines of a pattern that repeats every tw x th, so it slides seamlessly.
function caustic(tw, th, k, seed) {
  const g = new Grid(tw / CW, th / CH)
  for (let r = 0; r < g.h; r++) for (let c = 0; c < g.w; c++) {
    const x = ((c + 0.5) * CW) / tw, y = ((r + 0.5) * CH) / th
    const f = Math.sin(Math.PI * 2 * (k * x + 0.45 * Math.sin(Math.PI * 2 * (y + seed))))
      + Math.sin(Math.PI * 2 * (k * y + 0.4 * Math.sin(Math.PI * 2 * (2 * x + seed))))
    const v = Math.abs(f)
    if (v < 0.22) g.set(c, r, v < 0.08 ? '~' : '-~.'[(c + r * 3) % 3])
    else if (v < 0.3 && (c * 7 + r * 13) % 5 === 0) g.set(c, r, "'")
  }
  return g
}

// Reef along the lagoon's edges, drawn once: separate coral heads on a sparse rock bed.
const REEFS = [[70, 230, 190], [40, 760, 220], [300, 1150, 160], [1860, 260, 210], [1700, 1080, 190], [1910, 720, 150], [560, -10, 120]]
// pink (1), orange (2), yellow (3), violet (4), rock (5)
function head(kind, rad, rand) {
  const w = Math.ceil((rad * 2) / CW) + 2, h = Math.ceil((rad * 2) / CH) + 2
  const cx = (w * CW) / 2, cy = (h * CH) / 2
  const seed = rand() * 100
  if (kind === 'branch') {
    // staghorn: forked arms out from a root
    const g = new Grid(w, h)
    const m = rand() < 0.5 ? 4 : 2
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5
      for (let t = 0.2; t < 1; t += 0.12) {
        const bend = Math.sin(t * 3 + k) * 0.25
        const x = Math.round((cx + Math.cos(a + bend) * rad * t) / CW), y = Math.round((cy + Math.sin(a + bend) * rad * t) / CH)
        g.set(x, y, t > 0.85 ? 'y' : t > 0.55 && rand() < 0.4 ? 'Y' : Math.abs(Math.cos(a)) > 0.7 ? '-' : Math.abs(Math.sin(a)) > 0.9 ? '|' : Math.cos(a) * Math.sin(a) > 0 ? '\\' : '/', m)
      }
    }
    g.set(Math.floor(cx / CW), Math.floor(cy / CH), 'Y', m)
    return g
  }
  return rasterize(w, h, (x, y) => {
    const d = Math.hypot(x - cx, y - cy) / (rad * (0.82 + 0.18 * noise(x / 30, y / 30, seed)))
    if (d > 1) return null
    if (kind === 'brain') return { m: 3, l: Math.abs(noise(x / 16, y / 16, seed) - 0.5) < 0.09 ? 0.15 : 0.85 - d * 0.3 }
    if (kind === 'table') return { m: 2, l: 0.35 + 0.3 * (1 - d) }
    // anemone: a bright mouth, tentacles in rings
    return { m: 1, l: d < 0.25 ? 1 : (d * 6) % 1 < 0.5 ? 0.7 : 0.4 }
  }, { outline: { below: '_', above: '~', right: '(', left: ')', downRight: '/', downLeft: '\\', upRight: '\\', upLeft: '/' }, edge: 0.6 })
    .map((ch, m) => (m === 1 ? ({ '@': 'o', '%': '*', '#': '*', '*': '*', '+': '"', '=': '"' }[ch] ?? ch) : m === 3 ? ({ '.': '~', ':': '~', '-': '~' }[ch] ?? ch) : ch))
}
function reef(rand) {
  const g = new Grid(COLS, ROWS)
  for (const [cx, cy, rad] of REEFS) {
    // the rock bed: rough, sparse, dark
    for (let r = Math.floor((cy - rad) / CH); r <= (cy + rad) / CH; r++) for (let c = Math.floor((cx - rad) / CW); c <= (cx + rad) / CW; c++) {
      const x = (c + 0.5) * CW, y = (r + 0.5) * CH
      const d = Math.hypot(x - cx, (y - cy) * 1.1) / rad
      if (d < 0.6 + 0.4 * fbm(x / 60, y / 60, cx) && rand() < 0.55) g.set(c, r, rand() < 0.3 ? '%' : '.:;'[Math.floor(rand() * 3)], 5)
    }
    // coral heads on it, a little apart
    const placed = []
    for (let t = 0; t < 40 && placed.length < rad / 24; t++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * rad * 0.85
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.9, size = 26 + rand() * 30
      if (placed.some(([px, py, ps]) => Math.hypot(px - x, py - y) < (ps + size) * 0.9)) continue
      placed.push([x, y, size])
      const kind = ['brain', 'branch', 'table', 'anemone', 'branch'][Math.floor(rand() * 5)]
      const hg = head(kind, size, rand)
      g.stamp(hg, Math.round((x - (hg.w * CW) / 2) / CW), Math.round((y - (hg.h * CH) / 2) / CH))
    }
  }
  return g
}

function sand(rand) {
  return rasterize(COLS, ROWS, (x, y) => {
    const d = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H * 0.55))
    const shallow = smooth(0.8, 1.3, d) * (0.4 + 0.8 * fbm(x / 160, y / 160, 21))
    return shallow > 0.3 && rand() < shallow * 0.55 ? { l: shallow * 0.6 } : null
  }, { ramp: " .,'`:" })
}

// seagrass: little beds of wavy blades, the wave travelling between two frames
const BEDS = [[20, 5], [27, 21], [9, 30], [21, 50], [40, 59], [168, 9], [177, 23], [160, 52], [184, 46], [148, 61], [13, 14], [186, 33]]
function grass(f) {
  const g = new Grid(COLS, ROWS)
  BEDS.forEach(([c, r], i) => {
    for (let k = 0; k < 3; k++) {
      const len = 3 + ((i + k) % 3)
      for (let j = 0; j < len; j++) g.set(c + j + (k % 2), r + k, j === len - 1 ? '.' : '~-'[(j + k + f) % 2], 1)
    }
  })
  return g
}

// A sea turtle from above, facing +u: shell (1), head and flippers (2). Frame f paddles.
function turtle(u, v, f) {
  const d = Math.hypot(u / 78, v / 62)
  if (d < 1) {
    let l = 0.95 - 0.35 * d
    if (d > 0.76 && d < 0.88) l = 0.22
    else if (d < 0.76 && (Math.abs(u - 24) < 3.5 || Math.abs(u + 20) < 3.5)) l = 0.3
    return { m: 1, l }
  }
  if (((u - 100) / 24) ** 2 + (v / 18) ** 2 < 1 || (u > 70 && u < 90 && Math.abs(v) < 12)) return { m: 2, l: 0.8 }
  if (u < -74 && u > -96 && Math.abs(v) < 5 - (-74 - u) * 0.2) return { m: 2, l: 0.4 }
  for (const s of [-1, 1]) {
    // front flippers sweep from reaching forward to pulled back
    for (const [ru, rv, deg, len, wid] of [[38, 50, f ? 108 : 52, 82, 17], [-56, 38, f ? 128 : 152, 34, 12]]) {
      const a = (deg * Math.PI) / 180, du = u - ru, dv = v - s * rv
      const along = du * Math.cos(a) + dv * s * Math.sin(a)
      const across = -du * Math.sin(a) + dv * s * Math.cos(a)
      if (along > -4 && along < len && Math.abs(across) < wid * (1 - along / (len * 1.25))) return { m: 2, l: 0.55 }
    }
  }
  return null
}
const SKIN = { '.': '.', ':': ':', '-': '-', '=': '=', '+': '=', '*': 'o', '#': 'O', '%': 'O', '@': 'O' }

// A manta from above, heading left: dark back (1), pale shoulders (2), the tail a thin line (3).
// Crescent wings: the leading edge bows forward, the trailing edge hollows, the tips sweep back.
function manta(f) {
  const span = 150 * [1, 0.9, 0.78, 0.9][f], sweep = [22, 26, 32, 26][f]
  const w = 34, h = 17, cx = 120, cy = (h * CH) / 2
  return rasterize(w, h, (x, y) => {
    const u = cx - x, v = y - cy, t = Math.abs(v) / span
    if (u < -50 && u > -200 && Math.abs(v) < 3.5) return { m: 3, l: 0.2 }
    if (u > 46 && u < 70 && Math.abs(Math.abs(v) - 19) < 6) return { m: 1, l: 0.7 }
    if (t > 1) return null
    const lead = 52 * (1 - t ** 1.7) - sweep * t * t
    const trail = -56 * (1 - t) ** 1.3 - sweep * t
    if (u > lead || u < trail) return null
    const shoulder = t > 0.16 && t < 0.4 && u > 4 && u < 34
    return { m: shoulder ? 2 : 1, l: 0.95 - 0.6 * t }
  }, { outline: { below: '_', above: '-', right: '(', left: ')', downRight: '/', downLeft: '\\', upRight: '\\', upLeft: '/' }, edge: 0.7 })
    .map((ch, m) => (m === 3 ? '-' : ch))
}

const SCHOOL = [[0, 0], [5, 1], [2, 2], [8, 2], [4, 3], [10, 0], [1, 4]]
function school(right, f, big) {
  const g = new Grid(16, 6)
  const fish = big ? (right ? ["><(((('>", "}<(((('>"] : ["<'))))><", "<'))))>{"]) : right ? ['><>', '}<>'] : ['<><', '<>{']
  SCHOOL.slice(0, big ? 3 : 7).forEach(([c, r], i) => g.put(big ? c % 8 : c, big ? r * 2 : r, fish[(f + i) % 2]))
  return g
}

export default {
  key: 'honu',
  name: 'Honu Lagoon',
  tone: 'dark',
  accent: '#2dd4bf',
  ink: '#0b4f5c',
  alt: 'A turquoise lagoon from above, sea turtles, a manta and fish swimming in ASCII cells',
  build(s) {
    const r = s.rand
    s.add(s.ground(s.radial([[0, '#0a4d68'], [0.36, '#0c6683'], [0.62, '#16929f'], [0.82, '#2fbeb8'], [1, '#5fdfcd']], [W / 2, H / 2, 1180])))
    s.add(s.text(sand(r), { paint: s.solid('#fbeec4'), opacity: 0.45, cls: 'r' }))

    // caustic light, two nets drifting across each other
    const net1 = s.tile(caustic(480, 380, 2, 0.13), { color: '#dffffb', tw: 480, th: 380, opacity: 0.28, cls: 'r' })
    const net2 = s.tile(caustic(600, 456, 3, 0.61), { color: '#c8fff6', tw: 600, th: 456, opacity: 0.18, cls: 'r' })
    s.add(s.twinkle(s.move(net1, [[0, 0], [480, 380]], 160), 0.5, 7))
    s.add(s.twinkle(s.move(net2, [[600, 0], [0, 456]], 210), 0.4, 9, 0.5))

    // reef shadows, reef, seagrass
    for (const [cx, cy, rad] of REEFS) s.add(s.glow(cx + 18, cy + 26, rad * 1.25, '#063c4c', 0.35))
    const coral = reef(r)
    const coralPaint = { 1: '#ff93b0', 2: '#ffb072', 3: '#ffe38f', 4: '#cfa8ff', 5: '#17646a' }
    for (const m of [5, 1, 2, 3, 4]) s.add(s.text(coral, { m, paint: s.solid(coralPaint[m]), opacity: m === 5 ? 0.85 : 1 }))
    s.add(s.frames([0, 1].map(f => s.text(grass(f), { paint: s.solid('#86ecae'), opacity: 0.75 })), 3.4))

    // sun glints on the shallows
    const glints = stars(r, 70, (x, y) => Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H * 0.55)) > 0.95, { groups: 3, glyphs: "'.+*" })
    glints.forEach((g, i) => s.add(s.twinkle(s.text(g, { paint: s.solid('#ffffff'), opacity: 0.8 }), 0.05, 3 + i * 1.3, i * 0.31)))

    // fish schools crossing, a cell at a time
    const schools = [
      { y: 150, right: true, dur: 46, phase: 0.2, c: '#ffe27a', big: false },
      { y: 640, right: false, dur: 58, phase: 0.65, c: '#d7efff', big: false },
      { y: 930, right: true, dur: 52, phase: 0.45, c: '#ffb878', big: true },
      { y: 400, right: false, dur: 64, phase: 0.05, c: '#fff3a8', big: true },
    ]
    for (const sc of schools) {
      const fr = s.frames([0, 1].map(f => s.text(school(sc.right, f, sc.big), { paint: s.solid(sc.c) })), 0.8, sc.phase)
      const bob = s.sway(fr, 0, 14, 5 + sc.dur / 20, sc.phase)
      const [a, b] = sc.right ? [-200, W + 40] : [W + 40, -200]
      s.add(s.group([s.move(bob, [[a, sc.y], [b, sc.y + 40]], sc.dur, { phase: sc.phase, step: CW })], { opacity: 0.85 }))
    }

    // the manta, gliding across the upper lagoon with slow wingbeats
    const mantaPaints = { 1: s.linear([[0, '#16485a'], [0.5, '#2a6a7d'], [1, '#16485a']], [0, 0, 0, 17 * CH]), 2: s.solid('#9cccd3'), 3: s.solid('#1d5466') }
    const flap = s.frames([0, 1, 2, 3].map(f => s.sprite(manta(f))(mantaPaints)), 4.8)
    const mantaBody = s.group([s.glow(130, 170, 220, '#04303d', 0.35), flap], { opacity: 0.88 })
    s.add(s.move(mantaBody, [[W + 120, 160], [1400, 230], [900, 190], [400, 260], [-480, 210]], 110, { phase: 0.3 }))

    // sea turtles paddling loops on either side
    const turtles = headings(s, { n: 8, frames: 2, w: 32, h: 17, shape: turtle, remap: (ch, m) => (m === 2 ? SKIN[ch] ?? ch : ch) })
    const shellPaint = s.radial([[0, '#f6dd96'], [0.5, '#c39a50'], [1, '#6d562b']], [160, 161, 90])
    const turtlePaints = { 1: shellPaint, 2: s.solid('#c5dba6') }
    const shadow = s.glow(16, 24, 140, '#043140', 0.4)
    const paths = [
      { pts: loop(440, 470, 220, 170, { tilt: 0.3, wobble: 0.18, dir: 1, seed: 1 }), dur: 80, phase: 0.1, k: 0.95 },
      { pts: loop(1500, 740, 200, 190, { tilt: -0.5, wobble: 0.2, dir: -1, seed: 4 }), dur: 88, phase: 0.55, k: 0.85 },
      { pts: loop(1450, 200, 280, 100, { tilt: 0.1, wobble: 0.15, dir: 1, seed: 2 }), dur: 96, phase: 0.8, k: 0.6 },
    ]
    for (const p of paths) {
      s.add(swim(s, turtles, turtlePaints, { pts: p.pts, dur: p.dur, phase: p.phase, beat: 2.2, w: 32, h: 17, scale: p.k, under: shadow }))
    }
  },
}
