export type QwenPawMode = 'real' | 'demo'

export const QWENPAW_MODE: QwenPawMode =
  import.meta.env.VITE_QWENPAW_MODE === 'demo' ? 'demo' : 'real'

export function isQwenPawDemoMode(): boolean {
  return QWENPAW_MODE === 'demo'
}
