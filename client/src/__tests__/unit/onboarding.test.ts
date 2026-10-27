import { describe, it, expect } from 'vitest'
import { toKenyanMsisdn, formatLocalPhone } from '../../content/onboarding'

describe('phone helpers', () => {
  it('normalises Kenyan numbers', () => {
    expect(toKenyanMsisdn('0712 345 678')).toBe('254712345678')
    expect(toKenyanMsisdn('+254112345678')).toBe('254112345678')
    expect(toKenyanMsisdn('0812345678')).toBeNull()
  })

  it('formats msisdn for display', () => {
    expect(formatLocalPhone('254712345678')).toBe('0712 345 678')
  })
})
