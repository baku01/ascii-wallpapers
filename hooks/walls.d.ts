export type Key = 'clawd' | 'clouds' | 'honu' | 'koiPond' | 'jellyfish' | 'paperBoats' | 'fireflies' | 'moonlit' | 'aurora' | 'neonRain' | 'sakura' | 'snowfall'
export type Wall = { key: Key; name: string; tone: 'dark' | 'light'; acc: string; alt: string; glass: { blur: number; tint: string; opacity: number } }
export const WALLS: Wall[]
