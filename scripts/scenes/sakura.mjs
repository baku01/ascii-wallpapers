// Sakura: cherry branches in bloom reaching in from the top corners, petals drifting on a soft pink sky.
import { Grid, ROUND, rasterize } from '../lib/ascii.mjs'
import { CH, COLS, CW, H, ROWS, W, clamp, noise } from '../lib/core.mjs'
import { specks } from '../lib/shapes.mjs'

const BARK = 1, PINK = 2, WHITE = 3, HEART = 4

// distance from p to the segment a-b, and how far along it p falls
function toSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1))
  return [Math.hypot(px - ax - t * dx, py - ay - t * dy), t]
}

// A branch: limbs as polylines [[x, y], ...] with a thickness at each end, rasterized as bark lit from above,
// and the blossoms clustered along them on top.
function tree(rand, limbs, { flowers = 70 } = {}) {
  const segs = []
  for (const { pts, r0, r1 } of limbs) {
    const total = pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0)
    let run = 0
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
      segs.push({ a: pts[i], b: pts[i + 1], ra: r0 + (r1 - r0) * (run / total), rb: r0 + (r1 - r0) * ((run + len) / total) })
      run += len
    }
  }
  const bark = rasterize(COLS, ROWS, (x, y) => {
    for (const sg of segs) {
      const [d, t] = toSegment(x, y, sg.a, sg.b)
      const rad = sg.ra + (sg.rb - sg.ra) * t
      if (d > rad) continue
      // which side of the limb: the upper side catches the light
      const [ax, ay] = sg.a, [bx, by] = sg.b
      const side = ((x - ax) * (by - ay) - (y - ay) * (bx - ax)) / (Math.hypot(bx - ax, by - ay) || 1)
      const up = (bx - ax) * side < 0 ? 1 : 0
      return { m: BARK, l: clamp(0.35 + 0.35 * up + 0.2 * noise(x * 0.08, y * 0.08, 4)) }
    }
    return null
  }, { outline: ROUND, ramp: ' :=+#%@' })

  // blossoms in clusters along the limbs: big five-petal flowers, small ones, and buds
  const g = new Grid(COLS, ROWS).stamp(bark)
  const put = (c, r, rows, petal) => rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === ' ') return
    g.set(c + i, r + j, ch, ch === '*' || ch === '@' ? HEART : petal)
  }))
  for (let k = 0; k < flowers; k++) {
    const sg = segs[Math.floor(rand() * segs.length)]
    const t = 0.15 + rand() * 0.85
    const x = sg.a[0] + (sg.b[0] - sg.a[0]) * t + (rand() - 0.5) * 110
    const y = sg.a[1] + (sg.b[1] - sg.a[1]) * t + (rand() - 0.55) * 90
    const c = Math.round(x / CW), r = Math.round(y / CH)
    const petal = rand() < 0.3 ? WHITE : PINK
    const kind = rand()
    if (kind < 0.42) put(c - 2, r - 1, [" .o. ", "o(*)o", " 'o' "], petal)
    else if (kind < 0.7) put(c - 1, r, ['o*o'], petal)
    else if (kind < 0.88) put(c - 1, r, ['(@)'], petal)
    else put(c, r, [rand() < 0.5 ? 'o' : '%'], petal)
  }
  // soft pink light behind the blossoms, so each cluster reads as a cloud of flowers
  const halos = segs.flatMap(sg => [0.35, 0.8].map(t => [sg.a[0] + (sg.b[0] - sg.a[0]) * t, sg.a[1] + (sg.b[1] - sg.a[1]) * t]))
  return { g, halos }
}

// A tumbling petal's frames: turning face-on, edge-on, the other way.
const TUMBLE = ['@', 'o', '-', 'o']

