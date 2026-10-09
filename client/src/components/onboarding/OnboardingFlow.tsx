import { useEffect, useReducer, useRef, useState } from 'react'
import { createSignup } from '../../api/signups'
import { getStoredReferral } from '../../utils/referral'
import { initiateSignupPayment } from '../../api/payments'
import { PROGRAMS, type ProgramId } from '../../content/programs'
import { FAILED_COPY, QUESTION_1, QUESTION_2, TIER_LABELS } from '../../content/onboarding'
import {
  trackClickButton,
  trackCompletePayment,
  trackCompleteRegistration,
  trackInitiateCheckout,
  trackViewContent,
} from '../../utils/tiktokPixel'
import { flowReducer, loadFlowState, saveFlowState, type ContactState } from './flowReducer'
import HeroIntro from './HeroIntro'
import QuizStep from './QuizStep'
import MatchReveal from './MatchReveal'
import AccessChoice from './AccessChoice'
import ContactForm from './ContactForm'
import MpesaCheckout from './MpesaCheckout'
import PaymentWaiting from './PaymentWaiting'
import Confirmation from './Confirmation'
import { ErrorNote, PrimaryButton, SecondaryButton, StepShell, StepTitle, tone } from './ui'

export interface StartRequest {
  program?: ProgramId
  nonce: number
}

function apiErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { error?: string } } }
  return err.response?.data?.error || fallback
}

