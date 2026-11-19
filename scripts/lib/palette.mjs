// The window's colours over each scene: grays tinted with the scene's own hue, worked out by makeColors.
import { makeColors } from '../vendor/make-colors.js'
import { fromOklch, oklch } from './core.mjs'

const at = (h, c, l) => fromOklch({ l, c, h })

// Surfaces a few percent of lightness apart, every one carrying the hue; text near white (or ink, by day).
function grays(tone, ink) {
  const { h, c } = oklch(ink)
  const k = Math.min(c, 0.05)
  if (tone === 'dark') {
    return {
      anchors: {
        'surface-0': at(h, k * 0.75, 0.17),
        'surface-1': at(h, k * 0.7, 0.2),
        'surface-2': at(h, k * 0.65, 0.225),
        'surface-3': at(h, k * 0.6, 0.245),
        'text-primary': at(h, 0.012, 0.965),
        'text-secondary': at(h, 0.022, 0.85),
        'text-muted': at(h, 0.028, 0.74),
      },
    }
  }
  return {
    anchors: {
      'surface-0': at(h, k * 0.3, 0.965),
      'surface-1': at(h, k * 0.2, 0.98),
      'surface-2': at(h, k * 0.12, 0.993),
      'surface-3': at(h, k * 0.12, 0.993),
      'text-primary': at(h, 0.03, 0.22),
      'text-secondary': at(h, 0.035, 0.37),
      'text-muted': at(h, 0.035, 0.47),
    },
  }
}

// Danger stays a red, success a green, warning an amber: each leaned a little toward the scene's hue.
function roles(accent, ink) {
  const { h } = oklch(ink)
  const lean = (base, by = 0.12) => {
    let d = ((h - base + 540) % 360) - 180
    return base + d * by
  }
  return {
    accent,
    danger: at(lean(25), 0.17, 0.62),
    success: at(lean(150), 0.14, 0.68),
    warning: at(lean(75), 0.14, 0.78),
    pro: at(lean(295), 0.15, 0.62),
  }
}

// The theme and the glass for one wallpaper. Throws when Desktop wouldn't paint it.
export function look({ name, tone, accent, ink }) {
  const mode = { gray: grays(tone, ink) }
  const { theme, problems } = makeColors({ label: name, roles: roles(accent, ink), [tone]: mode, only: tone })
  const refused = problems.filter(p => p.startsWith("Desktop won't paint"))
  if (refused.length) throw new Error(`${name}: ${refused.join('; ')}`)
  const surface = mode.gray.anchors['surface-0']
  return { colors: theme, glass: { blur: 24, tint: surface, opacity: tone === 'dark' ? 0.5 : 0.55 }, problems }
}
