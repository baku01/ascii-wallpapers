// Cloud Drift: puffy ASCII clouds sailing across a blue sky in three depths, a paper plane gliding through.
import { ROUND, art, rasterize } from '../lib/ascii.mjs'
import { CH, CW, H, W, clamp, fbm } from '../lib/core.mjs'

// Puffy edges: dots over the shoulders, parentheses at the sides, a flat underscore beneath.
const PUFF = { below: '-', above: '_', right: '(', left: ')', downRight: '.', downLeft: '.', upRight: '(', upLeft: ')' }

// A cloud of w x h cells: round puffs, tallest in the middle, sitting on a flat underside, the edge roughened by noise.
function cloud(w, h, seed, rand) {
  const pw = w * CW, ph = h * CH
  const base = ph * 0.9
  const n = 4 + Math.floor(rand() * 3)
  const puffs = []
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    // big and small puffs in turn, the tallest near the middle
    const rr = ph * (0.16 + 0.34 * Math.sin(t * Math.PI) ** 0.8) * (i % 2 ? 0.7 + rand() * 0.2 : 1 + rand() * 0.25)
    puffs.push([pw * (0.1 + t * 0.8) + (rand() - 0.5) * pw * 0.05, base - rr * 0.7, rr])
  }
  return rasterize(w, h, (x, y) => {
    if (y > base) return null
    let v = -1
    for (const [cx, cy, rr] of puffs) v = Math.max(v, 1 - Math.hypot(x - cx, (y - cy) * 1.05) / rr)
    v += (fbm(x / 38, y / 26, seed) - 0.5) * 0.5
    if (v <= 0) return null
    // the sunlit top dense and bright, the underside thinner; a little noise for texture
    const lit = 1 - clamp((y - base * 0.25) / (base * 0.8))
    return { l: clamp(0.15 + v * 0.55 + lit * 0.35 + (fbm(x / 25, y / 18, seed + 5) - 0.5) * 0.4) }
  }, { outline: PUFF, edge: 0.62, ramp: ' .:-=+*#%@' })
}

const PLANE = art(`
\\\`-._
 \\   \`-._
  )_____ \`>
 /  _.-'
/.-'`)

const BIRD = [art('^v^'), art('-v-')]

export default {
  key: 'clouds',
  name: 'Cloud Drift',
  tone: 'light',
  accent: '#2f7fd6',
  ink: '#4f8fd0',
  alt: 'ASCII clouds drifting over a blue sky, a paper plane gliding through',
  build(s) {
    const r = s.rand
    s.add(s.ground(s.linear([[0, '#58a6ea'], [0.5, '#a3d0f6'], [1, '#e6f4ff']], [0, 0, 0, H])))
    s.add(s.glow(260, 110, 700, '#fffbea', 0.6))
    s.add(s.glow(260, 110, 220, '#ffffff', 0.55))

    // a handful of cloud shapes, each drawn once and reused at every depth
    const shapes = [[46, 12], [34, 10], [60, 14], [28, 8], [42, 11]].map(([w, h], i) => ({ w, h, draw: s.sprite(cloud(w, h, 11 + i * 7, r)) }))
    // a soft white haze under each cloud's glyphs gives it body
    s.defs.push('<radialGradient id="haze"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>')
    const haze = (w, h) => {
      const cx = (w * CW) / 2, cy = h * CH * 0.62, rx = w * CW * 0.56, ry = h * CH * 0.5
      return s.raw(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#haze)"/>`, [{ k: 'glow', cx, cy, r: ry * 1.2, color: [255, 255, 255], a: 0.35 }])
    }
    const shade = h => s.linear([[0, '#ffffff'], [0.55, '#f4f9ff'], [1, '#bcd3ec']], [0, 0, 0, h * CH])

    // three depths: far ones small, pale and slow; near ones large and quicker; all sailing right to left
    const depths = [
      { k: 0.5, a: 0.5, dur: 320, ys: [60, 170, 110, 230], count: 4 },
      { k: 0.78, a: 0.78, dur: 210, ys: [300, 420, 250, 470], count: 4 },
      { k: 1.05, a: 0.95, dur: 140, ys: [90, 640, 150, 760], count: 4 },
    ]
    depths.forEach((d, di) => {
      for (let i = 0; i < d.count; i++) {
        const sh = shapes[(i * 2 + di) % shapes.length]
        const el = s.scale(s.group([haze(sh.w, sh.h), sh.draw({ 1: shade(sh.h) })]), d.k)
        const wide = sh.w * CW * d.k
        // each cloud crosses from beyond the right edge to beyond the left, evenly spaced along the loop
        s.add(s.group([s.move(el, [[W + 40, d.ys[i]], [-wide - 40, d.ys[i]]], d.dur, { phase: (i + r() * 0.4) / d.count})], { opacity: d.a }))
      }
    })

    // a paper plane gliding left to right on a long gentle wave, dots trailing behind
    const trail = art('.  .  .  .  .')
    const plane = s.group([
      s.text(trail, { paint: s.linear([[0, '#ffffff', 0], [1, '#ffffff', 0.9]], [0, 0, trail.w * CW, 0]), x: -trail.w * CW - 6, y: CH * 2 }),
      s.text(PLANE, { paint: s.linear([[0, '#ffffff'], [1, '#d9e7f5']], [0, 0, 0, PLANE.h * CH]) }),
    ])
    const path = [[-300, 380], [380, 330], [900, 400], [1450, 320], [W + 300, 370]]
    s.add(s.move(s.sway(s.scale(plane, 1.3), 0, -16, 4.5), path, 52, { phase: 0.72 }))

    // a few birds far off, flapping as they go
    const flap = [0, 1].map(f => s.sprite(BIRD[f]))
    for (let i = 0; i < 4; i++) {
      const bird = s.frames(flap.map(fr => fr({ 1: s.solid('#3d5f86') })), 0.7 + r() * 0.3, r())
      const y = 120 + i * 34 + r() * 30, x0 = W + 60 + i * 50
      s.add(s.group([s.move(s.scale(bird, 0.85), [[x0, y], [-120 + i * 50, y - 60]], 90, { phase: 0.35 + i * 0.015 })], { opacity: 0.7 }))
    }
  },
}
