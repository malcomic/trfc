import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  getClient: vi.fn(),
}))

vi.mock('../../utils/mpesa.js', () => ({
  clearMPesaTokenCache: vi.fn(),
  describeMpesaError: vi.fn(() => 'described error'),
  getMPesaToken: vi.fn().mockResolvedValue('token'),
  initiateStkPush: vi.fn(),
  queryPaymentStatus: vi.fn(),
  parseCallbackResponse: vi.fn(),
}))

vi.mock('../../utils/paymentStatus.js', () => ({
  getLocalPaymentStatus: vi.fn().mockResolvedValue(null),
  toStatusResponse: vi.fn(),
}))

vi.mock('../../utils/paymentLogger.js', () => ({
  logSTKInitiation: vi.fn(),
  logCallbackProcessing: vi.fn(),
  logPaymentStatusQuery: vi.fn(),
  logError: vi.fn(),
  logDuplicateCallback: vi.fn(),
}))

import {
  clearMPesaTokenCache,
  getMPesaToken,
  queryPaymentStatus as mpesaQueryPaymentStatus,
} from '../../utils/mpesa.js'
import {
  queryPaymentStatus,
  resetMpesaQueryThrottle,
  shouldQueryMpesa,
} from '../../controllers/paymentsController.js'

const T0 = new Date('2026-10-08T09:00:00Z').getTime()

function mockRes() {
  const res: any = {}
  res.json = vi.fn().mockReturnValue(res)
  res.status = vi.fn().mockReturnValue(res)
  return res
}

async function poll(id = 'chk-1') {
  const res = mockRes()
  await queryPaymentStatus({ params: { checkoutRequestId: id } } as any, res)
  return res.json.mock.calls[0][0]
}

describe('shouldQueryMpesa', () => {
  beforeEach(() => resetMpesaQueryThrottle())

  it('waits 10s after the first poll, then allows one query every 12s', () => {
    expect(shouldQueryMpesa('chk-1', T0)).toBe(false)
    expect(shouldQueryMpesa('chk-1', T0 + 9_000)).toBe(false)
    expect(shouldQueryMpesa('chk-1', T0 + 10_000)).toBe(true)
    expect(shouldQueryMpesa('chk-1', T0 + 15_000)).toBe(false)
    expect(shouldQueryMpesa('chk-1', T0 + 22_000)).toBe(true)
  })

  it('tracks each payment separately', () => {
    shouldQueryMpesa('chk-1', T0)
    expect(shouldQueryMpesa('chk-2', T0 + 10_000)).toBe(false)
    expect(shouldQueryMpesa('chk-1', T0 + 10_000)).toBe(true)
  })
})

describe('queryPaymentStatus throttling and errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    resetMpesaQueryThrottle()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns pending without contacting Safaricom during the grace period', async () => {
    expect(await poll()).toMatchObject({ payment_status: 'pending', ResultCode: '1032' })
    vi.setSystemTime(T0 + 5_000)
    expect(await poll()).toMatchObject({ payment_status: 'pending' })
    expect(getMPesaToken).not.toHaveBeenCalled()
  })

  it('returns pending when Safaricom answers with an HTML firewall page', async () => {
    vi.mocked(mpesaQueryPaymentStatus).mockRejectedValueOnce({
      message: 'Request failed with status code 403',
      response: { status: 403, data: '<html>Request unsuccessful. Incapsula incident ID: 1</html>' },
    })

    await poll()
    vi.setSystemTime(T0 + 10_000)
    expect(await poll()).toMatchObject({ payment_status: 'pending', ResultCode: '1032' })
    expect(mpesaQueryPaymentStatus).toHaveBeenCalledTimes(1)
    expect(clearMPesaTokenCache).not.toHaveBeenCalled()
  })

  it('clears the cached token when Safaricom rejects it', async () => {
    vi.mocked(mpesaQueryPaymentStatus).mockRejectedValueOnce({
      message: 'Request failed with status code 401',
      response: { status: 401, data: { errorMessage: 'Invalid Access Token' } },
    })

    await poll()
    vi.setSystemTime(T0 + 10_000)
    expect(await poll()).toMatchObject({ payment_status: 'pending' })
    expect(clearMPesaTokenCache).toHaveBeenCalledTimes(1)
  })
})
