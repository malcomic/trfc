import api from './index'
import type { FinderAnswers } from '../content/finder/types'
import type { Tier } from '../content/onboarding'

export interface FinderAccountRequest {
  name: string
  email?: string
  phone?: string
  whatsapp?: string
  answers: FinderAnswers
}

export interface FinderAccountResponse {
  userId: string
  isReturning: boolean
  signupId: string
  email?: string | null
  phone?: string
}

/** Soft-create or find the member mid-funnel; stores draft answers on a signup row. */
export async function createFinderAccount(body: FinderAccountRequest): Promise<FinderAccountResponse> {
  const response = await api.post('/finder/account', body)
  return response.data
}

export interface FinderCheckoutRequest {
  name: string
  phone: string
  email?: string
  whatsapp?: string
  program: string
  tier: Tier
  quizAnswers: Record<string, unknown>
}

export async function createFinderCheckout(body: FinderCheckoutRequest) {
  const response = await api.post('/signups', {
    name: body.name,
    phone: body.phone,
    whatsapp: body.whatsapp ?? body.phone,
    program: body.program,
    tier: body.tier,
    quizAnswers: body.quizAnswers,
  })
  return response.data as {
    signupId: string
    program: string
    tier: Tier
    amount: number
    isReturning: boolean
    phone: string
  }
}
