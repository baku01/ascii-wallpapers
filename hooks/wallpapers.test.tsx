import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import { WALLS } from './walls.js'

type Set = { backdrop: { scene: string; glass: { blur: number; tint: string; opacity: number } }; overrideColorScheme: string; colors: { inputs: Record<string, Record<string, string>> } }
type On = Parameters<TestBody>[1]

// Nothing sits beneath the plugin: each hook here stands for the engine, and keeps the themes it was sent.
function engine(on: On) {
  const sets: Set[] = []
  on('command.register', () => ({ value: { command: 'wallpaper' } }))
  on('theme.set', (_, e) => { sets.push(e as unknown as Set); return { value: { isDrawn: true } } as never })
  on('theme.clear', () => ({ value: undefined }) as never)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  return sets
}

const BAND = { plugin: 'ascii-wallpapers', component: 'AbovePrompt', requestId: 'band', props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 40, bodyColumns: 120, scroll: { offset: 0, bodyRows: 40 }, view: {} } } as const

test('/wallpaper honu sets the lagoon behind the chat, under glass of its own colour', async ($, on) => {
  const sets = engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const res = await $.command.run({ command: 'wallpaper', args: 'honu' } as never)
  expect(JSON.stringify(res)).toContain('Honu Lagoon is on.')
  const set = sets.at(-1)!
  expect(set.backdrop.scene).toBe('aw-honu-5')
  expect(set.backdrop.glass.blur).toBe(24)
  expect(set.backdrop.glass.tint).toBe(WALLS.find(w => w.key === 'honu')!.glass.tint)
  expect(set.overrideColorScheme).toBe('dark')
  // the panels are the scene's hue, not a neutral gray
  const page = set.colors.inputs.dark!['gray-900']!
  expect(page === '#141414' || page === '#000000').toBe(false)

  expect(JSON.stringify(await $.command.run({ command: 'wallpaper', args: 'off' } as never))).toContain('Wallpaper off.')
  expect(JSON.stringify(await $.command.run({ command: 'wallpaper', args: 'nope' } as never))).toContain('No wallpaper')
  expect(JSON.stringify(await $.command.run({ command: 'wallpaper', args: 'neon rain' } as never))).toContain('Neon Rain is on.')
})

test('every wallpaper draws within the limit, on desktop and mobile', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(WALLS.length).toBe(12)
  for (const w of WALLS) {
    for (const surface of ['desktop', 'mobile'] as const) {
      const ui = await $.ui.mount({ plugin: 'ascii-wallpapers', component: 'Backdrop', requestId: `b-${w.key}`, surface, props: { scene: `aw-${w.key}-5`, plugin: 'ascii-wallpapers', glass: false } })
      const svg = await ui.find({ type: 'Svg' })
      const source = String((svg as { props?: { source?: string } } | undefined)?.props?.source ?? '')
      expect(source.startsWith('<svg')).toBe(true)
      expect(source.length <= 131072).toBe(true)
      await ui.unmount()
    }
  }
})

test('the picker lists every wallpaper, and a pick sets it', async ($, on) => {
  const sets = engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'wallpaper', args: '' } as never)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.findAll({ type: 'Svg' })).toHaveLength(WALLS.length + 1)
  await ui.press({ key: 'aurora' })
  expect(sets.at(-1)!.backdrop.scene).toBe('aw-aurora-5')
  await ui.unmount()
})
