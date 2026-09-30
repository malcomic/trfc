import { matchProgram } from '../../content/onboarding';
export const initialFlowState = {
    step: 'hero',
    fromCard: false,
    contact: { name: '', phone: '', whatsapp: '' },
    paid: false,
};
function previousStep(state) {
    switch (state.step) {
        case 'q1':
            return 'hero';
        case 'q2':
            return 'q1';
        case 'match':
            return state.fromCard ? 'hero' : 'q2';
        case 'access':
            return 'match';
        case 'contact':
            return 'access';
        case 'checkout':
            return 'contact';
        case 'failed':
            return 'checkout';
        default:
            return state.step;
    }
}
export function flowReducer(state, action) {
    switch (action.type) {
        case 'START':
            if (action.program) {
                return {
                    ...initialFlowState,
                    contact: state.contact,
                    step: 'match',
                    program: action.program,
                    fromCard: true,
                };
            }
            return { ...initialFlowState, contact: state.contact, step: 'q1' };
        case 'ANSWER_Q1':
            return { ...state, q1: action.value, step: 'q2' };
        case 'ANSWER_Q2': {
            if (!state.q1)
                return { ...state, step: 'q1' };
            return {
                ...state,
                q2: action.value,
                program: matchProgram(state.q1, action.value),
                fromCard: false,
                step: 'match',
            };
        }
        case 'CONTINUE_TO_ACCESS':
            return { ...state, step: 'access' };
        case 'CHOOSE_TIER':
            return { ...state, tier: action.tier, step: 'contact' };
        case 'SWITCH_TO_FOUNDATIONS':
            return { ...state, program: 'foundations', tier: 'free', step: 'contact' };
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
            };
        case 'PAYMENT_SENT':
            return { ...state, checkoutRequestId: action.checkoutRequestId, step: 'waiting' };
        case 'PAYMENT_CONFIRMED':
            return { ...state, paid: true, step: 'done' };
        case 'PAYMENT_FAILED':
            return { ...state, failureMessage: action.message, step: 'failed' };
        case 'RETRY_PAYMENT':
            return { ...state, checkoutRequestId: undefined, failureMessage: undefined, step: 'checkout' };
        case 'CHANGE_NUMBER':
            return {
                ...state,
                signupId: undefined,
                amount: undefined,
                checkoutRequestId: undefined,
                failureMessage: undefined,
                step: 'contact',
            };
        case 'BACK':
            return { ...state, step: previousStep(state) };
        case 'RESET':
            return initialFlowState;
    }
}
const STORAGE_KEY = 'trfc_onboarding_v1';
export function loadFlowState() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw)
            return initialFlowState;
        const parsed = JSON.parse(raw);
        if (!parsed?.step || parsed.step === 'done')
            return initialFlowState;
        return { ...initialFlowState, ...parsed };
    }
    catch {
        return initialFlowState;
    }
}
export function saveFlowState(state) {
    try {
        if (state.step === 'hero' || state.step === 'done') {
            sessionStorage.removeItem(STORAGE_KEY);
        }
        else {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    }
    catch {
        /* storage unavailable */
    }
}
//# sourceMappingURL=flowReducer.js.map