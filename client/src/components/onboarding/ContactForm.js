import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { CONTACT_COPY, toKenyanMsisdn } from '../../content/onboarding';
import { ErrorNote, PrimaryButton, StepShell, StepTitle, tone } from './ui';
const fieldClass = 'w-full bg-white/5 light:bg-white border border-white/20 light:border-black/20 text-white light:text-black placeholder:text-white/40 light:placeholder:text-black/40 px-4 py-3.5 text-base focus:outline-none focus:border-accent light:focus:border-accent-light transition-colors';
const labelClass = `block font-barlow-condensed font-bold text-xs tracking-widest uppercase ${tone.textMuted} mb-1.5`;
export default function ContactForm({ eyebrow, initial, submitting, serverError, onSubmit, onBack, }) {
    const [values, setValues] = useState(initial);
    const [error, setError] = useState('');
    const update = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
    const copyPhoneToWhatsapp = () => {
        if (!values.whatsapp && values.phone)
            update('whatsapp', values.phone);
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!values.name.trim()) {
            setError('Please enter your name.');
            return;
        }
        if (!toKenyanMsisdn(values.phone)) {
            setError('Enter a valid phone number, e.g. 0712 345 678. This is where the M-Pesa prompt goes.');
            return;
        }
        const whatsapp = values.whatsapp.trim() || values.phone;
        if (!toKenyanMsisdn(whatsapp)) {
            setError('Enter a valid WhatsApp number, e.g. 0712 345 678.');
            return;
        }
        onSubmit({ name: values.name.trim(), phone: values.phone, whatsapp });
    };
    return (_jsxs(StepShell, { eyebrow: eyebrow, onBack: onBack, children: [_jsx(StepTitle, { children: "Where do we reach you?" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 mt-6", noValidate: true, children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "onb-name", className: labelClass, children: CONTACT_COPY.name.label }), _jsx("input", { id: "onb-name", type: "text", autoComplete: "name", className: fieldClass, placeholder: CONTACT_COPY.name.placeholder, value: values.name, onChange: (e) => update('name', e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "onb-phone", className: labelClass, children: CONTACT_COPY.phone.label }), _jsx("input", { id: "onb-phone", type: "tel", inputMode: "tel", autoComplete: "tel", className: fieldClass, placeholder: CONTACT_COPY.phone.placeholder, value: values.phone, onChange: (e) => update('phone', e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "onb-whatsapp", className: labelClass, children: CONTACT_COPY.whatsapp.label }), _jsx("input", { id: "onb-whatsapp", type: "tel", inputMode: "tel", className: fieldClass, placeholder: CONTACT_COPY.whatsapp.placeholder, value: values.whatsapp, onFocus: copyPhoneToWhatsapp, onClick: copyPhoneToWhatsapp, onChange: (e) => update('whatsapp', e.target.value) })] }), _jsx(ErrorNote, { message: error || serverError }), _jsx(PrimaryButton, { type: "submit", disabled: submitting, className: "w-full sm:w-auto", children: submitting ? 'Please wait…' : CONTACT_COPY.button })] })] }));
}
//# sourceMappingURL=ContactForm.js.map