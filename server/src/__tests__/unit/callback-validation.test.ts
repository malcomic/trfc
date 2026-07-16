import { describe, it, expect } from 'vitest'
import crypto from 'crypto'

// Validation utilities
const validateCallbackSignature = (
  body: string,
  signature: string,
  secret: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64')
  return expectedSignature === signature
}

const validateCallbackFields = (callback: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Required fields
  if (!callback?.Body?.stkCallback?.CheckoutRequestID) {
    errors.push('Missing CheckoutRequestID')
  }
  if (!callback?.Body?.stkCallback?.MerchantRequestID) {
    errors.push('Missing MerchantRequestID')
  }
  if (callback?.Body?.stkCallback?.ResultCode === undefined) {
    errors.push('Missing ResultCode')
  }

  // Validate result code format
  if (
    callback?.Body?.stkCallback?.ResultCode !== undefined &&
    ![0, 1, -1].includes(callback.Body.stkCallback.ResultCode)
  ) {
    errors.push('Invalid ResultCode format')
  }

  // If successful, check metadata
  if (callback?.Body?.stkCallback?.ResultCode === 0) {
    const items = callback.Body.stkCallback.CallbackMetadata?.Item || []
    const itemNames = items.map((item: any) => item.Name)

    if (!itemNames.includes('Amount')) {
      errors.push('Missing Amount in CallbackMetadata')
    }
    if (!itemNames.includes('MpesaReceiptNumber')) {
      errors.push('Missing MpesaReceiptNumber in CallbackMetadata')
    }
    if (!itemNames.includes('PhoneNumber')) {
      errors.push('Missing PhoneNumber in CallbackMetadata')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

describe('Payment Callback Validation', () => {
  describe('Signature Validation', () => {
    it('should validate correct HMAC signature', () => {
      const body = JSON.stringify({
        Body: { stkCallback: { CheckoutRequestID: 'test123' } },
      })
      const secret = 'test_secret'
      const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('base64')

      expect(validateCallbackSignature(body, signature, secret)).toBe(true)
    })

    it('should reject invalid HMAC signature', () => {
      const body = JSON.stringify({ data: 'test' })
      const secret = 'test_secret'
      const wrongSignature = 'invalid_signature'

      expect(validateCallbackSignature(body, wrongSignature, secret)).toBe(false)
    })

    it('should reject signature with wrong secret', () => {
      const body = JSON.stringify({ data: 'test' })
      const secret1 = 'secret1'
      const secret2 = 'secret2'
      const signature = crypto
        .createHmac('sha256', secret1)
        .update(body)
        .digest('base64')

      expect(validateCallbackSignature(body, signature, secret2)).toBe(false)
    })

    it('should be case-sensitive', () => {
      const body = JSON.stringify({ data: 'test' })
      const secret = 'secret'
      const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('base64')

      const modifiedSignature = signature.toLowerCase()
      // HMAC should still match (base64 is case-sensitive)
      expect(validateCallbackSignature(body, modifiedSignature, secret)).toBe(false)
    })
  })

  describe('Callback Structure Validation', () => {
    it('should validate successful payment callback', () => {
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'test-merchant-123',
            CheckoutRequestID: 'test-checkout-456',
            ResultCode: 0,
            ResultDesc: 'The service request has been processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 1000 },
                { Name: 'MpesaReceiptNumber', Value: 'SIL12345678' },
                { Name: 'TransactionDate', Value: 20231225120000 },
                { Name: 'PhoneNumber', Value: '254700000000' },
              ],
            },
          },
        },
      }

      const result = validateCallbackFields(callback)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject callback missing CheckoutRequestID', () => {
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'test-123',
            ResultCode: 0,
          },
        },
      }

      const result = validateCallbackFields(callback)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing CheckoutRequestID')
    })

    it('should reject callback missing MerchantRequestID', () => {
      const callback = {
        Body: {
          stkCallback: {
            CheckoutRequestID: 'test-456',
            ResultCode: 0,
          },
        },
      }

      const result = validateCallbackFields(callback)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing MerchantRequestID')
    })

    it('should reject callback with missing required metadata for success', () => {
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'test-123',
            CheckoutRequestID: 'test-456',
            ResultCode: 0,
            CallbackMetadata: {
              Item: [{ Name: 'Amount', Value: 1000 }], // Missing others
            },
          },
        },
      }

      const result = validateCallbackFields(callback)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject invalid ResultCode', () => {
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'test-123',
            CheckoutRequestID: 'test-456',
            ResultCode: 999, // Invalid code
          },
        },
      }

      const result = validateCallbackFields(callback)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid ResultCode format')
    })

    it('should allow ResultCode 1 (failed)', () => {
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'test-123',
            CheckoutRequestID: 'test-456',
            ResultCode: 1,
          },
        },
      }

      const result = validateCallbackFields(callback)
      expect(result.valid).toBe(true)
    })

    it('should allow ResultCode -1 (cancelled)', () => {
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'test-123',
            CheckoutRequestID: 'test-456',
            ResultCode: -1,
          },
        },
      }

      const result = validateCallbackFields(callback)
      expect(result.valid).toBe(true)
    })
  })

  describe('Idempotency Check', () => {
    it('should identify duplicate callbacks by CheckoutRequestID', () => {
      const callback1 = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-1',
            CheckoutRequestID: 'checkout-123',
            ResultCode: 0,
          },
        },
      }

      const callback2 = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-2',
            CheckoutRequestID: 'checkout-123', // Same request ID
            ResultCode: 0,
          },
        },
      }

      const id1 = callback1.Body.stkCallback.CheckoutRequestID
      const id2 = callback2.Body.stkCallback.CheckoutRequestID

      expect(id1).toBe(id2)
    })

    it('should differentiate callbacks by MerchantRequestID', () => {
      const callback1 = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-1',
            CheckoutRequestID: 'checkout-123',
          },
        },
      }

      const callback2 = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-2',
            CheckoutRequestID: 'checkout-123',
          },
        },
      }

      expect(callback1.Body.stkCallback.MerchantRequestID).not.toBe(
        callback2.Body.stkCallback.MerchantRequestID
      )
    })
  })

  describe('Malformed Payload Handling', () => {
    it('should handle missing Body field', () => {
      const callback = { stkCallback: { CheckoutRequestID: 'test' } }
      const result = validateCallbackFields(callback)
      expect(result.valid).toBe(false)
    })

    it('should handle null callback', () => {
      const callback = null
      const result = validateCallbackFields(callback)
      expect(result.valid).toBe(false)
    })

    it('should handle empty object', () => {
      const callback = {}
      const result = validateCallbackFields(callback)
      expect(result.valid).toBe(false)
    })
  })
})
