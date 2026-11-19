// Jellyfish: glowing bells pulsing up through deep blue water, light falling from the surface, marine snow.
import { Grid, ROUND, rasterize } from '../lib/ascii.mjs'
import { CH, CW, H, W, clamp, num } from '../lib/core.mjs'
import { specks } from '../lib/shapes.mjs'

const FRAMES = 8
const GW = 28, GH = 26

// One jellyfish in a pulse's frame f: bell (1), its inner lobes (2), tentacles (3), oral arms and rim (4).
function jelly(f) {
  const t = f / FRAMES, wave = t * Math.PI * 2
  const squash = Math.sin(wave)
  const cx = (GW / 2) * CW
  const rx = 112 * (1 + 0.08 * squash), ry = 118 * (1 - 0.09 * squash), base = 8 + 118 * 1.09
  const bell = rasterize(GW, Math.ceil(base / CH), (x, y) => {
    const u = (x - cx) / rx, v = (y - base) / ry
    if (y > base || u * u + v * v > 1) return null
    // brightest high in the dome, dimming toward the rim
    const d = Math.min(1, Math.hypot(u, (y - base + ry * 0.55) / ry))
    // four lobes glowing inside the bell
    const lu = (x - cx) / (rx * 0.45), lv = (y - base + ry * 0.38) / (ry * 0.28)
    const lobe = Math.abs(Math.cos(Math.atan2(lv, lu) * 2)) > 0.4 && lu * lu + lv * lv < 1
    // lit from above and a little to the left
    const light = clamp(0.25 + 0.75 * (1 - d) ** 0.8 - 0.1 * u)
    return { m: lobe ? 2 : 1, l: light }
  }, { outline: ROUND, edge: 0.7 })
  const g = new Grid(GW, GH).stamp(bell)
  const rim = Math.floor(base / CH)
  const half = Math.round(rx / CW)
  for (let i = -half; i <= half; i++) g.set(GW / 2 + i, rim, i === -half ? '(' : i === half ? ')' : '~-~"'[(((i + f) % 4) + 4) % 4], 4)

  // thin tentacles from the rim, a wave running down them; a glyph leans the way the strand bends
  const rnd = (k, j) => ((Math.sin(k * 12.9898 + j * 78.233) * 43758.5453) % 1 + 1) % 1
  for (let k = 0; k < 6; k++) {
    const x0 = GW / 2 + (k - 2.5) * (half / 2.7)
    const len = 11 + Math.floor(rnd(k, 1) * 7)
    let prev = x0
    for (let j = 1; j <= len; j++) {
      const x = x0 + Math.sin(j * 0.38 - wave + k * 1.9) * (0.3 + j * 0.11)
      const dx = x - prev
      prev = x
      const end = len - j
      const ch = end === 0 ? '.' : end === 1 ? "'" : end < 4 && j % 2 ? ':' : dx > 0.28 ? '\\' : dx < -0.28 ? '/' : dx > 0.08 ? ')' : dx < -0.08 ? '(' : '|'
      g.set(Math.round(x), rim + j, ch, 3)
    }
  }
  // two frilled oral arms hanging from the middle, curling as they go
  for (const side of [-1, 1]) {
    const len = 10
    for (let j = 1; j <= len; j++) {
      const x = Math.round(GW / 2 + side * 1.4 + Math.sin(j * 0.55 - wave + side * 2) * (0.6 + j * 0.08))
      const end = len - j
      if (end < 2) { g.set(x, rim + j, end ? '}' : '.', 4); continue }
      g.set(x - 1, rim + j, side < 0 ? '{' : '(', 4)
      g.set(x, rim + j, j % 3 ? '%' : '&', 4)
      g.set(x + 1, rim + j, side < 0 ? ')' : '}', 4)
    }
  }
  return g
}

const SPECIES = [
  { top: '#ffe3f4', mid: '#ff9ad5', deep: '#b8508f', lobe: '#fff3fa', arm: '#ffc7e8' },
  { top: '#efe6ff', mid: '#c4a3ff', deep: '#7558bf', lobe: '#faf6ff', arm: '#dccbff' },
  { top: '#e0f7ff', mid: '#7fd8ff', deep: '#3584b5', lobe: '#f2fcff', arm: '#bdedff' },
  { top: '#ffe9db', mid: '#ffb38a', deep: '#bd6c45', lobe: '#fff5ee', arm: '#ffd4bb' },
]

