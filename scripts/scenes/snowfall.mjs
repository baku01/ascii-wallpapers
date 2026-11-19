// Snowfall: a pine forest at night, snow falling in three depths, a cabin window glowing warm.
import { Grid, HARD, ROUND, rasterize } from '../lib/ascii.mjs'
import { CH, COLS, CW, H, W, fbm, lerp } from '../lib/core.mjs'
import { stars } from '../lib/shapes.mjs'

// branch tips droop: their undersides read as tildes
const PINE = { ...HARD, above: '~' }

// A pine `rows` tall: tiers of branches (1), snow lying on their upper slopes (2), a trunk (3).
function pine(rows, seed) {
  const w = Math.round(rows * 1.05) | 1
  const cx = (w * CW) / 2, crown = (rows - 1.4) * CH
  const tiers = Math.max(3, Math.round(rows / 5))
  return rasterize(w, rows, (x, y) => {
    const d = Math.abs(x - cx)
    if (y > crown) return d < CW * 0.9 ? { m: 3, l: 0.5 } : null
    for (let k = tiers - 1; k >= 0; k--) {
      const y0 = (crown * k * 0.78) / tiers, y1 = (crown * (k + 1.25)) / tiers
      if (y < y0 || y > Math.min(y1, crown)) continue
      const t = (y - y0) / (y1 - y0)
      const half = lerp(CW * 0.6, ((w * CW) / 2) * (0.32 + (0.68 * (k + 1)) / tiers), t ** 0.85)
      // ragged branch tips
      const jag = (fbm(x / 9, y / 9, seed + k, 2) - 0.5) * 16
      if (d > half + jag) continue
      // snow lies along the top of each tier, thickest toward the tips, in clumps
      const lie = fbm(x / 16, y / 10, seed + 7, 2)
      const snowy = (t < 0.22 + lie * 0.2 && d / half > 0.18) || lie > 0.7
      return { m: snowy ? 2 : 1, l: snowy ? 0.55 + 0.45 * (1 - t) : 0.3 + 0.5 * (d / half) * (1 - t * 0.4) }
    }
    return null
  }, { outline: PINE, edge: 0.7, ramp: ' .:;+*#%' })
}

// The cabin: snowy roof (1), log walls (2), lit windows (3), chimney stone (4), log seams (5).
const CABIN = [
  ['            ___         ', '            444         '],
  ['           |   |        ', '           4444         '],
  ['   ________|___|_____   ', '   11111111144441111   '],
  ['  /*.*:*.*:*.*:*.*:*.*\\ ', '  1111111111111111111111 '],
  [' /:*.*:*.*:*.*:*.*:*.*:*\\', ' 11111111111111111111111 1'],
  ['/________________________\\', '22222222222222222222222222'],
  [' |=====================|  ', ' 25555555555555555555552  '],
  [' |=|####|=====|####|===|  ', ' 25233332555552333325552  '],
  [' |=|####|=====|####|===|  ', ' 25233332555552333325552  '],
  [' |=|----|=====|----|===|  ', ' 25222222555552222225552  '],
  [' |_____________________|  ', ' 22222222222222222222222  '],
]
function cabin() {
  const g = new Grid(26, CABIN.length)
  CABIN.forEach(([row, mats], y) => [...row].forEach((c, x) => {
    if (c !== ' ') g.set(x, y, c, Number(mats[x]) || 2)
  }))
  return g
}

// A tile of snowflakes, none touching another, so the repeat doesn't show as pairs.
function flakes(r, cols, rows, count, glyphs) {
  const g = new Grid(cols, rows)
  let n = 0, tries = 0
  while (n < count && tries++ < count * 40) {
    const c = Math.floor(r() * cols), y = Math.floor(r() * rows)
    let near = false
    for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) if (g.at(c + dx, y + dy) !== ' ') near = true
    if (near) continue
    g.set(c, y, glyphs[Math.floor(r() * glyphs.length)])
    n++
  }
  return g
}

// One frame of the chimney's smoke: a wisp curling up, thinning to dots.
function smoke(f) {
  const g = new Grid(8, 7)
  for (let j = 0; j < 7; j++) {
    const x = 3 + Math.sin(j * 0.9 - (f / 4) * Math.PI * 2) * (0.6 + j * 0.25)
    const prev = 3 + Math.sin((j - 1) * 0.9 - (f / 4) * Math.PI * 2) * (0.6 + (j - 1) * 0.25)
    g.set(Math.round(x), 6 - j, j > 4 ? '.' : x > prev ? ')' : '(')
  }
  return g
}

