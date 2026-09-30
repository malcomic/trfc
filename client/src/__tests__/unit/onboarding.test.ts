import { describe, it, expect } from 'vitest'
import { matchProgram, toKenyanMsisdn, formatLocalPhone } from '../../content/onboarding'
import { flowReducer, initialFlowState, type FlowState } from '../../components/onboarding/flowReducer'

describe('matchProgram', () => {
  it('maps quiz answers to programs', () => {
    expect(matchProgram('start_moving', 'not_much')).toBe('foundations')
    expect(matchProgram('start_moving', 'active')).toBe('foundations')
    expect(matchProgram('lose_weight', 'not_much')).toBe('fat_loss')
    expect(matchProgram('lose_weight', 'active')).toBe('fat_loss')
    expect(matchProgram('race', 'not_much')).toBe('foundations')
    expect(matchProgram('race', 'active')).toBe('endurance')
    expect(matchProgram('outside', 'not_much')).toBe('hiking')
    expect(matchProgram('outside', 'active')).toBe('hiking')
  })
})

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

describe('flowReducer', () => {
  const run = (actions: Parameters<typeof flowReducer>[1][], from: FlowState = initialFlowState) =>
    actions.reduce(flowReducer, from)

  it('walks the quiz to a match', () => {
    const state = run([
      { type: 'START' },
      { type: 'ANSWER_Q1', value: 'race' },
      { type: 'ANSWER_Q2', value: 'active' },
    ])
    expect(state.step).toBe('match')
    expect(state.program).toBe('endurance')
    expect(state.fromCard).toBe(false)
  })

  it('program cards skip the quiz and back returns to hero', () => {
    const state = run([{ type: 'START', program: 'hiking' }])
    expect(state.step).toBe('match')
    expect(state.program).toBe('hiking')
    expect(flowReducer(state, { type: 'BACK' }).step).toBe('hero')
  })

  it('switching to Foundations sets the free tier and program', () => {
    const state = run([
      { type: 'START', program: 'fat_loss' },
      { type: 'CONTINUE_TO_ACCESS' },
      { type: 'SWITCH_TO_FOUNDATIONS' },
    ])
    expect(state).toMatchObject({ step: 'contact', program: 'foundations', tier: 'free' })
  })

  const signupCreated = (tier: 'free' | 'plus' | 'elite') => ({
    type: 'SIGNUP_CREATED' as const,
    contact: { name: 'Jane', phone: '0712345678', whatsapp: '0712345678' },
    signupId: 'signup-1',
    program: tier === 'free' ? ('foundations' as const) : ('fat_loss' as const),
    tier,
    amount: tier === 'free' ? 0 : 497,
    isReturning: false,
    msisdn: '254712345678',
  })

  it('free signups go straight to confirmation', () => {
    const state = run([{ type: 'START', program: 'foundations' }, signupCreated('free')])
    expect(state.step).toBe('done')
    expect(state.paid).toBe(false)
  })

  it('paid signups go through checkout, waiting and confirmation', () => {
    let state = run([{ type: 'START', program: 'fat_loss' }, signupCreated('plus')])
    expect(state.step).toBe('checkout')
    state = flowReducer(state, { type: 'PAYMENT_SENT', checkoutRequestId: 'chk-1' })
    expect(state).toMatchObject({ step: 'waiting', checkoutRequestId: 'chk-1' })
    state = flowReducer(state, { type: 'PAYMENT_CONFIRMED' })
    expect(state).toMatchObject({ step: 'done', paid: true })
  })

  it('a failed payment can be retried or the number changed', () => {
    const failed = run([
      { type: 'START', program: 'fat_loss' },
      signupCreated('plus'),
      { type: 'PAYMENT_SENT', checkoutRequestId: 'chk-1' },
      { type: 'PAYMENT_FAILED', message: 'Cancelled' },
    ])
    expect(failed).toMatchObject({ step: 'failed', failureMessage: 'Cancelled' })

    const retried = flowReducer(failed, { type: 'RETRY_PAYMENT' })
    expect(retried).toMatchObject({ step: 'checkout', signupId: 'signup-1' })
    expect(retried.checkoutRequestId).toBeUndefined()

    const changed = flowReducer(failed, { type: 'CHANGE_NUMBER' })
    expect(changed.step).toBe('contact')
    expect(changed.signupId).toBeUndefined()
  })

  it('back steps through the flow in reverse', () => {
    const atContact = run([
      { type: 'START' },
      { type: 'ANSWER_Q1', value: 'start_moving' },
      { type: 'ANSWER_Q2', value: 'not_much' },
      { type: 'CONTINUE_TO_ACCESS' },
      { type: 'CHOOSE_TIER', tier: 'free' },
    ])
    const steps = [atContact.step]
    let state = atContact
    for (let i = 0; i < 5; i++) {
      state = flowReducer(state, { type: 'BACK' })
      steps.push(state.step)
    }
    expect(steps).toEqual(['contact', 'access', 'match', 'q2', 'q1', 'hero'])
  })
})
