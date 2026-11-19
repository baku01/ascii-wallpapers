// A scene: layers of character cells, each a few lines of SVG text, moved and flickered by CSS animation.
// Every element also carries plain drawing ops, so the picker's thumbnail is painted from the same scene.
import { ink } from './ascii.mjs'
import { BASE, CH, CW, H, W, clamp, hex, lerp, num, rgb, rng } from './core.mjs'

// Glyphs as the markup spells them. Claude Desktop measures a scene before it draws it and leaves out one whose
// '\\' marks, '--' runs and unclosed brackets add up past its limits, so those glyphs are swapped for look-alikes
// of the same width in Menlo; and the engine refuses '/*' outside a CSS comment, so a '*' after a '/' sits in a
// tspan of its own.
const SWAP = { '\\': '∖', '(': '❨', ')': '❩', '{': '❴', '}': '❵', '[': '⌈', ']': '⌉', '-': '‐' }
const esc = s => [...s].map(c => SWAP[c] ?? c).join('').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\/\*/g, '/<tspan>*</tspan>')

// Gradient stops are [offset, colour] or [offset, colour, opacity].
function stopsSvg(stops) {
  return stops.map(([o, c, a]) => `<stop offset="${num(o)}" stop-color="${c}"${a === undefined || a === 1 ? '' : ` stop-opacity="${num(a)}"`}/>`).join('')
}
function stopsAt(stops, t) {
  t = clamp(t)
  let i = 0
  while (i < stops.length - 2 && t > stops[i + 1][0]) i++
  const [o0, c0, a0 = 1] = stops[i], [o1, c1, a1 = 1] = stops[Math.min(i + 1, stops.length - 1)]
  const k = o1 === o0 ? 0 : clamp((t - o0) / (o1 - o0))
  const x = rgb(c0), y = rgb(c1)
  return [...x.map((v, j) => lerp(v, y[j], k)), lerp(a0, a1, k)]
}

// shift a list of drawing ops by (dx, dy), fading them by a; or scale them about the origin
const shift = (ops, dx, dy, a = 1) => ops.map(o => ({ ...o, ox: (o.ox ?? 0) + dx, oy: (o.oy ?? 0) + dy, a: (o.a ?? 1) * a }))
const zoom = (ops, k) => ops.map(o => ({ ...o, ox: (o.ox ?? 0) * k, oy: (o.oy ?? 0) * k, sc: (o.sc ?? 1) * k }))

export class Scene {
  constructor(seed = 1) {
    this.rand = rng(seed)
    this.defs = []
    this.kfs = new Map()
    this.css = []
    this.layers = []
    this.n = 0
  }

  id() {
    return 'p' + (this.n++).toString(36)
  }

  // ---------- paints ----------

