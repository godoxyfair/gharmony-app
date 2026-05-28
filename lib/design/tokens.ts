export const colors = {
  bg: '#0e0d0c',
  fg: '#f5f1ea',
  muted: '#6b6660',
  accent: '#c4a35a',
  surface: '#1a1917',
  border: 'rgba(245, 241, 234, 0.1)',
} as const

export const motion = {
  easeExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
  easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  micro: 0.15,
  layout: 0.4,
  cinematic: 1.2,
} as const
