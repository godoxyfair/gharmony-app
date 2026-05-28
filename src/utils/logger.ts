const isDev = process.env.NODE_ENV === 'development'

export const Log = {
  error: (message: string, meta?: unknown) => {
    console.error(`[ERROR] ${message}`, meta ?? '')
  },
  warn: (message: string, meta?: unknown) => {
    if (isDev) console.warn(`[WARN] ${message}`, meta ?? '')
  },
  info: (message: string, meta?: unknown) => {
    if (isDev) console.log(`[INFO] ${message}`, meta ?? '')
  },
}
