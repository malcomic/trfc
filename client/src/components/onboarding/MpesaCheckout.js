import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CHECKOUT_COPY, formatLocalPhone } from '../../content/onboarding';
import { ErrorNote, PrimaryButton, StepShell, StepTitle, tone } from './ui';
export default function MpesaCheckout({ eyebrow, phone, amount, isReturning, sending, error, onSend, onBack, }) {
    return (_jsxs(StepShell, { eyebrow: eyebrow, onBack: onBack, children: [_jsx(StepTitle, { children: CHECKOUT_COPY.title }), _jsx("p", { className: `text-base leading-relaxed ${tone.textMuted} mb-6`, children: CHECKOUT_COPY.body(formatLocalPhone(phone)) }), _jsxs("div", { className: `border ${tone.border} ${tone.surface} px-5 py-4 mb-6`, children: [_jsx("p", { className: `font-bebas text-4xl ${tone.accentText} leading-none`, children: CHECKOUT_COPY.amount(amount) }), isReturning && _jsx("p", { className: `text-xs ${tone.textSubtle} mt-2`, children: CHECKOUT_COPY.returningNote })] }), _jsx(ErrorNote, { message: error }), _jsx(PrimaryButton, { onClick: onSend, disabled: sending, className: "w-full sm:w-auto", children: sending ? 'Sending…' : CHECKOUT_COPY.button })] }));
}
//# sourceMappingURL=MpesaCheckout.js.map