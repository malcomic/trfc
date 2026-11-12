import { vi } from 'vitest'

/** Stand-in for utils/consents.js so sign-up tests keep their database call order. */
export async function consentModuleMock() {
  const actual = await vi.importActual<typeof import('../../../utils/consents.js')>('../../../utils/consents.js')
  return {
    ...actual,
    checkSignupConsent: vi.fn(async () => '1.0'),
    acceptPrivacy: vi.fn(async () => undefined),
    recordConsent: vi.fn(async () => undefined),
    setMarketing: vi.fn(async () => undefined),
    getConsentStatus: vi.fn(async () => ({ needs_consent: false, needs_marketing_prompt: false, privacy_version: '1.0' })),
    getConsentStatusForUser: vi.fn(async () => ({ needs_consent: false, needs_marketing_prompt: false, privacy_version: '1.0' })),
  }
}
