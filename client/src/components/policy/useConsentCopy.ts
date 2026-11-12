import { useEffect, useState } from 'react'
import { getPolicy, getPublicPrivacySettings, type PolicySlug } from '../../api/policies'

export const DEFAULT_CONSENT_COPY = {
  box1: 'I agree to the Terms and to how TRFC uses my information, as set out in the Privacy and Confidentiality Terms.',
  box2: 'Yes, email me about my program, TRFC events, offers and the 2027 membership.',
  ageBox: 'I am 18 or older.',
  applicantBox:
    'I have read the Privacy and Confidentiality Terms for applicants. I agree that TRFC can use my application information to decide on my application, and I agree to keep TRFC confidential information private as set out in the terms.',
  cookieNotice: '',
}

export type ConsentCopy = typeof DEFAULT_CONSENT_COPY & {
  /** Version of the policy the person is agreeing to; null until loaded or if loading failed. */
  version: string | null
  loadFailed: boolean
}

/** Editable checkbox wording plus the current version of the policy being agreed to. */
export function useConsentCopy(slug: PolicySlug = 'privacy-members'): ConsentCopy {
  const [copy, setCopy] = useState<ConsentCopy>({ ...DEFAULT_CONSENT_COPY, version: null, loadFailed: false })

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([getPublicPrivacySettings(), getPolicy(slug)]).then(([settings, policy]) => {
      if (cancelled) return
      const s = settings.status === 'fulfilled' ? settings.value : null
      setCopy({
        box1: s?.box1_text || DEFAULT_CONSENT_COPY.box1,
        box2: s?.box2_text || DEFAULT_CONSENT_COPY.box2,
        ageBox: s?.age_box_text || DEFAULT_CONSENT_COPY.ageBox,
        applicantBox: s?.applicant_box_text || DEFAULT_CONSENT_COPY.applicantBox,
        cookieNotice: s?.show_application_cookie_notice ? s.application_cookie_notice || '' : '',
        version: policy.status === 'fulfilled' ? policy.value.version : null,
        loadFailed: policy.status === 'rejected',
      })
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  return copy
}
