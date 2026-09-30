import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SUMMARY_LABELS } from '../../content/programs';
import { MATCH_COPY } from '../../content/onboarding';
import { PrimaryButton, StepShell, StepTitle } from './ui';
function LearnMore({ program }) {
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "border-t border-white/10 mt-6 pt-4", children: [_jsxs("button", { type: "button", onClick: () => setOpen((v) => !v), "aria-expanded": open, className: "w-full flex items-center justify-between font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent hover:text-accent/80 transition-colors", children: [_jsx("span", { children: MATCH_COPY.learnMore }), _jsx(ChevronDown, { size: 18, className: `transition-transform duration-200 ${open ? 'rotate-180' : ''}` })] }), open && (_jsx("div", { className: "mt-5 space-y-5", children: program.detail.map((section) => (_jsxs("div", { children: [_jsx("h3", { className: "font-barlow-condensed font-bold text-lg tracking-tight text-white mb-1.5", children: section.title }), section.body && _jsx("p", { className: "text-sm leading-relaxed text-white/70", children: section.body }), section.items && (_jsx("ul", { className: "list-disc pl-5 space-y-1 text-sm text-white/70", children: section.items.map((item) => (_jsx("li", { children: item }, item))) }))] }, section.title))) }))] }));
}
export default function MatchReveal({ program, onContinue, onBack, }) {
    return (_jsxs(StepShell, { eyebrow: "Your match", onBack: onBack, children: [_jsx(StepTitle, { children: program.headline }), _jsx("p", { className: "text-base md:text-lg leading-relaxed text-white/80 mb-6", children: program.tagline }), _jsx("dl", { className: "grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/10 border border-white/10", children: SUMMARY_LABELS.map(({ key, label }) => (_jsxs("div", { className: "bg-black/60 px-4 py-3", children: [_jsx("dt", { className: "font-barlow-condensed font-bold text-[11px] tracking-widest uppercase text-accent mb-0.5", children: label }), _jsx("dd", { className: "text-sm text-white/90", children: program.summary[key] })] }, key))) }), _jsx(LearnMore, { program: program }), _jsx("p", { className: "font-barlow-condensed font-bold text-lg tracking-tight text-white mt-8 mb-4", children: MATCH_COPY.almostThere }), _jsx(PrimaryButton, { onClick: onContinue, children: "Continue" })] }));
}
//# sourceMappingURL=MatchReveal.js.map