export default function OnboardingFlow({ startRequest }: { startRequest?: StartRequest | null }) {
  const [state, dispatch] = useReducer(flowReducer, undefined, loadFlowState)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  const program = state.program ? PROGRAMS[state.program] : undefined
  const eyebrow = program
    ? state.tier
      ? `${program.name} · ${TIER_LABELS[state.tier]}`
      : program.name
    : ''

  useEffect(() => {
    saveFlowState(state)
  }, [state])

  useEffect(() => {
    if (!startRequest) return
    dispatch({ type: 'START', program: startRequest.program })
    trackClickButton(`find_program_${startRequest.nonce}`, {
      contents: [{ content_id: startRequest.program ?? 'quiz', content_type: 'program' }],
    })
  }, [startRequest?.nonce])

  useEffect(() => {
    setActionError('')
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const el = containerRef.current
    if (el && el.getBoundingClientRect().top < 0) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [state.step])

  useEffect(() => {
    if (state.step === 'match' && program) {
      trackViewContent({ content_id: program.id, content_type: 'program', content_name: program.name })
    }
  }, [state.step, program?.id])

  const start = () => {
    dispatch({ type: 'START' })
    trackClickButton('find_program_hero', { contents: [{ content_id: 'quiz', content_type: 'program' }] })
  }

  const submitContact = async (contact: ContactState) => {
    if (!state.program || !state.tier) return
    setBusy(true)
    setActionError('')
    try {
      const res = await createSignup({
        name: contact.name,
        phone: contact.phone,
        whatsapp: contact.whatsapp,
        program: state.program,
        tier: state.tier,
        quizAnswers: {
          ...(state.q1 ? { q1: state.q1 } : {}),
          ...(state.q2 ? { q2: state.q2 } : {}),
          ...(state.fromCard ? { source: 'program_card' } : {}),
        },
        referralCode: getStoredReferral() ?? undefined,
      })
      dispatch({
        type: 'SIGNUP_CREATED',
        contact,
        signupId: res.signupId,
        program: res.program,
        tier: res.tier,
        amount: res.amount,
        isReturning: res.isReturning,
        msisdn: res.phone,
      })
      if (res.tier === 'free') {
        trackCompleteRegistration(res.signupId, {
          contents: [{ content_id: res.program, content_type: 'program' }],
          value: 0,
        })
      }
    } catch (error) {
      setActionError(apiErrorMessage(error, 'Could not complete signup. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const sendPayment = async () => {
    if (!state.signupId || !state.msisdn || !state.amount) return
    setBusy(true)
    setActionError('')
    try {
      const res = await initiateSignupPayment({
        phone: state.msisdn,
        amount: state.amount,
        signupId: state.signupId,
      })
      trackInitiateCheckout(state.signupId, {
        contents: [{ content_id: state.program ?? 'program', content_type: 'program' }],
        value: state.amount,
      })
      dispatch({ type: 'PAYMENT_SENT', checkoutRequestId: res.checkoutRequestId })
    } catch (error) {
      setActionError(apiErrorMessage(error, 'Could not send the payment prompt. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const onPaid = () => {
    if (state.signupId) {
      trackCompletePayment(state.signupId, {
        contents: [{ content_id: state.program ?? 'program', content_type: 'program' }],
        value: state.amount,
      })
    }
    dispatch({ type: 'PAYMENT_CONFIRMED' })
  }

  const back = () => dispatch({ type: 'BACK' })

  const renderStep = () => {
    switch (state.step) {
      case 'hero':
        return <HeroIntro onStart={start} />

      case 'q1':
        return (
          <QuizStep
            eyebrow="Question 1 of 2"
            prompt={QUESTION_1.prompt}
            options={QUESTION_1.options}
            selected={state.q1}
            onSelect={(value) => dispatch({ type: 'ANSWER_Q1', value })}
            onBack={back}
          />
        )

      case 'q2':
        return (
          <QuizStep
            eyebrow="Question 2 of 2"
            prompt={QUESTION_2.prompt}
            options={QUESTION_2.options}
            selected={state.q2}
            onSelect={(value) => dispatch({ type: 'ANSWER_Q2', value })}
            onBack={back}
          />
        )

      case 'match':
        if (!program) return <HeroIntro onStart={start} />
        return (
          <MatchReveal
            program={program}
            onContinue={() => dispatch({ type: 'CONTINUE_TO_ACCESS' })}
            onBack={back}
          />
        )

      case 'access':
        if (!program) return <HeroIntro onStart={start} />
        return (
          <AccessChoice
            program={program}
            onChoose={(tier) => dispatch({ type: 'CHOOSE_TIER', tier })}
            onSwitchToFoundations={() => dispatch({ type: 'SWITCH_TO_FOUNDATIONS' })}
            onBack={back}
          />
        )

      case 'contact':
        return (
          <ContactForm
            eyebrow={eyebrow}
            initial={state.contact}
            submitting={busy}
            serverError={actionError}
            onSubmit={submitContact}
            onBack={back}
          />
        )

      case 'checkout':
        return (
          <MpesaCheckout
            eyebrow={eyebrow}
            phone={state.msisdn ?? ''}
            amount={state.amount ?? 0}
            isReturning={Boolean(state.isReturning)}
            sending={busy}
            error={actionError}
            onSend={sendPayment}
            onBack={back}
          />
        )

      case 'waiting':
        if (!state.checkoutRequestId) return null
        return (
          <PaymentWaiting
            checkoutRequestId={state.checkoutRequestId}
            onPaid={onPaid}
            onFailed={(message) => dispatch({ type: 'PAYMENT_FAILED', message })}
          />
        )

      case 'failed':
        return (
          <StepShell eyebrow={eyebrow} onBack={back}>
            <StepTitle>{FAILED_COPY.title}</StepTitle>
            <p className={`text-base leading-relaxed ${tone.textMuted} mb-4`}>{FAILED_COPY.body}</p>
            <ErrorNote message={state.failureMessage ?? ''} />
            <div className="flex flex-wrap gap-3">
              <PrimaryButton onClick={() => dispatch({ type: 'RETRY_PAYMENT' })}>
                {FAILED_COPY.retry}
              </PrimaryButton>
              <SecondaryButton onClick={() => dispatch({ type: 'CHANGE_NUMBER' })}>
                {FAILED_COPY.changeNumber}
              </SecondaryButton>
            </div>
          </StepShell>
        )

      case 'done':
        return (
          <Confirmation
            paid={state.paid}
            programName={program?.name ?? ''}
            tier={state.tier ?? 'free'}
          />
        )
    }
  }

  return (
    <div ref={containerRef} className="scroll-mt-24 w-full">
      {renderStep()}
    </div>
  )
}
