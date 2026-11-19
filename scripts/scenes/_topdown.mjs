// Swimmers seen from above (Honu Lagoon, Koi Pond). Glyphs never rotate: a creature is rasterized once per
// heading, and while it travels a looping path the copy facing the way it's going is the one shown.
import { ROUND, rasterize } from '../lib/ascii.mjs'
import { CH, CW, num } from '../lib/core.mjs'

// The creature at every heading and swim frame: sprites[heading][frame]. `shape(u, v, f)` answers in the
// creature's own frame (u forward, v to its right, scene units from its centre), as rasterize's sample does.
// `remap(ch, m)` may trade a material's glyphs for its own set.
export function headings(s, { n, frames, w, h, shape, ramp, outline = ROUND, edge = 0.72, remap }) {
  const cx = (w * CW) / 2, cy = (h * CH) / 2
  return Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a)
    return Array.from({ length: frames }, (_, f) => {
      const g = rasterize(w, h, (x, y) => {
        const dx = x - cx, dy = y - cy
        return shape(dx * ca + dy * sa, -dx * sa + dy * ca, f)
      }, { outline, edge, ...(ramp ? { ramp } : {}) })
      return s.sprite(remap ? g.map(remap) : g)
    })
  })
}

// A closed loop of points around (cx, cy): an ellipse of radii (rx, ry) turned by `tilt` radians, its
// radius wandering by `wobble`, walked clockwise (dir 1) or anticlockwise (-1).
export function loop(cx, cy, rx, ry, { n = 28, tilt = 0, wobble = 0, dir = 1, seed = 0 } = {}) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = (dir * (i % n) * Math.PI * 2) / n
    const k = 1 + wobble * Math.sin(t * 2 + seed) * Math.cos(t * 3 + seed * 1.7)
    const x = Math.cos(t) * rx * k, y = Math.sin(t) * ry * k
    pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)])
  }
  return pts
}

// One swimmer travelling `pts` (its centre's path, closed) in `dur` seconds. Each heading's copy is shown
// only on the legs that head its way, by an opacity switch on the same clock as the move; its swim
// frames cycle every `beat` seconds.
export function swim(s, sprites, paints, { pts, dur, phase = 0, beat = 1.2, w, h, scale = 1, under = null }) {
  const n = sprites.length
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  const total = segs.reduce((a, b) => a + b, 0)
  const legHeading = segs.map((_, i) => {
    const a = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])
    return ((Math.round((a / (Math.PI * 2)) * n) % n) + n) % n
  })
  // which leg it's on when the scene opens: that heading alone shows in the thumbnail
  let d = (phase % 1) * total, leg = 0
  while (leg < segs.length - 1 && d > segs[leg]) d -= segs[leg++]
  const used = [...new Set(legHeading)]
  const copies = used.map(k => {
    let acc = 0, last = -1
    const keys = []
    segs.forEach((len, i) => {
      const on = legHeading[i] === k ? 1 : 0
      if (on !== last) keys.push(`${num((acc / total) * 100)}%{opacity:${on}}`)
      last = on
      acc += len
    })
    keys.push(`100%{opacity:${last}}`)
    const body = s.frames(sprites[k].map(place => place(paints)), beat, phase * 3.7)
    const shown = s.animate(body, s.keyframes(keys.join('')), dur, { phase, timing: 'step-end' })
    return { svg: shown.svg, ops: k === legHeading[leg] ? shown.ops : [] }
  })
  // `under` (a shadow, say) sits beneath it, in units from its centre; `scale` sizes the whole swimmer
  const centred = s.group([...(under ? [under] : []), s.group(copies, { x: (-w * CW) / 2, y: (-h * CH) / 2 })])
  return s.move(scale === 1 ? centred : s.scale(centred, scale), pts, dur, { phase })
}
