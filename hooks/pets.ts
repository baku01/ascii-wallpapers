// The pets that sit on the edge of the prompt, all in Clawd's pixel style. Each is one small SVG animated by CSS
// (idle frames, a bob), and a fresh hop count is a fresh drawing, so the hop and its sparks play again on a pick.

export type PetKey = 'clawd' | 'cat' | 'dog' | 'ghost' | 'frog' | 'octopus' | 'duck' | 'bunny' | 'robot'

// A pet in Clawd's own style: a 16-cell-wide pixel sprite, its body shaded in a two-tone check, shown frame by
// frame (each `step` seconds). In a frame '.' is empty, '#' the body, and any other letter a colour of `paint`.
type Pixel = { name: string; step: number; body: [string, string]; paint: Record<string, string>; frames: string[][] }

const PIXEL: Record<Exclude<PetKey, 'clawd'>, Pixel> = {
  cat: {
    name: 'Cat',
    step: 0.3,
    body: ['#e8954f', '#f0a868'],
    paint: { o: '#2a1a10', p: '#ff9db4', d: '#b86b2c', w: '#fff1df' },
    frames: [
      ['..d.........d...', '..##.......##...', '..###########...', '..#o#######o#...', '..#o##ppp##o#...', '..#####w#####.d.', '...#########..d.', '..###########.d.', '..############d.', '..###########...', '...#.#...#.#....'],
      ['..d.........d...', '..##.......##...', '..###########...', '..#o#######o#...', '..#o##ppp##o#...', '..#####w#####...', '...#########.dd.', '..###########.d.', '..############d.', '..###########...', '..#.#.....#.#...'],
      ['..d.........d...', '..##.......##...', '..###########...', '..#o#######o#...', '..#o##ppp##o#...', '..#####w#####...', '...#########....', '..###########ddd', '..############..', '..###########...', '...#.#...#.#....'],
      ['..d.........d...', '..##.......##...', '..###########...', '..###########...', '..#o##ppp##o#...', '..#####w#####...', '...#########.dd.', '..###########.d.', '..############d.', '..###########...', '..#.#.....#.#...'],
    ],
  },
  dog: {
    name: 'Dog',
    step: 0.18,
    body: ['#e2b483', '#ebc296'],
    paint: { o: '#2a1d14', d: '#8a5a33', p: '#ff7a8a' },
    frames: [
      ['...##########...', '..############..', 'dd############dd', 'dd##o######o##dd', 'dd##o######o##dd', '.d#####oo#####d.', '..#####pp#####..', '...##########..d', '..############d.', '..############..', '..##.##..##.##..'],
      ['...##########...', '..############..', 'dd############dd', 'dd##o######o##dd', 'dd##o######o##dd', '.d#####oo#####d.', '..############..', '...##########.d.', '..############d.', '..############..', '...##.##..##.##.'],
      ['...##########...', '..############..', 'dd############dd', 'dd##o######o##dd', 'dd##o######o##dd', '.d#####oo#####d.', '..#####pp#####..', '...##########...', '..############dd', '..############..', '..##.##..##.##..'],
      ['...##########...', '..############..', 'dd############dd', 'dd############dd', 'dd##o######o##dd', '.d#####oo#####d.', '..############..', '...##########.d.', '..############d.', '..############..', '...##.##..##.##.'],
    ],
  },
  ghost: {
    name: 'Ghost',
    step: 0.3,
    body: ['#e4e9fb', '#f4f6ff'],
    paint: { o: '#3a3f66', p: '#ffb3cf' },
    frames: [
      ['.....######.....', '...##########...', '..############..', '.###o####o#####.', '.###o####o#####.', '.##p########p##.', '.######oo######.', '.##############.', '.##############.', '.###.####.####..', '.#....##....##..'],
      ['.....######.....', '...##########...', '..############..', '.###o####o#####.', '.###o####o#####.', '.##p########p##.', '.######oo######.', '.##############.', '.##############.', '..####.####.###.', '..##....##....#.'],
      ['.....######.....', '...##########...', '..############..', '.#####o####o###.', '.#####o####o###.', '.##p########p##.', '.#######oo#####.', '.##############.', '.##############.', '.###.####.####..', '.#....##....##..'],
      ['.....######.....', '...##########...', '..############..', '.##############.', '.###o####o#####.', '.##p########p##.', '.######oo######.', '.##############.', '.##############.', '..####.####.###.', '..##....##....#.'],
    ],
  },
  frog: {
    name: 'Frog',
    step: 0.32,
    body: ['#6cc65c', '#7ed36e'],
    paint: { w: '#f6ffe0', o: '#1d2a14', d: '#3f8f3a', p: '#c9f29a' },
    frames: [
      ['..www......www..', '.wwoww....wwoww.', '.wwwww####wwwww.', '.##############.', '################', '##dddddddddddd##', '.####pppppp####.', '..############..', '.##..##..##..##.'],
      ['..www......www..', '.wwoww....wwoww.', '.wwwww####wwwww.', '.##############.', '################', '##dddddddddddd##', '.##pppppppppp##.', '..##pppppppp##..', '.##..##..##..##.'],
      ['..www......www..', '.wwoww....wwoww.', '.wwwww####wwwww.', '.##############.', '################', '##dddddddddddd##', '.####pppppp####.', '..############..', '.##..##..##..##.'],
      ['..www......www..', '.wwwww....wwwww.', '.wddddd##dddddw.', '.##############.', '################', '##dddddddddddd##', '.####pppppp####.', '..############..', '.##..##..##..##.'],
    ],
  },
  octopus: {
    name: 'Octopus',
    step: 0.24,
    body: ['#ff7fa6', '#ff94b6'],
    paint: { o: '#3a1426', d: '#d4567f', p: '#ffd3e1' },
    frames: [
      ['.....######.....', '...##########...', '..############..', '..##o######o##..', '..##o######o##..', '..#p########p#..', '...##########...', '..d.dd.dd.dd.d..', '.d..d..d..d..d..', 'd...d.d....d.d..'],
      ['.....######.....', '...##########...', '..############..', '..##o######o##..', '..##o######o##..', '..#p########p#..', '...##########...', '..d.dd.dd.dd.d..', '..d..d..d..d..d.', '..d.d....d.d...d'],
      ['.....######.....', '...##########...', '..############..', '..##o######o##..', '..##o######o##..', '..#p########p#..', '...##########...', '..d.dd.dd.dd.d..', '..d.d..dd..d.d..', '.d..d..dd..d..d.'],
      ['.....######.....', '...##########...', '..############..', '..############..', '..##o######o##..', '..#p########p#..', '...##########...', '..d.dd.dd.dd.d..', '.d..d..d..d..d..', 'd...d.d....d.d..'],
    ],
  },
  duck: {
    name: 'Duck',
    step: 0.26,
    body: ['#ffd84a', '#ffe270'],
    paint: { a: '#ff9a3c', o: '#2a2210', d: '#e0a800' },
    frames: [
      ['.....#####......', '....#######.....', '....##o####.....', '.aaa#######.....', '..aa######......', '...#########....', '..####dddd####..', '..#############.', '...###########..', '....aa...aa.....'],
      ['.....#####......', '....#######.....', '....##o####.....', '.aaa#######.....', '..aa######......', '...#########....', '..###dddd#####..', '..#############.', '...###########..', '.....aa...aa....'],
      ['......#####.....', '.....#######....', '.....##o####....', '..aaa#######....', '...aa######.....', '...#########....', '..####dddd####..', '..#############.', '...###########..', '....aa...aa.....'],
      ['......#####.....', '.....#######....', '.....#######....', '..aaa#######....', '...aa######.....', '...#########....', '..###dddd#####..', '..#############.', '...###########..', '.....aa...aa....'],
    ],
  },
  bunny: {
    name: 'Bunny',
    step: 0.3,
    body: ['#eeeaf3', '#f8f6fb'],
    paint: { p: '#ffb3cf', o: '#3a2f45', d: '#c9bfd6' },
    frames: [
      ['...#p#....#p#...', '...#p#....#p#...', '...#p#....#p#...', '..############..', '..##o######o##..', '..#####pp#####..', '..#d###oo###d#..', '...##########...', '..############..', '..###......###..'],
      ['...#p#....#p#...', '...#p#....#p#...', '...#p#....#p#...', '..############..', '..##o######o##..', '..######p#####..', '..#d###oo###d#..', '...##########...', '..############..', '..###......###..'],
      ['...#p#..........', '...#p#....##p#..', '...#p#....#p#...', '..############..', '..##o######o##..', '..#####pp#####..', '..#d###oo###d#..', '...##########...', '..############..', '..###......###..'],
      ['...#p#....#p#...', '...#p#....#p#...', '...#p#....#p#...', '..############..', '..############..', '..#####pp#####..', '..#d###oo###d#..', '...##########...', '..############..', '..###......###..'],
    ],
  },
  robot: {
    name: 'Robot',
    step: 0.28,
    body: ['#a9b6c9', '#bcc7d8'],
    paint: { e: '#5ef0ff', a: '#ff5a6e', m: '#ffd166', d: '#6f7f99', k: '#2b3445' },
    frames: [
      ['.......aa.......', '.......dd.......', '..############..', '..#kkk####kkk#..', '..#kek####kek#..', '..############..', '..###mmmmmm###..', 'd.############.d', 'd.############.d', '...dd......dd...'],
      ['.......kk.......', '.......dd.......', '..############..', '..#kkk####kkk#..', '..#eek####eek#..', '..############..', '..###m.mm.m###..', '.d############d.', '.d############d.', '...dd......dd...'],
      ['.......aa.......', '.......dd.......', '..############..', '..#kkk####kkk#..', '..#kee####kee#..', '..############..', '..###mmmmmm###..', 'd.############.d', 'd.############.d', '...dd......dd...'],
      ['.......kk.......', '.......dd.......', '..############..', '..#kkk####kkk#..', '..#kek####kek#..', '..############..', '..###m.mm.m###..', '.d############d.', '.d############d.', '...dd......dd...'],
    ],
  },
}

