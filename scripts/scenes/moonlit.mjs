// Moonlit: a crescent moon in a deep blue night, thin clouds sliding past, stars twinkling and a shooting star.
import { Grid, ROUND, rasterize } from '../lib/ascii.mjs'
import { CH, COLS, CW, H, W, clamp, fbm, smooth } from '../lib/core.mjs'
import { stars, strand } from '../lib/shapes.mjs'

const MX = 1480, MY = 270, R = 172

// The crescent: the moon's disc less a disc nudged toward the upper left, cratered by noise.
function moon() {
  const gw = Math.ceil((2 * R + 20) / CW), gh = Math.ceil((2 * R + 20) / CH)
  const cx = (gw * CW) / 2, cy = (gh * CH) / 2
  const g = rasterize(gw, gh, (x, y) => {
    const d = Math.hypot(x - cx, y - cy)
    if (d > R) return null
    const shade = Math.hypot(x - (cx - R * 0.38), y - (cy - R * 0.14)) / (R * 0.92)
    if (shade < 1) return null
    // brightest along the outer limb, craters darkening the face
    const limb = smooth(0.55, 1, d / R)
    const crater = fbm(x / 34, y / 30, 4)
    return { l: clamp(0.35 + limb * 0.35 + (shade - 1) * 0.6 - (crater > 0.58 ? 0.3 : 0)) }
  }, { outline: ROUND, edge: 0.66 })
  return { g, ox: MX - cx, oy: MY - cy }
}

// A long wisp of cloud: a thin band thickest in the middle, frayed by noise.
function wisp(w, h, seed) {
  const pw = w * CW, ph = h * CH
  return rasterize(w, h, (x, y) => {
    const t = x / pw
    const mid = ph * (0.5 + 0.12 * Math.sin(t * 6 + seed))
    const half = ph * 0.48 * Math.sin(t * Math.PI) ** 0.6
    const v = 1 - Math.abs(y - mid) / (half || 1) + (fbm(x / 55, y / 22, seed) - 0.5) * 1.1
    return v > 0.2 ? { l: clamp(v * 0.75) } : null
  }, { ramp: " .,:~-=+", min: 0.3 })
}

export default {
  key: 'moonlit',
  name: 'Moonlit',
  tone: 'dark',
  accent: '#fff3d2',
  ink: '#1a2350',
  alt: 'A crescent moon over thin sliding clouds, stars twinkling and a shooting star',
  build(s) {
    const r = s.rand
    s.add(s.ground(s.linear([[0, '#060a20'], [0.5, '#0f1944'], [1, '#22346e']], [0, 0, 0, H])))
    s.add(s.glow(MX + 60, MY, 680, '#fff3d2', 0.15))

    // stars, thicker toward the top, none in the moon's glare, twinkling in three groups on their own clocks
    const field = stars(r, 300, (x, y) => Math.hypot(x - MX, y - MY) > 300 && r() < (1 - y / H) ** 1.6, { groups: 3, glyphs: "....''+*" })
    const tints = ['#e3e9ff', '#fff3d6', '#c4d4ff']
    field.forEach((g, i) => s.add(s.twinkle(s.text(g, { paint: s.solid(tints[i]), cls: i ? 'r' : undefined }), 0.2, 3.3 + i * 1.9, i * 0.3)))
    // a few bright ones with a halo
    for (let i = 0; i < 7; i++) {
      const x = 80 + r() * (W - 160), y = 40 + r() * H * 0.45
      if (Math.hypot(x - MX, y - MY) < 320) continue
      const g = new Grid(1, 1)
      g.set(0, 0, '*')
      s.add(s.twinkle(s.group([s.glow(CW / 2, CH / 2, 26, '#dfe7ff', 0.5), s.text(g, { paint: s.solid('#ffffff') })], { x: x - CW / 2, y: y - CH / 2 }), 0.35, 2.2 + r() * 3, r()))
    }

    // a shooting star: crossing fast, seen for a moment once in a long while
    const streak = new Grid(30, 6)
    const pts = Array.from({ length: 30 }, (_, i) => [i, i * 0.17])
    strand(streak, pts, { glyphs: { flat: '-', steep: '|', down: '\\', up: '/' } })
    streak.set(29, 5, '*')
    const tail = s.linear([[0, '#ffffff', 0], [0.75, '#e8eeff', 0.6], [1, '#ffffff', 1]], [0, 0, 30 * CW, 0])
    const shooting = s.move(s.text(streak, { paint: tail }), [[180, 40], [180 + 9000, 40 + 2900]], 16, { phase: 0.5 })
    s.add(s.blink(shooting, 0.08, 16, 0.5))

    // the moon and its glow
    const { g, ox, oy } = moon()
    s.add(s.twinkle(s.glow(MX + 70, MY + 10, 300, '#fff1c9', 0.26), 0.7, 9))
    s.add(s.text(g, { paint: s.radial([[0, '#fffaf0'], [0.6, '#f6e7bd'], [1, '#d8c38c']], [(g.w * CW) / 2, (g.h * CH) / 2, R]), x: ox, y: oy }))

    // thin clouds sliding right to left, one crossing the moon
    const shapes = [[90, 6], [70, 5], [110, 7]].map(([w, h], i) => ({ w, h, draw: s.sprite(wisp(w, h, 3 + i * 5)) }))
    const wisps = [
      { sh: 0, y: 225, dur: 260, phase: 0.08, a: 0.55 },
      { sh: 1, y: 120, dur: 330, phase: 0.55, a: 0.35 },
      { sh: 2, y: 470, dur: 300, phase: 0.3, a: 0.4 },
      { sh: 1, y: 640, dur: 380, phase: 0.8, a: 0.3 },
      { sh: 0, y: 330, dur: 420, phase: 0.62, a: 0.3 },
    ]
    for (const w of wisps) {
      const sh = shapes[w.sh]
      const paint = s.linear([[0, '#aab8e6'], [1, '#56679f']], [0, 0, 0, sh.h * CH])
      s.add(s.group([s.move(sh.draw({ 1: paint }), [[W + 40, w.y], [-sh.w * CW - 40, w.y]], w.dur, { phase: w.phase})], { opacity: w.a }))
    }

    // dark hills along the foot of the night: a solid silhouette, a faint glyph texture over it
    const rows = 12
    const top = H - rows * CH
    const ridge = x => 50 + 150 * fbm(x / 520, 1, 9) ** 1.4 + 30 * fbm(x / 110, 3, 2)
    const d = `M0 ${H}` + Array.from({ length: W / 20 + 1 }, (_, i) => `L${i * 20} ${Math.round(H - ridge(i * 20))}`).join('') + `L${W} ${H}z`
    s.add(s.raw(`<path d="${d}" fill="#090e29"/>`, [{ k: 'paint', paint: { at: (x, y) => [9, 14, 41, y > H - ridge(x) ? 1 : 0] } }]))
    const hills = rasterize(COLS, rows, (x, y) => {
      const edge = rows * CH - ridge(x)
      return y > edge ? { l: clamp(0.15 + 0.5 * fbm(x / 30, y / 20, 6) - (y - edge) / 400) } : null
    }, { outline: ROUND, ramp: ' .,:-=+' })
    s.add(s.text(hills, { paint: s.linear([[0, '#2a3a74'], [1, '#141d48']], [0, 0, 0, rows * CH]), y: top, cls: 'r' }))
  },
}
