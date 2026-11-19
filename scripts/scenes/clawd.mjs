// Claude Code: a spark of ASCII rays turning slowly in a warm glow, code glyphs rising through the dark.
import { Grid, rasterize } from '../lib/ascii.mjs'
import { CH, CW, H, W, clamp } from '../lib/core.mjs'
import { specks } from '../lib/shapes.mjs'

const RAYS = 12
const FRAMES = 8
// the spark turns through two rays' worth of angle in one cycle of frames, so long and short rays line up again
const SWEEP = (2 * Math.PI * 2) / RAYS
const GW = 76, GH = 38
const CX = (GW / 2) * CW, CY = (GH / 2) * CH

// One frame of the spark: tapered rays, long and short in turn (1), and a dense hub (2).
function spark(f) {
  const rot = (f / FRAMES) * SWEEP
  return rasterize(GW, GH, (x, y) => {
    const dx = x - CX, dy = y - CY
    const r = Math.hypot(dx, dy)
    if (r < 44) return { m: 2, l: 1 - r / 90 }
    const a = Math.atan2(dy, dx)
    let best = null
    for (let k = 0; k < RAYS; k++) {
      const len = k % 2 ? 230 : 345
      if (r > len) continue
      const th = (k / RAYS) * Math.PI * 2 + rot
      // distance from the ray's spine, across it
      let d = a - th
      d = Math.atan2(Math.sin(d), Math.cos(d))
      const across = Math.abs(Math.sin(d) * r)
      if (Math.cos(d) <= 0) continue
      const t = r / len
      const half = 40 * (1 - t) ** 0.9 + 3
      if (across > half) continue
      const l = clamp(0.22 + 0.78 * (1 - t) ** 0.8 * (1 - (across / half) * 0.5))
      if (!best || l > best.l) best = { m: 1, l }
    }
    return best
  }, { ramp: ' .:-=+*#%@', min: 0.34 })
}

const TOKENS = ['{ }', '=>', ';', '</>', '[ ]', '&&', '//', 'fn', '( )', '=', '*', '{', '}', '::', '!=', '++', '<=', '0x', '#', '$', '|>', '...', '?', 'let', 'if', '[]', '%', '->']

export default {
  key: 'clawd',
  name: 'Claude Code',
  tone: 'dark',
  accent: '#d97757',
  ink: '#2a1d17',
  alt: 'A spark of ASCII rays turning slowly in a warm glow, code glyphs rising',
  build(s) {
    const r = s.rand
    s.add(s.ground(s.linear([[0, '#261c17'], [0.55, '#17110e'], [1, '#0d0a09']], [W, 0, W * 0.35, H])))
    s.add(s.glow(1460, 400, 820, '#d97757', 0.22))
    s.add(s.glow(240, H + 120, 700, '#7a3a22', 0.18))

    // dust hanging in the warm air, rising very slowly
    s.add(s.move(s.tile(specks(r, 56, 36, 46, ".'`"), { color: '#c99a80', tw: 560, th: 684, opacity: 0.22, cls: 'r' }), [[0, 0], [0, -684]], 160))

    // code glyphs rising a cell at a time in loose columns, faint, each on its own clock
    const lanes = 32
    for (let i = 0; i < lanes; i++) {
      const tok = TOKENS[Math.floor(r() * TOKENS.length)]
      const g = new Grid(tok.length, 1)
      g.put(0, 0, tok)
      // keep the brighter ones out of the chat's column
      const x = Math.round((i / lanes) * (W - 80) + 30 + r() * 30)
      const mid = Math.abs(x - W / 2) < W * 0.26
      const a = mid ? 0.1 + r() * 0.08 : 0.2 + r() * 0.22
      const color = r() < 0.35 ? '#d98a6a' : '#b8a395'
      const el = s.text(g, { paint: s.solid(color), opacity: a, cls: r() < 0.5 ? 'r' : undefined })
      const dur = 60 + r() * 70
      s.add(s.move(el, [[x, H + 30], [x, -40]], dur, { phase: r(), step: CH }))
    }

    // the spark: a soft breathing glow, then the rays turning a frame at a time
    s.add(s.twinkle(s.glow(1460, 400, 360, '#f2a07c', 0.38), 0.55, 7))
    const paint = s.radial([[0, '#fff1e8'], [0.14, '#f6c2a6'], [0.5, '#d97757'], [1, '#9c4528']], [CX, CY, 345])
    const frames = Array.from({ length: FRAMES }, (_, f) => {
      const g = spark(f)
      return s.group([s.text(g, { paint, m: 1 }), s.text(g, { paint: s.solid('#fff3ea'), m: 2 })])
    })
    s.add(s.group([s.frames(frames, FRAMES * 1.25)], { x: 1460 - CX, y: 400 - CY }))

    // a faint prompt waiting bottom left
    const prompt = new Grid(2, 1)
    prompt.put(0, 0, '>')
    const cursor = new Grid(1, 1)
    cursor.put(0, 0, '_')
    s.add(s.text(prompt, { paint: s.solid('#d97757'), x: 70, y: H - 150, opacity: 0.45 }))
    s.add(s.blink(s.text(cursor, { paint: s.solid('#f0d6c8'), x: 90, y: H - 150, opacity: 0.6 }), 0.5, 1.1, 0.1))
  },
}
