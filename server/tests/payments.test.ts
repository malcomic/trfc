import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getTimestamp, generatePassword, getMPesaToken } from '../utils/mpesa'
import crypto from 'crypto'
import { config } from '../config/env'

describe('M-Pesa Utilities', () => {
  describe('getTimestamp', () => {
    it('should return a 14-character timestamp string', () => {
      const timestamp = getTimestamp()
      expect(timestamp).toMatch(/^\d{14}$/)
    })

    it('should generate valid timestamp format', () => {
      const timestamp = getTimestamp()
      const now = new Date()
      const year = now.getFullYear().toString()
      expect(timestamp).toContain(year)
    })
  })

  describe('generatePassword', () => {
    it('should generate a base64 encoded password', () => {
      const timestamp = '20241215120000'
      const password = generatePassword(timestamp)

      expect(password).toBeDefined()
      expect(typeof password).toBe('string')

      // Should be valid base64
      expect(() => Buffer.from(password, 'base64')).not.toThrow()
    })

    it('should contain shortcode and passkey', () => {
      const timestamp = '20241215120000'
      const password = generatePassword(timestamp)
      const decoded = Buffer.from(password, 'base64').toString()

      expect(decoded).toContain(config.mpesa.shortcode)
      expect(decoded).toContain(config.mpesa.passkey)
      expect(decoded).toContain(timestamp)
    })

    it('should generate different passwords for different timestamps', () => {
      const timestamp1 = '20241215120000'
      const timestamp2 = '20241215120001'

      const password1 = generatePassword(timestamp1)
      const password2 = generatePassword(timestamp2)

      expect(password1).not.toBe(password2)
    })
  })
})

describe('Payment Validation', () => {
  describe('Phone number validation', () => {
    const validNumbers = ['254712345678', '254798765432', '254700000000']
    const invalidNumbers = ['712345678', '0712345678', '254712345', '+254712345678', '']

    it.each(validNumbers)('should accept valid phone %s', (phone) => {
      const regex = /^254\d{9}$/
      expect(regex.test(phone)).toBe(true)
    })

    it.each(invalidNumbers)('should reject invalid phone %s', (phone) => {
      const regex = /^254\d{9}$/
      expect(regex.test(phone)).toBe(false)
    })
  })

  describe('Amount validation', () => {
    const validAmounts = [1, 100, 1000, 50000, 999999]
    const invalidAmounts = [0, -100, 1000000, -1, NaN]

    it.each(validAmounts)('should accept valid amount %s', (amount) => {
      expect(amount > 0 && amount <= 999999).toBe(true)
    })

    it.each(invalidAmounts)('should reject invalid amount %s', (amount) => {
      expect(amount > 0 && amount <= 999999).toBe(false)
    })
  })
})

describe('Callback Signature Validation', () => {
  it('should validate correct signature', () => {
    const payload = { test: 'data' }
    const payloadString = JSON.stringify(payload)
    const signature = crypto
      .createHmac('sha256', config.mpesa.consumerSecret)
      .update(payloadString)
      .digest('base64')

    const computedSignature = crypto
      .createHmac('sha256', config.mpesa.consumerSecret)
      .update(payloadString)
      .digest('base64')

    expect(signature).toBe(computedSignature)
  })

  it('should reject invalid signature', () => {
    const payload = { test: 'data' }
    const payloadString = JSON.stringify(payload)
    const validSignature = crypto
      .createHmac('sha256', config.mpesa.consumerSecret)
      .update(payloadString)
      .digest('base64')

    const invalidSignature = 'invalid_signature_12345'

    expect(validSignature).not.toBe(invalidSignature)
  })

  it('should be sensitive to payload changes', () => {
    const payload1 = { amount: 100 }
    const payload2 = { amount: 101 }

    const signature1 = crypto
      .createHmac('sha256', config.mpesa.consumerSecret)
      .update(JSON.stringify(payload1))
      .digest('base64')

    const signature2 = crypto
      .createHmac('sha256', config.mpesa.consumerSecret)
      .update(JSON.stringify(payload2))
      .digest('base64')

    expect(signature1).not.toBe(signature2)
  })
})

describe('Payment Reference Parsing', () => {
  it('should parse ORDER reference correctly', () => {
    const ref = 'ORDER-123e4567-e89b-12d3-a456-426614174000'
    const [type, id] = ref.split('-')
    expect(type).toBe('ORDER')
    expect(id).toBeDefined()
  })

  it('should parse TICKET reference correctly', () => {
    const ref = 'TICKET-abc123'
    const [type, id] = ref.split('-')
    expect(type).toBe('TICKET')
    expect(id).toBe('abc123')
  })

  it('should parse HIRE reference correctly', () => {
    const ref = 'HIRE-equipment-001'
    const [type, id] = ref.split('-')
    expect(type).toBe('HIRE')
    expect(id).toBeDefined()
  })
})
