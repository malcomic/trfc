import { matchProgram, type Q1Answer, type Q2Answer, type Tier } from '../../content/onboarding'
import type { ProgramId } from '../../content/programs'

export type Step =
  | 'hero'
  | 'q1'
  | 'q2'
  | 'match'
  | 'access'
  | 'contact'
  | 'checkout'
  | 'waiting'
  | 'done'
  | 'failed'

export interface ContactState {
  name: string
  phone: string
  whatsapp: string
}

export interface FlowState {
  step: Step
  q1?: Q1Answer
  q2?: Q2Answer
  program?: ProgramId
  fromCard: boolean
  tier?: Tier
  contact: ContactState
  signupId?: string
  amount?: number
  isReturning?: boolean
  msisdn?: string
  checkoutRequestId?: string
  paid: boolean
  failureMessage?: string
}

export type FlowAction =
  | { type: 'START'; program?: ProgramId }
  | { type: 'ANSWER_Q1'; value: Q1Answer }
  | { type: 'ANSWER_Q2'; value: Q2Answer }
  | { type: 'CONTINUE_TO_ACCESS' }
  | { type: 'CHOOSE_TIER'; tier: Tier }
  | { type: 'SWITCH_TO_FOUNDATIONS' }
  | {
      type: 'SIGNUP_CREATED'
      contact: ContactState
      signupId: string
      program: ProgramId
      tier: Tier
      amount: number
      isReturning: boolean
      msisdn: string
    }
  | { type: 'PAYMENT_SENT'; checkoutRequestId: string }
  | { type: 'PAYMENT_CONFIRMED' }
  | { type: 'PAYMENT_FAILED'; message: string }
  | { type: 'RETRY_PAYMENT' }
  | { type: 'CHANGE_NUMBER' }
  | { type: 'BACK' }
  | { type: 'RESET' }

export const initialFlowState: FlowState = {
  step: 'hero',
  fromCard: false,
  contact: { name: '', phone: '', whatsapp: '' },
  paid: false,
}

function previousStep(state: FlowState): Step {
  switch (state.step) {
    case 'q1':
      return 'hero'
    case 'q2':
      return 'q1'
    case 'match':
      return state.fromCard ? 'hero' : 'q2'
    case 'access':
      return 'match'
    case 'contact':
      return 'access'
    case 'checkout':
      return 'contact'
    case 'failed':
      return 'checkout'
    default:
      return state.step
  }
}

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'START':
      if (action.program) {
        return {
          ...initialFlowState,
          contact: state.contact,
          step: 'match',
          program: action.program,
          fromCard: true,
        }
      }
      return { ...initialFlowState, contact: state.contact, step: 'q1' }

    case 'ANSWER_Q1':
      return { ...state, q1: action.value, step: 'q2' }

    case 'ANSWER_Q2': {
      if (!state.q1) return { ...state, step: 'q1' }
      return {
        ...state,
        q2: action.value,
        program: matchProgram(state.q1, action.value),
        fromCard: false,
        step: 'match',
      }
    }

    case 'CONTINUE_TO_ACCESS':
      return { ...state, step: 'access' }

    case 'CHOOSE_TIER':
      return { ...state, tier: action.tier, step: 'contact' }

    case 'SWITCH_TO_FOUNDATIONS':
      return { ...state, program: 'foundations', tier: 'free', step: 'contact' }

    case 'SIGNUP_CREATED':
      return {
        ...state,
        contact: action.contact,
        signupId: action.signupId,
        program: action.program,
        tier: action.tier,
        amount: action.amount,
        isReturning: action.isReturning,
        msisdn: action.msisdn,
        checkoutRequestId: undefined,
        failureMessage: undefined,
        paid: false,
        step: action.tier === 'free' ? 'done' : 'checkout',
      }

    case 'PAYMENT_SENT':
      return { ...state, checkoutRequestId: action.checkoutRequestId, step: 'waiting' }

    case 'PAYMENT_CONFIRMED':
      return { ...state, paid: true, step: 'done' }

    case 'PAYMENT_FAILED':
      return { ...state, failureMessage: action.message, step: 'failed' }

    case 'RETRY_PAYMENT':
      return { ...state, checkoutRequestId: undefined, failureMessage: undefined, step: 'checkout' }

    case 'CHANGE_NUMBER':
      return {
        ...state,
        signupId: undefined,
        amount: undefined,
        checkoutRequestId: undefined,
        failureMessage: undefined,
        step: 'contact',
      }

    case 'BACK':
      return { ...state, step: previousStep(state) }

    case 'RESET':
      return initialFlowState
  }
}

const STORAGE_KEY = 'trfc_onboarding_v1'

export function loadFlowState(): FlowState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return initialFlowState
    const parsed = JSON.parse(raw) as FlowState
    if (!parsed?.step || parsed.step === 'done') return initialFlowState
    return { ...initialFlowState, ...parsed }
  } catch {
    return initialFlowState
  }
}

export function saveFlowState(state: FlowState) {
  try {
    if (state.step === 'hero' || state.step === 'done') {
      sessionStorage.removeItem(STORAGE_KEY)
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  } catch {
    /* storage unavailable */
  }
}