export const PETS: { key: PetKey; name: string }[] = [
  { key: 'clawd', name: 'Clawd' },
  ...Object.entries(PIXEL).map(([key, p]) => ({ key: key as PetKey, name: p.name })),
]

// a cell's side and the room above the sprite for the hop, as Clawd has them
const U = 4, LIFT = 16

function sparks(hop: number, cx: number, cy: number): { css: string; svg: string } {
  if (!hop) return { css: '', svg: '' }
  const css = Array.from({ length: 6 }, (_, k) => {
    const a = (k / 6) * Math.PI * 2 - Math.PI / 2
    return `.s${k}{--x:${(Math.cos(a) * 26).toFixed(1)}px;--y:${(Math.sin(a) * 18).toFixed(1)}px}`
  }).join('') + `.sp{font:600 11px ui-monospace,Menlo,monospace;fill:#d97757;text-anchor:middle;animation:sp .6s ease-out 1 forwards}@keyframes sp{from{opacity:1;translate:0 0}to{opacity:0;translate:var(--x) var(--y)}}`
  const svg = Array.from({ length: 6 }, (_, k) => `<text class="sp s${k}" x="${cx}" y="${cy}">${'✻✢·'.charAt(k % 3)}</text>`).join('')
  return { css, svg }
}

// the hop on a pick, then the bob, as Clawd has always done
const motion = (hop: number) => `.c{animation:${hop ? 'hop .45s cubic-bezier(.3,.7,.4,1) 1,' : ''}bob 2.6s ease-in-out .45s infinite}@keyframes hop{0%,100%{translate:0 0}45%{translate:0 -14px}}@keyframes bob{0%,100%{translate:0 0}50%{translate:0 -1.5px}}`

