export {}

declare global {
  interface Window {
    ttq?: {
      page?: () => void
      track?: (event: string, data?: Record<string, unknown>) => void
      identify?: (userId: string, data?: Record<string, unknown>) => void
      [key: string]: unknown
    }
    /**
     * Internal guard to prevent double-sending the same page in React 18 StrictMode (dev only).
     */
    __ttq_last_page?: string
  }
}