export default {
  key: 'sakura',
  name: 'Sakura',
  tone: 'light',
  accent: '#d6457a',
  ink: '#e7a3b8',
  alt: 'Cherry branches in bloom, petals drifting on a soft pink sky',
  build(s) {
    const r = s.rand
    s.add(s.ground(s.linear([[0, '#fff3f5'], [0.55, '#ffe3ea'], [1, '#f9d6df']], [0, 0, 0, H])))
    s.add(s.glow(1240, 260, 560, '#ffe9c9', 0.75), s.glow(1240, 260, 180, '#fff6e6', 0.7))

    // a far mountain, pale lavender with a snowy peak, and a softer ridge before it
    const ridge = x => 640 + Math.abs(x - 980) * 0.62 + (noise(x * 0.01, 0, 3) - 0.5) * 30 - Math.max(0, 120 - Math.abs(x - 980)) * 0.6
    const hill = x => 900 + Math.sin(x * 0.004 + 1) * 40 + (noise(x * 0.008, 2, 5) - 0.5) * 50
    const pathOf = f => {
      let d = `M-20 ${H}`
      for (let x = -20; x <= W + 20; x += 16) d += `L${x} ${Math.round(f(x))}`
      return d + `L${W + 20} ${H}Z`
    }
    const shapeOf = f => {
      const g = new Grid(COLS, ROWS)
      for (let c = 0; c < COLS; c++) for (let rr = 0; rr < ROWS; rr++) if (rr * CH > f(c * CW)) g.set(c, rr, '@')
      return g
    }
    const mountFill = s.linear([[0, '#efd9e9'], [1, '#f6dde6']], [0, 600, 0, 1000])
    s.add(s.raw(`<path d="${pathOf(ridge)}" fill="${mountFill.ref}"/>`, [{ k: 'cells', grid: shapeOf(ridge), x: 0, y: 0, paint: mountFill, a: 0.9, ox: 0, oy: 0 }]))
    const cap = rasterize(COLS, ROWS, (x, y) => {
      const top = ridge(x)
      if (y < top - 2 || y > 720 + 26 * noise(x * 0.03, 0, 9) || Math.abs(x - 980) > 170) return null
      return { l: x < 980 ? 0.7 : 0.3 }
    }, { outline: ROUND, ramp: " .:'*" })
    s.add(s.text(cap, { paint: s.linear([[0, '#ffffff'], [1, '#eedcef']], [0, 600, 0, 760]), opacity: 0.8 }))
    const hillFill = s.linear([[0, '#f8d7e1'], [1, '#f4cdd8']], [0, 860, 0, H])
    s.add(s.raw(`<path d="${pathOf(hill)}" fill="${hillFill.ref}"/>`, [{ k: 'cells', grid: shapeOf(hill), x: 0, y: 0, paint: hillFill, a: 1, ox: 0, oy: 0 }]))
    s.add(s.glow(960, 980, 900, '#ffffff', 0.35))

    // petals far away, a fine drift
    s.add(s.move(s.tile(specks(r, 48, 40, 26, ",'."), { color: '#eaa1b9', tw: 480, th: 760, opacity: 0.55, cls: 'r' }), [[0, 0], [480, 760]], 46))

    // the branches, each swaying a little from its corner
    const sway = s.keyframes('50%{transform:rotate(var(--rot))}')
    const paints = {
      [BARK]: s.linear([[0, '#7b5357'], [1, '#4f3336']], [0, 0, 0, 420]),
      [PINK]: s.linear([[0, '#ffc2d6'], [1, '#f48fb1']], [0, 0, 0, 480]),
      [WHITE]: s.solid('#fff8fb'),
      [HEART]: s.solid('#d6457a'),
    }
    const left = tree(r, [
      { pts: [[-40, 70], [180, 150], [400, 185], [620, 280], [760, 300]], r0: 36, r1: 6 },
      { pts: [[190, 150], [310, 70], [460, 30], [560, 10]], r0: 14, r1: 4 },
      { pts: [[410, 190], [500, 320], [540, 430]], r0: 12, r1: 3 },
      { pts: [[600, 270], [690, 200], [760, 175]], r0: 8, r1: 3 },
      { pts: [[-30, 250], [110, 290], [230, 380]], r0: 14, r1: 4 },
    ], { flowers: 150 })
    const right = tree(r, [
      { pts: [[1960, 140], [1740, 200], [1540, 240], [1350, 330], [1230, 350]], r0: 36, r1: 6 },
      { pts: [[1730, 205], [1620, 100], [1480, 50], [1400, 30]], r0: 13, r1: 4 },
      { pts: [[1540, 245], [1460, 380], [1440, 470]], r0: 11, r1: 3 },
      { pts: [[1960, 360], [1840, 400], [1760, 480]], r0: 14, r1: 4 },
    ], { flowers: 135 })
    const draw = ({ g, halos }) => s.group([...halos.map(([x, y]) => s.glow(x, y, 120, '#ffb3cc', 0.38)), ...[BARK, PINK, WHITE, HEART].map(m => s.text(g, { m, paint: paints[m] }))])
    s.add(s.animate(draw(left), sway, 11, { timing: 'ease-in-out', vars: '--rot:.6deg;' }))
    s.add(s.group([s.animate(s.group([draw(right)], { x: -W }), sway, 13, { timing: 'ease-in-out', phase: 0.4, vars: '--rot:-.6deg;' })], { x: W }))

    // nearer petals: a drifting field, and a few big ones tumbling down on their own paths
    s.add(s.sway(s.move(s.tile(specks(r, 38, 40, 16, ",,'~*"), { color: '#ec86a8', tw: 380, th: 760, opacity: 0.7 }), [[0, 0], [380, 760]], 27), 50, 0, 7))
    const frames = TUMBLE.map(ch => {
      const g = new Grid(1, 1)
      g.set(0, 0, ch, 1)
      return s.sprite(g)
    })
    for (let k = 0; k < 14; k++) {
      const scale = 1.1 + r() * 0.6
      const paint = { 1: r() < 0.7 ? s.solid(r() < 0.5 ? '#f48fb1' : '#f7a8c2') : s.solid('#ffffff') }
      const spin = s.frames(frames.map(f => f(paint)), 1.4 + r() * 1.4, r())
      const x0 = -200 + r() * (W + 100), drift = 300 + r() * 300
      const pts = Array.from({ length: 6 }, (_, i) => [x0 + (drift * i) / 5 + (i % 2 ? 50 : -50), -60 + ((H + 120) * i) / 5])
      s.add(s.move(s.scale(spin, scale), pts.map(([x, y]) => [x, y]), 22 + r() * 16, { phase: r() }))
    }
  },
}
