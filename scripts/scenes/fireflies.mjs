// Fireflies: a dark meadow at night, a treeline far off, tall grass swaying, fireflies wandering and blinking.
import { Grid, rasterize } from '../lib/ascii.mjs'
import { CH, COLS, CW, H, W, fbm } from '../lib/core.mjs'
import { stars } from '../lib/shapes.mjs'

const SWAY = 4
const GRASS_ROWS = 20

// The meadow's grass in one sway frame: tufts of blades rooted on the bottom row, taller toward the
// sides, a gust running along them. Shades: 1 far, 2 near, 3 a seed head on a tall blade.
function grass(f, tufts) {
  const g = new Grid(COLS, GRASS_ROWS)
  for (const { x, blades, k } of tufts) {
    const gust = Math.sin((f / SWAY) * Math.PI * 2 - x * 0.05 + k) * 0.5
    for (const { h, lean, m, seed } of blades) {
      const bend = lean + gust * (h / 10)
      let prev = x
      for (let j = 0; j <= h; j++) {
        const t = j / h
        const bx = x + bend * t * t * h * 0.5
        const dx = bx - prev
        prev = bx
        const ch = j === h ? (seed ? '*' : "'") : Math.abs(dx) < 0.2 ? '|' : dx > 0 ? '/' : '\\'
        g.set(Math.round(bx), GRASS_ROWS - 1 - j, ch, j === h && seed ? 3 : m)
      }
    }
  }
  return g
}

// The treeline's top edge at each x: rounded crowns and pointed firs, overlapping.
function skyline(r, base) {
  const edge = new Float32Array(W).fill(base)
  for (let cx = -60; cx < W + 60; cx += 50 + r() * 80) {
    if (r() < 0.3) {
      // a fir: a tall spire, its sides ragged with branches
      const hgt = 190 + r() * 120, hw = 60 + r() * 30
      for (let x = Math.max(0, Math.floor(cx - hw)); x < Math.min(W, cx + hw); x++) {
        const d = Math.abs(x - cx)
        edge[x] = Math.min(edge[x], base - hgt + (d / hw) * hgt * 0.8 - ((d % 22) / 22) * 26 * (d / hw))
      }
    } else {
      // a broadleaf crown
      const rad = 60 + r() * 75, top = base - 110 - r() * 140
      for (let x = Math.max(0, Math.floor(cx - rad)); x < Math.min(W, cx + rad); x++) {
        const dx = x - cx
        edge[x] = Math.min(edge[x], top + rad - Math.sqrt(Math.max(0, rad * rad - dx * dx)))
      }
    }
  }
  // leaves: the edge never runs straight for long
  for (let x = 0; x < W; x++) edge[x] -= (fbm(x / 12, 0.5, 31, 2) - 0.5) * 40
  return edge
}

