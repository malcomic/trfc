import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useReducer, useRef, useState } from 'react';
import { createSignup } from '../../api/signups';
import { initiateSignupPayment } from '../../api/payments';
import { PROGRAMS } from '../../content/programs';
import { FAILED_COPY, QUESTION_1, QUESTION_2, TIER_LABELS } from '../../content/onboarding';
import { trackClickButton, trackCompletePayment, trackCompleteRegistration, trackInitiateCheckout, trackViewContent, } from '../../utils/tiktokPixel';
import { flowReducer, loadFlowState, saveFlowState } from './flowReducer';
import HeroIntro from './HeroIntro';
import QuizStep from './QuizStep';
import MatchReveal from './MatchReveal';
import AccessChoice from './AccessChoice';
import ContactForm from './ContactForm';
import MpesaCheckout from './MpesaCheckout';
import PaymentWaiting from './PaymentWaiting';
import Confirmation from './Confirmation';
import { ErrorNote, PrimaryButton, SecondaryButton, StepShell, StepTitle, tone } from './ui';
function apiErrorMessage(error, fallback) {
    const err = error;
    return err.response?.data?.error || fallback;
}
export default function OnboardingFlow({ startRequest }) {
    const [state, dispatch] = useReducer(flowReducer, undefined, loadFlowState);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const containerRef = useRef(null);
    const isFirstRender = useRef(true);
    const program = state.program ? PROGRAMS[state.program] : undefined;
    const eyebrow = program
        ? state.tier
            ? `${program.name} · ${TIER_LABELS[state.tier]}`
            : program.name
        : '';
    useEffect(() => {
        saveFlowState(state);
    }, [state]);
    useEffect(() => {
        if (!startRequest)
            return;
        dispatch({ type: 'START', program: startRequest.program });
        trackClickButton(`find_program_${startRequest.nonce}`, {
            contents: [{ content_id: startRequest.program ?? 'quiz', content_type: 'program' }],
        });
    }, [startRequest?.nonce]);
    useEffect(() => {
        setActionError('');
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const el = containerRef.current;
        if (el && el.getBoundingClientRect().top < 0) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [state.step]);
    useEffect(() => {
        if (state.step === 'match' && program) {
            trackViewContent({ content_id: program.id, content_type: 'program', content_name: program.name });
        }
    }, [state.step, program?.id]);
    const start = () => {
        dispatch({ type: 'START' });
        trackClickButton('find_program_hero', { contents: [{ content_id: 'quiz', content_type: 'program' }] });
    };
    const submitContact = async (contact) => {
        if (!state.program || !state.tier)
            return;
        setBusy(true);
        setActionError('');
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
            });
            dispatch({
                type: 'SIGNUP_CREATED',
                contact,
                signupId: res.signupId,
                program: res.program,
                tier: res.tier,
                amount: res.amount,
                isReturning: res.isReturning,
                msisdn: res.phone,
            });
            if (res.tier === 'free') {
                trackCompleteRegistration(res.signupId, {
                    contents: [{ content_id: res.program, content_type: 'program' }],
                    value: 0,
                });
            }
        }
        catch (error) {
            setActionError(apiErrorMessage(error, 'Could not complete signup. Please try again.'));
        }
        finally {
            setBusy(false);
        }
    };
    const sendPayment = async () => {
        if (!state.signupId || !state.msisdn || !state.amount)
            return;
        setBusy(true);
        setActionError('');
        try {
            const res = await initiateSignupPayment({
                phone: state.msisdn,
                amount: state.amount,
                signupId: state.signupId,
            });
            trackInitiateCheckout(state.signupId, {
                contents: [{ content_id: state.program ?? 'program', content_type: 'program' }],
                value: state.amount,
            });
            dispatch({ type: 'PAYMENT_SENT', checkoutRequestId: res.checkoutRequestId });
        }
        catch (error) {
            setActionError(apiErrorMessage(error, 'Could not send the payment prompt. Please try again.'));
        }
        finally {
            setBusy(false);
        }
    };
    const onPaid = () => {
        if (state.signupId) {
            trackCompletePayment(state.signupId, {
                contents: [{ content_id: state.program ?? 'program', content_type: 'program' }],
                value: state.amount,
            });
        }
        dispatch({ type: 'PAYMENT_CONFIRMED' });
    };
    const back = () => dispatch({ type: 'BACK' });
    const renderStep = () => {
        switch (state.step) {
            case 'hero':
                return _jsx(HeroIntro, { onStart: start });
            case 'q1':
                return (_jsx(QuizStep, { eyebrow: "Question 1 of 2", prompt: QUESTION_1.prompt, options: QUESTION_1.options, selected: state.q1, onSelect: (value) => dispatch({ type: 'ANSWER_Q1', value }), onBack: back }));
            case 'q2':
                return (_jsx(QuizStep, { eyebrow: "Question 2 of 2", prompt: QUESTION_2.prompt, options: QUESTION_2.options, selected: state.q2, onSelect: (value) => dispatch({ type: 'ANSWER_Q2', value }), onBack: back }));
            case 'match':
                if (!program)
                    return _jsx(HeroIntro, { onStart: start });
                return (_jsx(MatchReveal, { program: program, onContinue: () => dispatch({ type: 'CONTINUE_TO_ACCESS' }), onBack: back }));
            case 'access':
                if (!program)
                    return _jsx(HeroIntro, { onStart: start });
                return (_jsx(AccessChoice, { program: program, onChoose: (tier) => dispatch({ type: 'CHOOSE_TIER', tier }), onSwitchToFoundations: () => dispatch({ type: 'SWITCH_TO_FOUNDATIONS' }), onBack: back }));
            case 'contact':
                return (_jsx(ContactForm, { eyebrow: eyebrow, initial: state.contact, submitting: busy, serverError: actionError, onSubmit: submitContact, onBack: back }));
            case 'checkout':
                return (_jsx(MpesaCheckout, { eyebrow: eyebrow, phone: state.msisdn ?? '', amount: state.amount ?? 0, isReturning: Boolean(state.isReturning), sending: busy, error: actionError, onSend: sendPayment, onBack: back }));
            case 'waiting':
                if (!state.checkoutRequestId)
                    return null;
                return (_jsx(PaymentWaiting, { checkoutRequestId: state.checkoutRequestId, onPaid: onPaid, onFailed: (message) => dispatch({ type: 'PAYMENT_FAILED', message }) }));
            case 'failed':
                return (_jsxs(StepShell, { eyebrow: eyebrow, onBack: back, children: [_jsx(StepTitle, { children: FAILED_COPY.title }), _jsx("p", { className: `text-base leading-relaxed ${tone.textMuted} mb-4`, children: FAILED_COPY.body }), _jsx(ErrorNote, { message: state.failureMessage ?? '' }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(PrimaryButton, { onClick: () => dispatch({ type: 'RETRY_PAYMENT' }), children: FAILED_COPY.retry }), _jsx(SecondaryButton, { onClick: () => dispatch({ type: 'CHANGE_NUMBER' }), children: FAILED_COPY.changeNumber })] })] }));
            case 'done':
                return (_jsx(Confirmation, { paid: state.paid, programName: program?.name ?? '', tier: state.tier ?? 'free' }));
        }
    };
    return (_jsx("div", { ref: containerRef, className: "scroll-mt-24 w-full", children: renderStep() }));
}
//# sourceMappingURL=OnboardingFlow.js.map