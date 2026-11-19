// What Claude Desktop measures in a backdrop scene before drawing it. Past any of these it leaves the scene out
// (the window shows its bare ground) and logs "backdrop scene: an Svg is past a limit (...)". The rules are read
// from the desktop app's behaviour, so the build fails here instead.

const count = (s, re) => (s.match(re) ?? []).length

// How deep tags nest.
function tagNesting(svg) {
  let depth = 0, most = 0
  for (const [, close, , selfClose] of svg.matchAll(/<(\/)?([a-zA-Z][^\s/>]*)[^>]*?(\/)?>/g)) {
    if (close) depth--
    else if (!selfClose) most = Math.max(most, ++depth)
  }
  return most
}

// Brackets left open when a quote, backslash, '<' or bare '&' comes along count for good; the most at any point.
function bracketNesting(svg) {
  const open = []
  let spent = 0, most = 0
  const token = /[()[\]{}]|("[^"()[\]{}\\<&\n\r\f]*"|'[^'()[\]{}\\<&\n\r\f]*')|["'\\<]|&(?!(?:amp|gt|lt);)/g
  for (const [t, quoted] of svg.matchAll(token)) {
    if ('([{'.includes(t)) open.push(')]}'['([{'.indexOf(t)])
    else if (t === open.at(-1)) open.pop()
    else if (quoted === undefined && !')]}'.includes(t)) spent += open.splice(0).length
    most = Math.max(most, spent + open.length)
  }
  return most
}

export function limits(svg) {
  const nesting = tagNesting(svg), brackets = bracketNesting(svg)
  const paints = count(svg, /[<:](?:pattern|mask|clipPath|marker)\b/gi)
  const links = Math.min(count(svg, /\bid\s*=/gi), count(svg, /[<:](?:use|feImage)\b/gi) + paints)
  const names = new Set(svg.match(/--[^ \t\n\r\f:,()]*/g)).size + count(svg, /\\|&#|attr\(/gi)
  return [
    ['tag nesting', nesting, 128],
    ['bracket nesting', brackets, 128],
    ['paints', paints, 256],
    ['links by tag nesting', links * nesting, 4096],
    ['names by bracket nesting', names * brackets, 2048],
    ['filter primitives', count(svg, /[<:]fe/gi), 512],
  ].map(([what, value, most]) => ({ what, value, most }))
}

export const pastLimit = svg => limits(svg).find(l => l.value > l.most)
