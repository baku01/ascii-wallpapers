// Neon Rain: a city skyline at night in the rain, windows flickering, neon signs humming over a wet street.
import { Grid } from '../lib/ascii.mjs'
import { CH, COLS, CW, H, ROWS, W } from '../lib/core.mjs'

// the street begins here: one row of cells below the last floor
const BASE = 57
const STREET = BASE * CH

const FRAME = 1, WARM = 2, COOL = 3, DARK = 4, BEACON = 5
// windows that come and go, each group on its own clock
const FLICKER = [6, 7, 8, 9, 10, 11]

// A skyline into one grid, so a row of every building is one line of text per material; and the
// bodies as one path. Each building is [first column, width, floors, style].
function skyline(rand, buildings, { base = BASE, lit = 0.45, flicker = 0.12, roofs = true } = {}) {
  const g = new Grid(COLS, ROWS)
  let d = ''
  for (const [x, w, h, style] of buildings) {
    const top = base - h
    d += `M${x * CW + 2} ${top * CH - 3}h${w * CW - 4}V${base * CH}h${-(w * CW - 4)}z`
    if (!roofs) continue
    // roofline and walls
    for (let c = x + 1; c < x + w - 1; c++) g.set(c, top - 1, '_', FRAME)
    for (let r = top; r < base; r++) {
      g.set(x, r, '|', FRAME)
      g.set(x + w - 1, r, '|', FRAME)
    }
    // windows, floor by floor
    const pane = { pair: '[]', block: '##', dots: '::', strip: '||' }[style]
    const stepX = style === 'strip' ? 2 : 3, stepY = style === 'block' ? 1 : 2
    for (let r = top + 1; r < base - 1; r += stepY) {
      if (style === 'pair' && (r - top) % 8 === 7) {
        for (let c = x + 1; c < x + w - 1; c++) g.set(c, r, '=', FRAME)
        continue
      }
      for (let c = x + 2; c + 1 < x + w - 1; c += stepX) {
        const on = rand() < lit
        const m = !on ? DARK : rand() < flicker ? FLICKER[Math.floor(rand() * FLICKER.length)] : rand() < 0.62 ? WARM : COOL
        g.put(c, r, pane, m)
      }
    }
    // a door at street level
    if (w > 10) g.put(x + Math.floor(w / 2) - 1, base - 1, '[_]', FRAME)
  }
  return { g, d }
}

// Antennas and a water tower on the tallest roofs; their warning lights blink red.
function roofs(g, beacons, buildings) {
  for (const [x, w, h, , extra] of buildings) {
    const top = BASE - h, mid = x + Math.floor(w / 2)
    if (extra === 'antenna') {
      for (let r = top - 2; r > top - 7; r--) g.set(mid, r, '|', FRAME)
      g.set(mid - 1, top - 4, '-', FRAME)
      g.set(mid + 1, top - 4, '-', FRAME)
      beacons.set(mid, top - 8, '*', BEACON)
    } else if (extra === 'tower') {
      g.put(mid - 2, top - 5, ' ___', FRAME)
      g.put(mid - 2, top - 4, '(___)', FRAME)
      g.put(mid - 2, top - 3, '|   |', FRAME)
      g.put(mid - 2, top - 2, '/| |\\', FRAME)
    } else if (extra === 'spire') {
      g.put(mid - 1, top - 2, '/_\\', FRAME)
      g.put(mid - 1, top - 3, '/ \\', FRAME)
      g.set(mid, top - 4, '|', FRAME)
      beacons.set(mid, top - 5, '*', BEACON)
    }
  }
}

// A vertical neon sign: a frame (1) round its letters (2).
function sign(word) {
  const g = new Grid(3, word.length + 2)
  g.put(0, 0, '.-.', 1)
  ;[...word].forEach((ch, i) => {
    g.set(0, i + 1, '|', 1)
    g.set(1, i + 1, ch, 2)
    g.set(2, i + 1, '|', 1)
  })
  g.put(0, word.length + 1, "'-'", 1)
  return g
}

// Rain: slanted streaks on a tile that slides down-left by exactly one tile, so it loops seamlessly.
function rain(rand, count, len, glyph) {
  const g = new Grid(60, 60)
  for (let k = 0; k < count; k++) {
    const c = Math.floor(rand() * 60), r = Math.floor(rand() * 60)
    for (let i = 0; i < len; i++) g.set(c - i, r + i, i === len - 1 && len > 1 ? '.' : glyph)
  }
  return g
}