// ---------- Clawd, the film's pixel crab: 16 cells wide, two-tone terracotta, legs stepping ----------
const BODY = ['..############..', '..#.########.#..', '..#.########.#..', '..############..', '################', '################', '..############..', '..############..']
const LEGS = ['..#.#......#.#..', '...#.#....#.#...'] as const
function clawd(hop: number): string {
  const U = 4, cells = (rows: string[], y0: number) => rows.flatMap((row, j) => [...row].map((c, i) => (c === '#' ? `<rect x="${i * U}" y="${(y0 + j) * U}" width="${U - 0.6}" height="${U - 0.6}" fill="${(i + j) % 2 ? '#d97757' : '#e08566'}"/>` : ''))).join('')
  const sp = sparks(hop, 32, 30)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 56" width="64" height="56" data-hop="${hop}"><style>`
    + motion(hop)
    + `.l2{animation:st .5s steps(1) infinite}.l1{animation:st .5s steps(1) -.25s infinite}@keyframes st{0%{opacity:1}50%{opacity:0}}`
    + sp.css
    + `</style><g class="c" transform="translate(0 ${LIFT})">${cells(BODY, 0)}<g class="l1">${cells([LEGS[0]], 8)}</g><g class="l2">${cells([LEGS[1]], 8)}</g></g>${sp.svg}<rect x="8" y="53" width="48" height="2" fill="#000" opacity=".25"/></svg>`
}

