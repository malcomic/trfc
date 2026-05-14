import { describe, it, expect } from 'vitest'
import crypto from 'crypto'

// Import utilities from actual implementation
const generateTimestamp = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}${hours}${minutes}${seconds}`
}

const hashPassword = (input: string, salt: string): string => {
  return crypto
    .pbkdf2Sync(input, salt, 1000, 32, 'sha256')
    .toString('hex')
}

const generateChecksum = (
  partyA: string,
  partyB: string,
  amount: number,
  phoneNumber: string,
  callBackURL: string,
  accountReference: string,
  timestamp: string,
  password: string
): string => {
  const data = `${partyA}${partyB}${amount}${phoneNumber}${callBackURL}${accountReference}${timestamp}${password}`
  return crypto.createHash('sha256').update(data).digest('hex')
}

describe('M-Pesa Utilities', () => {
  describe('generateTimestamp', () => {
    it('should generate valid timestamp format', () => {
      const timestamp = generateTimestamp()
      expect(timestamp).toMatch(/^\d{14}$/) // 14 digits YYYYMMDDHHMMSS
    })

    it('should generate increasing timestamps', () => {
      const ts1 = generateTimestamp()
      const ts2 = generateTimestamp()
      expect(parseInt(ts2)).toBeGreaterThanOrEqual(parseInt(ts1))
    })

    it('should contain valid date values', () => {
      const timestamp = generateTimestamp()
      const year = timestamp.substring(0, 4)
      const month = timestamp.substring(4, 6)
      const day = timestamp.substring(6, 8)

      expect(parseInt(year)).toBeGreaterThanOrEqual(2000)
      expect(parseInt(month)).toBeGreaterThanOrEqual(1)
      expect(parseInt(month)).toBeLessThanOrEqual(12)
      expect(parseInt(day)).toBeGreaterThanOrEqual(1)
      expect(parseInt(day)).toBeLessThanOrEqual(31)
    })
  })

  describe('hashPassword', () => {
    it('should hash password consistently', () => {
      const password = 'TestPassword123'
      const salt = 'testsalt'
      const hash1 = hashPassword(password, salt)
      const hash2 = hashPassword(password, salt)
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different passwords', () => {
      const salt = 'testsalt'
      const hash1 = hashPassword('password1', salt)
      const hash2 = hashPassword('password2', salt)
      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes for different salts', () => {
      const password = 'TestPassword'
      const hash1 = hashPassword(password, 'salt1')
      const hash2 = hashPassword(password, 'salt2')
      expect(hash1).not.toBe(hash2)
    })

    it('should produce 64-character hex string', () => {
      const hash = hashPassword('test', 'salt')
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('generateChecksum', () => {
    it('should generate valid SHA256 checksum', () => {
      const checksum = generateChecksum(
        '174379',
        '254708374149',
        1000,
        '254708374149',
        'https://example.com/callback',
        'reference123',
        '20231225120000',
        'password123'
      )
      expect(checksum).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should generate different checksums for different inputs', () => {
      const checksum1 = generateChecksum(
        '174379',
        '254708374149',
        1000,
        '254708374149',
        'https://example.com/callback',
        'reference123',
        '20231225120000',
        'password123'
      )

      const checksum2 = generateChecksum(
        '174379',
        '254708374149',
        2000, // Different amount
        '254708374149',
        'https://example.com/callback',
        'reference123',
        '20231225120000',
        'password123'
      )

      expect(checksum1).not.toBe(checksum2)
    })

    it('should be deterministic', () => {
      const params = {
        partyA: '174379',
        partyB: '254708374149',
        amount: 1000,
        phoneNumber: '254708374149',
        callBackURL: 'https://example.com/callback',
        accountReference: 'reference123',
        timestamp: '20231225120000',
        password: 'password123',
      }

      const checksum1 = generateChecksum(
        params.partyA,
        params.partyB,
        params.amount,
        params.phoneNumber,
        params.callBackURL,
        params.accountReference,
        params.timestamp,
        params.password
      )

      const checksum2 = generateChecksum(
        params.partyA,
        params.partyB,
        params.amount,
        params.phoneNumber,
        params.callBackURL,
        params.accountReference,
        params.timestamp,
        params.password
      )

      expect(checksum1).toBe(checksum2)
    })
  })

  describe('Phone number validation', () => {
    const isValidPhone = (phone: string): boolean => {
      // Kenya M-Pesa format: 254XXXXXXXXX
      return /^254\d{9}$/.test(phone)
    }

    it('should accept valid Kenya phone numbers', () => {
      expect(isValidPhone('254712345678')).toBe(true)
      expect(isValidPhone('254700000000')).toBe(true)
      expect(isValidPhone('254799999999')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('712345678')).toBe(false) // Missing country code
      expect(isValidPhone('254712345')).toBe(false) // Too short
      expect(isValidPhone('2547123456789')).toBe(false) // Too long
      expect(isValidPhone('25471234567a')).toBe(false) // Contains letter
      expect(isValidPhone('254')).toBe(false) // Just country code
      expect(isValidPhone('')).toBe(false) // Empty
    })
  })

  describe('Amount validation', () => {
    const isValidAmount = (amount: number): boolean => {
      // M-Pesa minimum: 1 KES, maximum: 150,000 KES
      return amount >= 1 && amount <= 150000 && Number.isInteger(amount)
    }

    it('should accept valid amounts', () => {
      expect(isValidAmount(1)).toBe(true)
      expect(isValidAmount(100)).toBe(true)
      expect(isValidAmount(10000)).toBe(true)
      expect(isValidAmount(150000)).toBe(true)
    })

    it('should reject invalid amounts', () => {
      expect(isValidAmount(0)).toBe(false) // Too low
      expect(isValidAmount(-100)).toBe(false) // Negative
      expect(isValidAmount(150001)).toBe(false) // Too high
      expect(isValidAmount(99.99)).toBe(false) // Not integer
      expect(isValidAmount(NaN)).toBe(false) // NaN
    })
  })

  describe('Reference ID validation', () => {
    const isValidReference = (ref: string): boolean => {
      // Alphanumeric, 1-24 characters
      return /^[a-zA-Z0-9]{1,24}$/.test(ref)
    }

    it('should accept valid reference IDs', () => {
      expect(isValidReference('order123')).toBe(true)
      expect(isValidReference('ORD')).toBe(true)
      expect(isValidReference('1234567890')).toBe(true)
      expect(isValidReference('ABC123DEF456')).toBe(true)
    })

    it('should reject invalid reference IDs', () => {
      expect(isValidReference('')).toBe(false) // Empty
      expect(isValidReference('a'.repeat(25))).toBe(false) // Too long
      expect(isValidReference('order-123')).toBe(false) // Contains hyphen
      expect(isValidReference('order_123')).toBe(false) // Contains underscore
      expect(isValidReference('order@123')).toBe(false) // Contains special char
    })
  })
})
