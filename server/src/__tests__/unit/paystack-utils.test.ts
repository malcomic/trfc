import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

vi.mock('../../config/env.js', () => ({
  config: {
    paystack: {
      secretKey: 'sk_test_secret_for_hmac',
      publicKey: 'pk_test_public',
    },
  },
}))

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import axios from 'axios'
import {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
} from '../../utils/paystack.js'

describe('Paystack utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifyWebhookSignature', () => {
    it('accepts a valid HMAC SHA-512 signature', () => {
      const body = '{"event":"charge.success"}'
      const signature = crypto
        .createHmac('sha512', 'sk_test_secret_for_hmac')
        .update(body)
        .digest('hex')

      expect(verifyWebhookSignature(body, signature)).toBe(true)
    })

    it('rejects an invalid signature', () => {
      expect(verifyWebhookSignature('{"event":"charge.success"}', 'bad')).toBe(false)
    })

    it('rejects missing signature', () => {
      expect(verifyWebhookSignature('{"event":"charge.success"}', undefined)).toBe(false)
    })
  })

  describe('initializeTransaction', () => {
    it('posts amount in kobo and returns access data', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          status: true,
          message: 'Authorization URL created',
          data: {
            authorization_url: 'https://checkout.paystack.com/x',
            access_code: 'access_abc',
            reference: 'ref_abc',
          },
        },
      } as any)

      const result = await initializeTransaction({
        email: 'buyer@example.com',
        amountKes: 1000,
        metadata: { ticketBatchId: 'batch-1' },
      })

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.paystack.co/transaction/initialize',
        expect.objectContaining({
          email: 'buyer@example.com',
          amount: 100000,
          currency: 'KES',
        }),
        expect.any(Object)
      )
      expect(result.access_code).toBe('access_abc')
      expect(result.reference).toBe('ref_abc')
    })
  })

  describe('verifyTransaction', () => {
    it('returns verified transaction data', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          status: true,
          message: 'Verification successful',
          data: {
            id: 1,
            status: 'success',
            reference: 'ref_abc',
            amount: 100000,
            currency: 'KES',
            paid_at: '2026-07-14T10:00:00.000Z',
            channel: 'card',
            metadata: { ticketBatchId: 'batch-1' },
          },
        },
      } as any)

      const result = await verifyTransaction('ref_abc')
      expect(result.status).toBe('success')
      expect(result.metadata?.ticketBatchId).toBe('batch-1')
    })
  })
})