export default {
  key: 'neonRain',
  name: 'Neon Rain',
  tone: 'dark',
  accent: '#ff4fa3',
  ink: '#1a1030',
  alt: 'A neon city skyline in the rain, windows flickering and reflections on the wet street',
  build(s) {
    const r = s.rand
    s.add(s.ground(s.linear([[0, '#07040f'], [0.55, '#120a24'], [1, '#1b1030']], [0, 0, 0, H])))
    // the city's own light low in the sky
    s.add(s.glow(520, 900, 760, '#ff4fa3', 0.14), s.glow(1450, 880, 700, '#38c9ff', 0.12), s.glow(960, 1000, 900, '#8a3cff', 0.12))

    // far skyline: bodies and a scatter of dim windows
    const farB = []
    for (let x = -2; x < COLS; ) {
      const w = 8 + Math.floor(r() * 12)
      farB.push([x, w, 16 + Math.floor(r() * 14), 'dots'])
      x += w - 1
    }
    const far = skyline(r, farB, { base: BASE - 1, roofs: false })
    const farWin = new Grid(COLS, ROWS)
    for (const [x, w, h] of farB) for (let k = 0; k < w * h * 0.05; k++) farWin.set(x + 1 + Math.floor(r() * (w - 2)), BASE - 1 - h + 1 + Math.floor(r() * (h - 2)), r() < 0.5 ? '.' : ':')
    const farFill = s.linear([[0, '#1a1133'], [1, '#110a22']], [0, 600, 0, STREET])
    const farShape = new Grid(COLS, ROWS)
    for (const [x, w, h] of farB) for (let c = x; c < x + w; c++) for (let rr = BASE - 1 - h; rr < BASE; rr++) farShape.set(c, rr, '@')
    s.add(s.raw(`<path d="${far.d}" fill="${farFill.ref}"/>`, [{ k: 'cells', grid: farShape, x: 0, y: 0, paint: farFill, a: 1, ox: 0, oy: 0 }]))
    s.add(s.text(farWin, { paint: s.solid('#6f5aa8'), cls: 'r', opacity: 0.6 }))

    // near skyline: tall on the sides, low in the middle where the chat sits
    const near = [
      [-1, 15, 33, 'block', 'tower'], [13, 19, 44, 'pair', 'antenna'], [31, 14, 27, 'dots'], [44, 13, 19, 'strip'],
      [56, 17, 13, 'pair'], [72, 15, 10, 'dots'], [86, 16, 12, 'block'], [101, 17, 11, 'pair'], [117, 14, 14, 'strip'],
      [130, 15, 23, 'dots'], [144, 20, 40, 'pair', 'spire'], [163, 15, 31, 'block'], [177, 16, 25, 'strip', 'antenna'],
    ]
    const city = skyline(r, near)
    const beacons = new Grid(COLS, ROWS)
    roofs(city.g, beacons, near)
    // the signs hang in front of the walls: nothing of the facade shows through them
    for (const [col, row, n] of [[28, 23, 7], [140, 19, 9], [9, 27, 5], [173, 34, 5]]) {
      for (let c = col - 1; c <= col + 4; c++) for (let rr = row; rr < row + Math.ceil(n * 1.3); rr++) {
        const i = rr * COLS + c
        if (c >= 0 && c < COLS && city.g.m[i] !== FRAME) { city.g.ch[i] = ' '; city.g.m[i] = 0 }
      }
    }
    const body = s.linear([[0, '#120b24'], [1, '#09050f']], [0, 300, 0, STREET])
    const bodyShape = new Grid(COLS, ROWS)
    for (const [x, w, h] of near) for (let c = x; c < x + w; c++) for (let rr = BASE - h; rr < BASE; rr++) bodyShape.set(c, rr, '@')
    s.add(s.raw(`<path d="${city.d}" fill="${body.ref}"/>`, [{ k: 'cells', grid: bodyShape, x: 0, y: 0, paint: body, a: 1, ox: 0, oy: 0 }]))
    s.add(s.text(city.g, { m: FRAME, paint: s.linear([[0, '#5b4a8c'], [1, '#2d2350']], [0, 200, 0, STREET]), cls: 'r' }))
    s.add(s.text(city.g, { m: DARK, paint: s.solid('#2a2047'), cls: 'r' }))
    s.add(s.text(city.g, { m: WARM, paint: s.linear([[0, '#ffe2a0'], [1, '#ffb85c']], [0, 300, 0, STREET]) }))
    s.add(s.text(city.g, { m: COOL, paint: s.linear([[0, '#b5f3ff'], [1, '#5fd2ff']], [0, 300, 0, STREET]) }))
    FLICKER.forEach((m, i) => s.add(s.blink(s.text(city.g, { m, paint: s.solid(i % 2 ? '#ffd27a' : '#8fe6ff') }), 0.55 + (i % 3) * 0.12, 9 + i * 4.3, i * 0.17)))
    s.add(s.blink(s.text(beacons, { paint: s.solid('#ff4f5e') }), 0.35, 2.4))

    // neon signs on the side buildings, humming and now and then stuttering
    const hum = s.keyframes('0%,100%{opacity:1}46%{opacity:.88}88%{opacity:1}89%{opacity:.25}90%{opacity:1}92%{opacity:.4}93%{opacity:1}')
    const signs = [
      { word: 'HOTEL', col: 28, row: 23, color: '#ff4fa3', frame: '#8a3468', dur: 7 },
      { word: 'NOODLES', col: 140, row: 19, color: '#38e1ff', frame: '#22677f', dur: 11 },
      { word: '24H', col: 9, row: 27, color: '#b07bff', frame: '#5a3894', dur: 5.5 },
      { word: 'BAR', col: 173, row: 34, color: '#ff8a3d', frame: '#874220', dur: 8.5 },
    ]
    const reflect = new Grid(COLS, 7)
    for (const [i, sg] of signs.entries()) {
      const g = sign(sg.word)
      const h = g.h * CH
      const glows = [0.2, 0.5, 0.8].map(t => s.glow(15, h * t, 75, sg.color, 0.34))
      const lit = s.group([s.scale(s.group([...glows, s.text(g, { m: 1, paint: s.solid(sg.frame) }), s.text(g, { m: 2, paint: s.solid(sg.color) })]), 1.3)], { x: sg.col * CW, y: sg.row * CH })
      s.add(s.animate(lit, hum, sg.dur, { phase: i * 0.29 }))
      // its smear on the wet street
      for (let k = 0; k < 14; k++) reflect.set(sg.col + Math.floor(r() * 3), Math.floor(r() * 6), r() < 0.5 ? '|' : r() < 0.5 ? ':' : '!', i + 1)
    }

    // the wet street, the signs and windows smeared in it
    const street = s.linear([[0, '#140c26'], [1, '#07040d']], [0, STREET, 0, H])
    const streetShape = new Grid(COLS, 7)
    for (let c = 0; c < COLS; c++) for (let rr = 0; rr < 7; rr++) streetShape.set(c, rr, '@')
    s.add(s.raw(`<rect y="${STREET}" width="${W}" height="${H - STREET}" fill="${street.ref}"/>`, [{ k: 'cells', grid: streetShape, x: 0, y: STREET, paint: street, a: 1, ox: 0, oy: 0 }]))
    for (const [x, w] of near) for (let k = 0; k < w * 0.35; k++) {
      const c = x + 1 + Math.floor(r() * (w - 2))
      if (!reflect.at(c, 0).trim()) reflect.set(c, Math.floor(r() * 5), r() < 0.6 ? ':' : "'", r() < 0.6 ? 5 : 6)
    }
    for (let k = 0; k < 120; k++) reflect.set(Math.floor(r() * COLS), Math.floor(r() * 7), r() < 0.7 ? '~' : '-', 7)
    const refl = signs.map((sg, i) => s.text(reflect, { m: i + 1, paint: s.linear([[0, sg.color, 0.7], [1, sg.color, 0.1]], [0, 0, 0, 120]) }))
    refl.push(s.text(reflect, { m: 5, paint: s.solid('#ffd27a'), opacity: 0.35 }), s.text(reflect, { m: 6, paint: s.solid('#8fe6ff'), opacity: 0.3 }))
    s.add(s.twinkle(s.group(refl, { y: STREET + 4, opacity: 0.85 }), 0.5, 3.2))
    for (const sg of signs) s.add(s.glow(sg.col * CW + 15, STREET + 40, 90, sg.color, 0.16))
    s.add(s.twinkle(s.text(reflect, { m: 7, y: STREET + 4, paint: s.solid('#5d6aa0'), cls: 'r', opacity: 0.6 }), 0.3, 2.1, 0.5))

    // rain in three depths, nearer falling faster and brighter
    for (const [count, len, glyph, color, a, dur] of [[110, 1, "'", '#6a74a8', 0.22, 4.6], [70, 2, '/', '#8590c4', 0.3, 2.7], [34, 3, '/', '#b4bfec', 0.42, 1.7]]) {
      s.add(s.move(s.tile(rain(r, count, len, glyph), { color, tw: 600, th: 1140, opacity: a, cls: len === 1 ? 'r' : undefined }), [[0, 0], [-600, 1140]], dur, { step: 57 }))
    }
  },
}
