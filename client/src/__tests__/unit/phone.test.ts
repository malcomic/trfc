import { describe, it, expect } from 'vitest'
import { MPESA_PHONE_ERROR, localPhoneOrEmpty, mpesaPhoneRules, toKenyanMsisdn } from '../../utils/phone'

describe('M-Pesa phone input', () => {
  it.each(['0712345678', '0712 345 678', '254712345678', '+254 712 345 678', '0112345678'])('accepts %s', (input) => {
    expect(mpesaPhoneRules.validate(input)).toBe(true)
  })

  it.each(['', '12345', '0812345678', '25471234567', 'abc'])('rejects %s', (input) => {
    expect(mpesaPhoneRules.validate(input)).toBe(MPESA_PHONE_ERROR)
  })

  it('sends 07 numbers as 254', () => {
    expect(toKenyanMsisdn('0712 345 678')).toBe('254712345678')
  })

  it('prefills a saved phone in local format', () => {
    expect(localPhoneOrEmpty('254712345678')).toBe('0712 345 678')
    expect(localPhoneOrEmpty('0712345678')).toBe('0712 345 678')
    expect(localPhoneOrEmpty('not a phone')).toBe('')
    expect(localPhoneOrEmpty(undefined)).toBe('')
  })
})
