export const LOCALES = ['en', 'ru'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_ACCENT = '#c4a35a'

export const KEY_ACCENT_COLORS: Record<number, string> = {
  0:  '#c4a35a', // C  — warm gold
  1:  '#a38fc4', // C# — cool violet
  2:  '#5aa3c4', // D  — steel blue
  3:  '#5ac45a', // Eb — sage
  4:  '#c4845a', // E  — amber
  5:  '#c45a7e', // F  — rose
  6:  '#5ac4a3', // F# — teal
  7:  '#c4c45a', // G  — chartreuse
  8:  '#845ac4', // Ab — indigo
  9:  '#5a84c4', // A  — cool blue
  10: '#c4a35a', // Bb — warm
  11: '#c45a5a', // B  — red
}