export default {
  key: 'fireflies',
  name: 'Fireflies',
  tone: 'dark',
  accent: '#d6ff78',
  ink: '#14301f',
  alt: 'Fireflies blinking over a dark meadow, grass swaying',
  build(s) {
    const r = s.rand
    s.add(s.ground(s.linear([[0, '#0d1f18'], [0.5, '#0a1611'], [1, '#070e0b']], [0, 0, 0, H])))
    // a faint haze over the trees, the last of the light
    s.add(s.glow(W * 0.3, H * 0.42, 900, '#2f5c45', 0.22))
    s.add(s.glow(W * 0.85, H * 0.38, 700, '#29513f', 0.18))

    // stars, three groups on their own clocks
    stars(r, 110, (x, y) => y < H * 0.36 * (1 - 0.25 * Math.sin(x / 300)), { glyphs: "..'+*" }).forEach((g, i) => {
      s.add(s.twinkle(s.text(g, { paint: s.solid('#cfe8d6'), opacity: 0.55, cls: 'r' }), 0.15, 5 + i * 2.3, i * 0.3))
    })

    // the treeline far off: a dark silhouette of crowns and firs, leaves along its edge catching the last light
    const base = H * 0.6, top = Math.floor((base - 340) / CH), rows = Math.ceil(base / CH) - top + 1
    const edge = skyline(r, base)
    const shade = s.linear([[0, '#132b1f'], [1, '#0c1c14']], [0, base - 300, 0, base])
    const outline = Array.from({ length: 193 }, (_, i) => `${i * 10},${Math.round(edge[Math.min(W - 1, i * 10)])}`).join(' ')
    s.add(s.raw(`<polygon points="0,${base} ${outline} ${W},${base}" fill="${shade.ref}"/>`, [
      { k: 'paint', paint: { at: (x, y) => (y < edge[Math.min(W - 1, Math.floor(x))] || y > base ? [0, 0, 0, 0] : shade.at(x, y)) } },
    ]))
    const leaves = rasterize(COLS, rows, (x, y) => {
      const e = edge[Math.min(W - 1, Math.floor(x))] - top * CH
      if (y < e || y > e + 60) return null
      const l = (1 - (y - e) / 60) * fbm(x / 18, y / 12, 4, 2)
      return r() < 0.25 + l ? { l } : null
    }, { ramp: " .,:;+*", min: 0.25 })
    s.add(s.text(leaves, { y: top * CH, paint: s.linear([[0, '#3f7552'], [1, '#1d3d2a']], [0, 0, 0, rows * CH]), opacity: 0.85 }))

    // the meadow before the trees: a scatter of seed heads and dew catching the light
    const meadowTop = top + rows - 1
    const meadow = rasterize(COLS, ROWS_OF(H) - meadowTop, (x, y) => {
      const v = fbm(x / 90, y / 60, 21, 3)
      return v > 0.6 && r() < 0.22 ? { l: v - 0.45 } : null
    }, { ramp: " .,'`:;" })
    s.add(s.text(meadow, { y: meadowTop * CH, paint: s.linear([[0, '#3d6b4a'], [1, '#2a4c33']], [0, 0, 0, H - meadowTop * CH]), opacity: 0.55, cls: 'r' }))

    // tall grass along the bottom in tufts, taller toward the sides
    const tufts = []
    for (let x = 1; x < COLS; x += 2 + Math.floor(r() * 3)) {
      const side = Math.abs(x / COLS - 0.5) * 2
      const tall = 3 + side ** 1.5 * 12
      const n = 2 + Math.floor(r() * 3)
      const blades = Array.from({ length: n }, (_, b) => {
        const h = Math.min(GRASS_ROWS - 1, Math.max(2, Math.round(tall * (0.55 + r() * 0.6))))
        return { h, lean: (b - (n - 1) / 2) * 0.9 + (r() - 0.5) * 0.6, m: r() < 0.5 ? 2 : 1, seed: h > 9 && r() < 0.25 }
      })
      tufts.push({ x, blades, k: r() * 0.8 })
    }
    const paints = {
      1: s.linear([[0, '#2e5c37'], [1, '#0f2416']], [0, 0, 0, GRASS_ROWS * CH]),
      2: s.linear([[0, '#79ad60'], [0.55, '#33663a'], [1, '#14301b']], [0, 0, 0, GRASS_ROWS * CH]),
      3: s.solid('#c9d99a'),
    }
    const blades = Array.from({ length: SWAY }, (_, f) => {
      const g = grass(f, tufts)
      return s.group([1, 2, 3].map(m => s.text(g, { m, paint: paints[m] })))
    })
    s.add(s.group([s.frames(blades, 4.8)], { y: H - GRASS_ROWS * CH }))

    // the fireflies, wandering on small loops and blinking each on its own clock
    const flies = []
    for (let i = 0; i < 32; i++) {
      // most over the sides of the meadow, a few far off over the trees
      const far = i < 8
      const side = r() < 0.5 ? r() * 0.32 : 0.68 + r() * 0.32
      const x = (far ? r() : side) * W
      const y = far ? H * (0.38 + r() * 0.18) : H * (0.48 + r() * 0.42)
      const size = far ? 0.5 + r() * 0.2 : 0.8 + r() * 0.5
      const rad = (far ? 20 : 40) + r() * 50
      const pts = Array.from({ length: 6 }, (_, k) => {
        const a = (k / 6) * Math.PI * 2 + r() * 0.6
        return [x + Math.cos(a) * rad * (0.6 + r() * 0.6), y + Math.sin(a) * rad * 0.6 * (0.6 + r() * 0.6)]
      })
      pts.push(pts[0])
      const dot = new Grid(1, 1)
      dot.set(0, 0, far || r() < 0.4 ? '.' : '*')
      const body = s.group([
        s.glow(0, 0, 52 * size, '#c8ff5a', 0.5),
        s.glow(0, 0, 13 * size, '#f6ffd0', 0.95),
        s.text(dot, { x: -CW / 2, y: -CH / 2 - 2, paint: s.solid('#fbffe6') }),
      ])
      const lit = s.blink(body, 0.45 + r() * 0.3, 2.5 + r() * 3.5, r())
      flies.push(s.move(lit, pts, 16 + r() * 18, { phase: r() }))
    }
    s.add(...flies)
  },
}

function ROWS_OF(h) {
  return Math.ceil(h / CH)
}
