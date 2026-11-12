import { runRetention } from '../utils/retention.js'

const TICK_MS = 6 * 60 * 60 * 1000

let timer: NodeJS.Timeout | null = null
let isRunning = false

async function tick() {
  if (isRunning) return
  isRunning = true
  try {
    const { accounts, applications } = await runRetention()
    if (accounts || applications) {
      console.log(`🧹 Retention: ${accounts} deleted accounts cleared, ${applications} coach applications removed`)
    }
  } catch (error: any) {
    console.error('⚠️  Retention job failed:', error?.message || error)
  } finally {
    isRunning = false
  }
}

export function startRetentionScheduler(): void {
  if (timer) return
  if (process.env.RETENTION_JOBS_ENABLED === 'false' || process.env.NODE_ENV === 'test') return
  timer = setInterval(tick, TICK_MS)
  void tick()
  console.log('✓ Data retention clean-up scheduled (every 6 hours)')
}

export function stopRetentionScheduler(): void {
  if (timer) clearInterval(timer)
  timer = null
}
