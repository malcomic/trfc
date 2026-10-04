import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckCircle } from 'lucide-react';
import { CONFIRMATION_COPY, TIER_LABELS } from '../../content/onboarding';
import { StepShell, StepTitle, tone } from './ui';
export default function Confirmation({ paid, programName, tier, }) {
    return (_jsx(StepShell, { eyebrow: `${programName} · ${TIER_LABELS[tier]}`, children: _jsxs("div", { className: "text-center py-4", children: [_jsx(CheckCircle, { className: `w-14 h-14 ${tone.accentText} mx-auto mb-6` }), _jsx(StepTitle, { children: paid ? CONFIRMATION_COPY.paidTitle : CONFIRMATION_COPY.freeTitle }), _jsx("p", { className: `text-base leading-relaxed ${tone.textMuted} max-w-md mx-auto mb-4`, children: CONFIRMATION_COPY.body }), _jsx("p", { className: `font-barlow-condensed font-bold text-lg tracking-widest uppercase ${tone.accentText}`, children: CONFIRMATION_COPY.signoff })] }) }));
}
//# sourceMappingURL=Confirmation.js.map