// The cells of a sprite as one path per colour: each a square a little smaller than its cell, as Clawd's are.
function cells(list: [number, number, string][]): string {
  const by = new Map<string, string>()
  for (const [x, y, c] of list) by.set(c, (by.get(c) ?? '') + `M${x * U} ${y * U}h${U - 0.6}v${U - 0.6}h-${U - 0.6}z`)
  return [...by].map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('')
}

function pixel(p: Pixel, hop: number): string {
  const n = p.frames.length, rows = Math.max(...p.frames.map(f => f.length))
  const colour = (ch: string, x: number, y: number) => (ch === '#' ? p.body[(x + y) % 2] : p.paint[ch])
  const at = (f: string[], x: number, y: number) => f[y]?.[x] ?? '.'
  // what every frame shares is drawn once; each frame draws only the cells it changes
  const base: [number, number, string][] = [], own: [number, number, string][][] = p.frames.map(() => [])
  for (let y = 0; y < rows; y++) for (let x = 0; x < 16; x++) {
    const all = p.frames.map(f => at(f, x, y))
    if (all.every(ch => ch === all[0])) { const c = colour(all[0]!, x, y); if (c) base.push([x, y, c]) }
    else all.forEach((ch, i) => { const c = colour(ch, x, y); if (c) own[i]!.push([x, y, c]) })
  }
  const h = LIFT + rows * U + 4, dur = p.step * n
  const frames = `.f{visibility:hidden;animation:fr ${dur.toFixed(2)}s step-end infinite}@keyframes fr{0%{visibility:visible}${(100 / n).toFixed(3)}%,100%{visibility:hidden}}`
    + p.frames.map((_, i) => `.d${i}{animation-delay:${(-(((n - i) % n) * p.step)).toFixed(2)}s}`).join('')
  const sp = sparks(hop, 32, LIFT + 14)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 ${h}" width="64" height="${h}" data-hop="${hop}"><style>`
    + motion(hop) + frames + sp.css
    + `</style><g class="c" transform="translate(0 ${LIFT})">${cells(base)}${own.map((o, i) => `<g class="f d${i}">${cells(o)}</g>`).join('')}</g>`
    + `${sp.svg}<rect x="8" y="${h - 3}" width="48" height="2" fill="#000" opacity=".25"/></svg>`
}

export function petSvg(key: PetKey, hop: number): { svg: string; width: number; height: number } {
  if (key === 'clawd') return { svg: clawd(hop), width: 64, height: 56 }
  const svg = pixel(PIXEL[key], hop)
  const [, w = '64', h = '56'] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg) ?? []
  return { svg, width: Number(w), height: Number(h) }
}