export default {
  key: 'jellyfish',
  name: 'Jellyfish',
  tone: 'dark',
  accent: '#ff9ad5',
  ink: '#0b2a52',
  alt: 'Glowing jellyfish pulsing up through deep blue water, light falling from the surface',
  build(s) {
    const r = s.rand
    s.add(s.ground(s.linear([[0, '#11557e'], [0.42, '#0a2c56'], [0.8, '#05162f'], [1, '#030b1a']], [0, 0, 0, H])))
    s.add(s.glow(W * 0.5, -260, 1100, '#5cc8ff', 0.22))

    // light falling from the surface in soft slanted shafts, breathing slowly
    const fade = s.linear([[0, '#cdf3ff', 0.16], [0.7, '#cdf3ff', 0]], [0, 0, 0, H * 0.8])
    const shafts = [[180, 90, 260], [560, 40, 150], [1010, 120, 330], [1450, 50, 190], [1740, 80, 240]].map(([x, w0, w1], i) => {
      const d = `M${x} 0h${w0}l${num(w1 + 260)} ${H * 0.8}h${-w1}z`
      return s.twinkle(s.raw(`<path d="${d}" fill="${fade.ref}"/>`), 0.35, 11 + i * 2.3, i * 0.27)
    })
    s.add(s.group(shafts))

    // marine snow, two depths sinking at their own pace
    s.add(s.move(s.tile(specks(r, 64, 40, 60, '.,`'), { color: '#a8d8ff', tw: 640, th: 760, opacity: 0.3, cls: 'r' }), [[0, 0], [0, 760]], 150))
    s.add(s.move(s.tile(specks(r, 48, 30, 18, ".'"), { color: '#d5f0ff', tw: 480, th: 570, opacity: 0.45 }), [[0, 0], [24, 570]], 75))

    // the jellyfish: four pulse frames drawn once, every swimmer a copy
    const frames = Array.from({ length: FRAMES }, (_, f) => s.sprite(jelly(f)))
    const swimmers = [
      { sp: 0, x: 1450, scale: 1.25, dur: 80, phase: 0.6, a: 1 },
      { sp: 1, x: 200, scale: 1.05, dur: 95, phase: 0.2, a: 0.95 },
      { sp: 2, x: 1720, scale: 0.7, dur: 115, phase: 0.02, a: 0.7 },
      { sp: 3, x: 430, scale: 0.6, dur: 125, phase: 0.57, a: 0.6 },
      { sp: 0, x: 960, scale: 0.42, dur: 150, phase: 0.36, a: 0.4 },
      { sp: 2, x: 70, scale: 0.5, dur: 135, phase: 0.83, a: 0.5 },
      { sp: 1, x: 1190, scale: 0.8, dur: 105, phase: 0.93, a: 0.75 },
    ]
    for (const j of swimmers.sort((a, b) => a.scale - b.scale)) {
      const c = SPECIES[j.sp]
      const paints = {
        1: s.linear([[0, c.top], [0.6, c.mid], [1, c.deep]], [0, 10, 0, 140]),
        2: s.solid(c.lobe),
        3: s.linear([[0, c.mid, 0.95], [1, c.mid, 0.05]], [0, 130, 0, GH * CH]),
        4: s.solid(c.arm),
      }
      const pulse = s.frames(frames.map(fr => fr(paints)), 2.8, j.phase * 7)
      const body = s.scale(s.group([s.glow((GW / 2) * CW, 80, 200, c.mid, 0.3), pulse]), j.scale)
      const left = j.x - (GW * CW * j.scale) / 2
      const drifting = s.sway(body, 28 / j.scale, 0, 13 + j.dur / 20, j.phase)
      s.add(s.group([s.move(drifting, [[left, H + 40], [left, -GH * CH * j.scale - 40]], j.dur, { phase: j.phase })], { opacity: j.a }))
    }
  },
}