  solid(color) {
    const c = rgb(color)
    return { ref: color, at: () => [...c, 1] }
  }
  // a linear gradient from (x1, y1) to (x2, y2), in the coordinates of the element it fills
  linear(stops, [x1, y1, x2, y2]) {
    const id = this.id()
    const def = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}">${stopsSvg(stops)}</linearGradient>`
    this.defs.push(def)
    const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy || 1
    return { ref: `url(#${id})`, def, at: (x, y) => stopsAt(stops, ((x - x1) * dx + (y - y1) * dy) / len2) }
  }
  radial(stops, [cx, cy, r]) {
    const id = this.id()
    const def = `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}">${stopsSvg(stops)}</radialGradient>`
    this.defs.push(def)
    return { ref: `url(#${id})`, def, at: (x, y) => stopsAt(stops, Math.hypot(x - cx, y - cy) / r) }
  }

  keyframes(body) {
    let name = this.kfs.get(body)
    if (!name) {
      name = "k" + this.kfs.size.toString(36)
      this.kfs.set(body, name)
    }
    return name
  }

  // ---------- elements: { svg, ops } ----------

  // the whole scene's box filled with a paint
  ground(paint) {
    return { svg: `<rect width="${W}" height="${H}" fill="${paint.ref}"/>`, ops: [{ k: 'paint', paint }] }
  }
  // a soft light: a circle filled with a gradient fading out from its centre
  glow(cx, cy, r, color, opacity = 1) {
    const paint = this.radial([[0, color, opacity], [0.45, color, opacity * 0.35], [1, color, 0]], [cx, cy, r])
    return { svg: `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" fill="${paint.ref}"/>`, ops: [{ k: 'glow', cx, cy, r, paint, a: 1 }] }
  }
  // a grid's cells (of one material, or all) as rows of text at (x, y), filled with a paint
  text(grid, { paint, m, x = 0, y = 0, opacity = 1, cls } = {}) {
    const rows = grid.runs(m)
    if (!rows.length) return { svg: '', ops: [] }
    // no textLength: the font is sized so a glyph's advance is one cell, and textLength makes every repaint
    // lay each glyph out again, which Desktop's per-frame check can't afford
    const body = rows.map(([r, c, s]) => `<text x="${c * CW}" y="${r * CH + BASE}">${esc(s)}</text>`).join('')
    const attrs = [
      x || y ? ` transform="translate(${num(x)} ${num(y)})"` : '',
      // a CSS variable can't be a presentation attribute
      paint.ref.startsWith('var(') ? ` style="fill:${paint.ref}"` : ` fill="${paint.ref}"`,
      opacity < 1 ? ` opacity="${num(opacity)}"` : '',
      cls ? ` class="${cls}"` : '',
    ].join('')
    return { svg: `<g${attrs}>${body}</g>`, ops: [{ k: 'cells', grid, m, x, y, paint, a: opacity, ox: 0, oy: 0 }] }
  }

  // A grid drawn once into <defs>, each material filled by a CSS variable (--m1, --m2, ...): the returned
  // function places a copy filled with the paints given per material, so many creatures share one drawing.
  sprite(grid) {
    const id = this.id()
    const mats = grid.materials()
    this.defs.push(`<g id="${id}">${mats.map(m => this.text(grid, { m, paint: { ref: `var(--m${m})` } }).svg).join('')}</g>`)
    return paints => ({
      svg: `<use href="#${id}" style="${mats.map(m => `--m${m}:${paints[m].ref}`).join(';')}"/>`,
      ops: mats.map(m => ({ k: 'cells', grid, m, x: 0, y: 0, paint: paints[m], a: 1, ox: 0, oy: 0 })),
    })
  }

  // A grid repeated as a tw x th tile over a rect one tile larger than the scene on each side, so
  // moving it by one tile loops without a seam. Too fine to show in the thumbnail.
  tile(grid, { color, tw, th, opacity = 1, cls }) {
    const id = this.id()
    this.defs.push(`<pattern id="${id}" patternUnits="userSpaceOnUse" width="${tw}" height="${th}">${this.text(grid, { paint: { ref: color } }).svg}</pattern>`)
    const attrs = (opacity < 1 ? ` opacity="${num(opacity)}"` : '') + (cls ? ` class="${cls}"` : '')
    return { svg: `<rect x="${-tw}" y="${-th}" width="${W + 2 * tw}" height="${H + 2 * th}" fill="url(#${id})"${attrs}/>`, ops: [] }
  }
  // markup drawn as it is; the thumbnail draws it too, unless `ops` say how to show it there
  raw(svg, ops = [{ k: 'vector', svg }]) {
    return { svg, ops }
  }
  // several elements as one, optionally placed and faded
  group(els, { x = 0, y = 0, opacity = 1, cls } = {}) {
    const attrs = [x || y ? ` transform="translate(${num(x)} ${num(y)})"` : '', opacity < 1 ? ` opacity="${num(opacity)}"` : '', cls ? ` class="${cls}"` : ''].join('')
    return { svg: `<g${attrs}>${els.map(e => e.svg).join('')}</g>`, ops: shift(els.flatMap(e => e.ops), x, y, opacity) }
  }

  scale(el, k) {
    return { svg: `<g transform="scale(${num(k)})">${el.svg}</g>`, ops: zoom(el.ops, k) }
  }

  // ---------- motion ----------

  // An element wrapped in a CSS animation. `phase` (0..1) is where in its cycle the animation starts.
  // `at` is where it stands without animation: Desktop shows a still copy of the scene with every animation
  // taken out until the moving one plays, and falls back to it.
  animate(el, name, dur, { phase = 0, timing = 'linear', vars = '', at } = {}) {
    const delay = -(phase % 1) * dur
    const style = `${vars}animation:${name} ${num(dur)}s ${num(delay)}s ${timing} infinite`
    const base = at ? ` transform="translate(${num(at[0])} ${num(at[1])})"` : ''
    return { svg: `<g${base} style="${style}">${el.svg}</g>`, ops: el.ops }
  }

  // Travels through points (scene units) at an even speed, looping from the last to the first.
  move(el, pts, dur, { phase = 0 } = {}) {
    const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
    const total = segs.reduce((a, b) => a + b, 0) || 1
    // where it stands when the scene opens, for the thumbnail and the still copy
    let d = (phase % 1) * total, i = 0
    while (i < segs.length - 1 && d > segs[i]) d -= segs[i++]
    const k = segs[i] ? d / segs[i] : 0
    const at = [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]
    const placed = { svg: el.svg, ops: shift(el.ops, at[0], at[1]) }
    if (pts.length === 2) {
      const [[x0, y0], [x1, y1]] = pts
      const name = this.keyframes('from{transform:translate(var(--x0),var(--y0))}to{transform:translate(var(--x1),var(--y1))}')
      return this.animate(placed, name, dur, { phase, at, vars: `--x0:${num(x0)}px;--y0:${num(y0)}px;--x1:${num(x1)}px;--y1:${num(y1)}px;` })
    }
    let acc = 0
    const body = pts.map((p, j) => {
      const pct = (acc / total) * 100
      if (j < segs.length) acc += segs[j]
      return `${num(pct)}%{transform:translate(${num(p[0])}px,${num(p[1])}px)}`
    }).join('')
    return this.animate(placed, this.keyframes(body), dur, { phase, at })
  }

  // A gentle back-and-forth by (dx, dy), eased.
  sway(el, dx, dy, dur, phase = 0) {
    const name = this.keyframes('50%{transform:translate(var(--sx),var(--sy))}')
    return this.animate(el, name, dur, { phase, timing: 'ease-in-out', vars: `--sx:${num(dx)}px;--sy:${num(dy)}px;` })
  }

  // Fades between full and `low` opacity.
  twinkle(el, low, dur, phase = 0) {
    const name = this.keyframes('50%{opacity:var(--lo)}')
    return this.animate(el, name, dur, { phase, timing: 'ease-in-out', vars: `--lo:${num(low)};` })
  }

  // Lit for `on` of each cycle (0..1), dark the rest, with soft edges.
  blink(el, on, dur, phase = 0) {
    const a = num(on * 25), b = num(on * 50), c = num(on * 100)
    const name = this.keyframes(`0%{opacity:0}${a}%,${b}%{opacity:1}${c}%,100%{opacity:0}`)
    const lit = (phase % 1) < on
    return { ...this.animate(el, name, dur, { phase, timing: 'ease-in-out' }), ops: lit ? el.ops : [] }
  }

  // Shows the elements one after another, each for an equal share of `dur`, each fading into the next over
  // half its share so the glyphs melt from frame to frame. `discrete` swaps them outright instead.
  frames(els, dur, phase = 0, { discrete = false } = {}) {
    const n = els.length
    if (n === 1) return els[0]
    const slot = 100 / n, f = slot / 2
    const name = this.keyframes(discrete
      ? `0%{visibility:visible}${num(slot)}%,100%{visibility:hidden}`
      : `0%{opacity:.5}${num(f / 2)}%,${num(slot - f / 2)}%{opacity:1}${num(slot + f / 2)}%,${num(100 - f / 2)}%{opacity:0}100%{opacity:.5}`)
    const shown = Math.floor(((phase % 1) + 1) % 1 * n) % n
    const svg = els.map((e, i) => {
      const delay = -(((n - i) % n) / n + (phase % 1)) * dur
      // only the frame showing as the scene opens is drawn in the still copy
      const base = i === shown ? '' : discrete ? ' visibility="hidden"' : ' opacity="0"'
      return `<g${base} style="animation:${name} ${num(dur)}s ${num(delay % dur)}s ${discrete ? 'step-end' : 'linear'} infinite">${e.svg}</g>`
    }).join('')
    return { svg: `<g>${svg}</g>`, ops: els[shown].ops }
  }

  add(...els) {
    this.layers.push(...els)
    return this
  }

  // ---------- output ----------

  // 16.6px: Menlo's advance (0.602em) is then one 10-unit cell
  svg({ font = 16.6, weight = 700 } = {}) {
    const keyframes = [...this.kfs].map(([body, name]) => `@keyframes ${name}{${body}}`).join('')
    const style = `text{font:${weight} ${font}px Menlo,ui-monospace,SFMono-Regular,"DejaVu Sans Mono",Consolas,monospace;white-space:pre}`
      + 'g{transform-box:view-box;transform-origin:0 0}.r{font-weight:400}'
      + this.css.join('')
      + keyframes
      + '@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}'
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xml:space="preserve">`
      + `<style>${style}</style><defs>${this.defs.join('')}</defs>${this.layers.map(l => l.svg).join('')}</svg>`
  }

  // The picker's thumbnail: the scene as it opens, cropped to its middle 16:9. Grounds and glows are drawn as
  // the scene draws them (smooth gradients, a few bytes); the character cells as 64 x 36 pixels of colour.
  card() {
    const cw = 64, chh = 36, px = W / cw, y0 = (H - chh * px) / 2
    const defs = new Set(), vec = []
    const buf = Array.from({ length: cw * chh }, () => [0, 0, 0, 0])
    const byId = new Map(this.defs.map(d => [/id="([^"]+)"/.exec(d)?.[1], d]))
    const needs = svg => { for (const [, id] of svg.matchAll(/url\(#([^)]+)\)/g)) if (byId.has(id)) defs.add(byId.get(id)) }
    const at = (i, f) => f(((i % cw) + 0.5) * px, y0 + (Math.floor(i / cw) + 0.5) * px)
    const over = (b, c, al) => {
      for (let t = 0; t < 3; t++) b[t] = c[t] * al + b[t] * (1 - al)
      b[3] = al + b[3] * (1 - al)
    }
    for (const op of this.layers.flatMap(l => l.ops)) {
      const ox = op.ox ?? 0, oy = op.oy ?? 0, a = op.a ?? 1, sc = op.sc ?? 1
      const tf = ox || oy || sc !== 1 ? ` transform="translate(${num(ox)} ${num(oy)}) scale(${num(sc)})"` : ''
      const alpha = a < 1 ? ` opacity="${num(a)}"` : ''
      // what the scene draws as vectors, the card draws the same way
      if (op.k === 'vector') {
        needs(op.svg)
        vec.push(`<g${tf}${alpha}>${op.svg}</g>`)
        continue
      }
      // a glow smaller than a few card pixels doesn't show there
      if (op.k === "glow" && op.r * sc < 36) continue
      if ((op.k === 'paint' || op.k === 'glow') && op.paint?.ref) {
        needs(op.paint.ref)
        vec.push(op.k === 'paint'
          ? `<rect width="${W}" height="${H}" fill="${op.paint.ref}"${alpha}/>`
          : `<circle cx="${num(op.cx)}" cy="${num(op.cy)}" r="${num(op.r)}" fill="${op.paint.ref}"${alpha}${tf}/>`)
        continue
      }
      // a ground or glow given only as a function of the point: painted pixel by pixel
      if (op.k === 'paint') {
        buf.forEach((b, i) => { const c = at(i, op.paint.at); over(b, c, (c[3] ?? 1) * a) })
        continue
      }
      if (op.k === 'glow') {
        buf.forEach((b, i) => {
          const d = at(i, (x, y) => Math.hypot(x - op.cx * sc - ox, y - op.cy * sc - oy) / (op.r * sc))
          if (d < 1) over(b, op.color, a * (1 - d) ** 1.6)
        })
        continue
      }
      // cells: each card pixel takes the average colour of the glyphs in it, as opaque as their ink
      const acc = new Map()
      const g = op.grid
      for (let r = 0; r < g.h; r++) for (let c = 0; c < g.w; c++) {
        const j = r * g.w + c
        if (!g.m[j] || (op.m !== undefined && g.m[j] !== op.m)) continue
        const lx = op.x + (c + 0.5) * CW, ly = op.y + (r + 0.5) * CH
        const gx = lx * sc + ox, gy = ly * sc + oy - y0
        if (gx < 0 || gy < 0 || gx >= W || gy >= chh * px) continue
        const i = Math.floor(gy / px) * cw + Math.floor(gx / px)
        const col = op.paint.at(lx - op.x, ly - op.y)
        const w = ink(g.ch[j]) * (col[3] ?? 1)
        const s = acc.get(i) ?? [0, 0, 0, 0]
        for (let t = 0; t < 3; t++) s[t] += col[t] * w
        s[3] += w
        acc.set(i, s)
      }
      const cells = (px * px) / (CW * CH * sc * sc)
      for (const [i, s] of acc) over(buf[i], s.slice(0, 3).map(v => v / s[3]), clamp((s[3] / cells) * 2.2) * a)
    }
    // pixels grouped by rounded colour and opacity, rows run-length coded, in scene units
    const groups = new Map()
    for (let y = 0; y < chh; y++) {
      let x = 0
      const key = i => {
        const b = buf[i]
        if (b[3] < 0.08) return null
        const op = Math.min(1, Math.round(b[3] * 10) / 10)
        return `${hex(b.slice(0, 3).map(v => Math.round(v / b[3] / 17) * 17))}|${op}`  // b holds colour premultiplied by b[3]
      }
      while (x < cw) {
        const k = key(y * cw + x)
        let e = x + 1
        while (e < cw && key(y * cw + e) === k) e++
        if (k) groups.set(k, (groups.get(k) ?? '') + `M${x} ${y}h${e - x}v1h-${e - x}z`)
        x = e
      }
    }
    const pixels = [...groups].map(([k, d]) => {
      const [c, o] = k.split('|')
      return `<path fill="${c}"${o === '1' ? '' : ` fill-opacity="${o}"`} d="${d}"/>`
    }).join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${num(y0)} ${W} ${num(chh * px)}"><defs>${[...defs].join('')}</defs>${vec.join('')}`
      + `<g transform="translate(0 ${num(y0)}) scale(${num(px)})" shape-rendering="crispEdges">${pixels}</g></svg>`
  }
}