export default {
  key: 'snowfall',
  name: 'Snowfall',
  tone: 'dark',
  accent: '#9cc9ff',
  ink: '#16253d',
  alt: 'Snow falling over a pine forest at night, a cabin window glowing',
  build(s) {
    const r = s.rand
    s.add(s.ground(s.linear([[0, '#0a1424'], [0.5, '#13223a'], [1, '#1c2e4a']], [0, 0, 0, H])))

    // a hazy moon behind thin cloud
    const mx = 1540, my = 170
    s.add(s.glow(mx, my, 620, '#9fc0ea', 0.2), s.glow(mx, my, 150, '#e6efff', 0.35))
    const moon = rasterize(12, 6, (x, y) => {
      const d = Math.hypot(x - 60, (y - 57) * 1.0) / 50
      if (d > 1) return null
      return { m: fbm(x / 14, y / 14, 3, 2) > 0.58 ? 2 : 1, l: 0.55 + 0.45 * (1 - d) }
    }, { outline: ROUND, ramp: ' .:*o#@' })
    s.add(s.text(moon, { x: mx - 60, y: my - 57, paint: s.solid('#eef4ff'), m: 1 }), s.text(moon, { x: mx - 60, y: my - 57, paint: s.solid('#b9c9e2'), m: 2 }))
    stars(r, 70, (x, y) => y < H * 0.4 && Math.hypot(x - mx, y - my) > 200, { glyphs: "..'+" }).forEach((g, i) => {
      s.add(s.twinkle(s.text(g, { paint: s.solid('#cfe0ff'), opacity: 0.5, cls: 'r' }), 0.15, 4 + i * 1.9, i * 0.3))
    })

    // a far ridge under snow
    const ridgeTop = Math.round((H * 0.5) / CH), ridgeRows = Math.ceil((H * 0.3) / CH)
    const ridge = rasterize(COLS, ridgeRows, (x, y) => {
      const top = 80 + fbm(x / 420, 0.3, 5, 3) * 150 + Math.abs(Math.sin(x / 230)) * 30
      if (y < top || y > top + 150) return null
      // snow catching the light along the crest, fading down the slope
      const l = (1 - (y - top) / 150) * fbm(x / 30, y / 20, 6, 2)
      return r() < 0.12 + l * 0.6 ? { l } : null
    }, { ramp: " .,:;+*", min: 0.3 })
    s.add(s.text(ridge, { y: ridgeTop * CH, paint: s.linear([[0, '#7f97ba'], [1, '#253a58']], [0, 0, 0, ridgeRows * CH]), opacity: 0.55 }))

    // three pines drawn once; every tree is a copy, nearer ones bigger and darker
    const PINES = [pine(16, 11), pine(22, 23), pine(32, 37)]
    const sprites = PINES.map(g => s.sprite(g))
    const tree = (k, x, base, scale, body, snow, trunk) => {
      const g = PINES[k]
      const el = sprites[k]({ 1: s.linear([[0, body[0]], [1, body[1]]], [0, 0, 0, g.h * CH]), 2: s.solid(snow), 3: s.solid(trunk) })
      return s.group([s.scale(el, scale)], { x: x - (g.w * CW * scale) / 2, y: base - g.h * CH * scale })
    }
    // A row of pines stamped into one grid at one scale: a few dozen lines of text for the whole row, where a
    // copy per tree would be hundreds, which Desktop's per-frame check can't afford.
    const forest = (spots, scale, base, body, snow, trunk) => {
      const rows = Math.max(...spots.map(([k]) => PINES[k].h)) + 2
      const g = new Grid(Math.ceil(W / CW / scale), rows)
      for (const [k, x, lift] of spots) g.stamp(PINES[k], Math.round(x / CW / scale - PINES[k].w / 2), rows - PINES[k].h - lift)
      const paints = { 1: s.linear([[0, body[0]], [1, body[1]]], [0, 0, 0, rows * CH]), 2: s.solid(snow), 3: s.solid(trunk) }
      return s.group([s.scale(s.group(g.materials().map(m => s.text(g, { m, paint: paints[m] }))), scale)], { y: base - rows * CH * scale })
    }
    // far: small and pale along the ridge
    const farSpots = []
    for (let x = 30; x < W; x += 140 + r() * 120) farSpots.push([r() < 0.5 ? 0 : 1, x, Math.floor(r() * 2)])
    s.add(s.group([forest(farSpots, 0.46, H * 0.68, ['#7189ad', '#4a6185'], '#b4c7e0', '#3a4a66')], { opacity: 0.6 }))

    // the far snow falls behind the nearer trees
    s.add(s.sway(s.move(s.tile(flakes(r, 42, 21, 46, '..,'), { color: '#c6d8f2', tw: 420, th: 399, opacity: 0.35, cls: 'r' }), [[0, 0], [0, 399]], 38), 30, 0, 8))

    // mid: along both sides
    const midSpots = []
    for (const [a, b] of [[0, 0.3], [0.72, 1]]) for (let x = a * W + 20; x < b * W; x += 90 + r() * 90) midSpots.push([1, x, Math.floor(r() * 2)])
    s.add(forest(midSpots, 0.8, H * 0.78, ['#3f6a7c', '#244559'], '#d3e1f2', '#2a2f3f'))

    // the snowy ground, drifts rising toward the sides: a soft field, sparkles, and the lines of the drifts
    const g0 = H * 0.76
    const surface = x => g0 + 70 - Math.abs(x / W - 0.5) * 80 + (fbm(x / 260, 4.2, 8, 3) - 0.5) * 60
    const field = [[0, '#b7c9e3'], [0.3, '#8aa1c4'], [1, '#4c6690']]
    const fieldPaint = s.linear(field, [0, g0, 0, H])
    const outline = Array.from({ length: 49 }, (_, i) => `${i * 40},${Math.round(surface(i * 40))}`).join(' ')
    s.add(s.raw(`<polygon points="0,${H} ${outline} ${W},${H}" fill="${fieldPaint.ref}" opacity=".8"/>`, [
      { k: 'paint', a: 0.8, paint: { at: (x, y) => (y < surface(x) ? [0, 0, 0, 0] : fieldPaint.at(x, y)) } },
    ]))
    const groundTop = Math.floor(g0 / CH), groundRows = Math.ceil(H / CH) - groundTop
    const drifts = new Grid(COLS, groundRows)
    // drift ridges: gentle curves under the surface, drawn in low glyphs
    for (let k = 0; k < 7; k++) {
      const off = 40 + k * 55 + r() * 30, x0 = Math.floor(r() * COLS * 0.7), len = 30 + Math.floor(r() * 60)
      for (let c = x0; c < Math.min(COLS, x0 + len); c++) {
        const y = surface(c * CW) + off + Math.sin(c / 9 + k) * 14 - groundTop * CH
        const ch = c === x0 || c === x0 + len - 1 ? '.' : '-_~'[Math.floor(fbm(c / 5, k, 3, 1) * 3)]
        drifts.set(c, Math.floor(y / CH), ch)
      }
    }
    // sparkles where the moonlight catches
    for (let k = 0; k < 160; k++) {
      const c = Math.floor(r() * COLS), y = surface(c * CW) + 8 + r() ** 1.6 * 300 - groundTop * CH
      drifts.set(c, Math.floor(y / CH), r() < 0.2 ? '*' : r() < 0.5 ? "'" : '.')
    }
    s.add(s.twinkle(s.text(drifts, { y: groundTop * CH, paint: s.solid('#ffffff'), opacity: 0.7 }), 0.45, 6))

    // the cabin, window light spilling onto the snow
    const cx = 250, cy = H * 0.84 - CABIN.length * CH
    const house = cabin()
    s.add(s.twinkle(s.glow(cx + 110, cy + 155, 260, '#ffb648', 0.28), 0.7, 3.7))
    s.add(s.group([
      s.text(house, { m: 4, paint: s.solid('#4b4f60') }),
      s.text(house, { m: 2, paint: s.solid('#a77c5c') }),
      s.text(house, { m: 5, paint: s.solid('#76594a') }),
      s.text(house, { m: 1, paint: s.linear([[0, '#ffffff'], [1, '#c9daf0']], [0, 2 * CH, 0, 6 * CH]) }),
      s.twinkle(s.text(house, { m: 3, paint: s.solid('#ffc35c') }), 0.8, 2.3, 0.4),
    ], { x: cx, y: cy }))
    s.add(s.raw('', [{ k: 'glow', cx: cx + 110, cy: cy + 155, r: 200, color: [255, 182, 72], a: 0.4 }]))
    const wisp = Array.from({ length: 4 }, (_, f) => s.text(smoke(f), { paint: s.linear([[0, '#c3cfe0', 0.05], [1, '#c3cfe0', 0.6]], [0, 0, 0, 7 * CH]), cls: 'r' }))
    s.add(s.group([s.frames(wisp, 3.2)], { x: cx + 9 * CW, y: cy - 7 * CH }))

    // near: big dark pines cropped by the edges
    s.add(
      tree(2, 40, H + 30, 1.25, ['#2a5466', '#14303f'], '#eef5ff', '#1b1f2a'),
      tree(2, 1880, H + 40, 1.35, ['#2a5466', '#14303f'], '#eef5ff', '#1b1f2a'),
      tree(1, 1700, H * 0.97, 1.0, ['#2f5b6d', '#173546'], '#e6f0fc', '#1b1f2a'),
      tree(1, 610, H * 0.93, 0.85, ['#325f71', '#193849'], '#e2edfa', '#1b1f2a'),
    )

    // nearer snow, bigger and faster, drifting as it falls
    s.add(s.sway(s.move(s.tile(flakes(r, 52, 26, 30, "*.'+"), { color: '#e3edff', tw: 520, th: 494, opacity: 0.6 }), [[0, 0], [0, 494]], 21), 45, 0, 6.5, 0.3))
    s.add(s.sway(s.scale(s.move(s.tile(flakes(r, 40, 20, 7, '*'), { color: '#f4f8ff', tw: 400, th: 380, opacity: 0.75 }), [[0, 0], [0, 380]], 11), 1.6), 60, 0, 5.2, 0.6))
  },
}
