declare module 'claude-code' {
  interface PluginState {
    'ascii-wallpapers': { current: string | null; picking: boolean; hops: number; pet: string | null }
  }
}
