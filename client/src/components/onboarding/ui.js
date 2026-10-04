import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeft } from 'lucide-react';
/** Theme-aware class tokens: dark theme by default, `light:` overrides for the light theme. */
export const tone = {
    text: 'text-white light:text-black',
    textStrong: 'text-white/90 light:text-black/85',
    textMuted: 'text-white/80 light:text-black/70',
    textSubtle: 'text-white/60 light:text-black/55',
    border: 'border-white/15 light:border-black/15',
    borderStrong: 'border-white/40 light:border-black/40',
    surface: 'bg-white/5 light:bg-black/[0.04]',
    accentText: 'text-accent light:text-accent-light',
    accentBorder: 'border-accent light:border-accent-light',
    accentSoftBg: 'bg-accent/10 light:bg-accent-light/10',
    accentSolid: 'bg-accent text-black light:bg-accent-light light:text-white',
    hoverAccentBorder: 'hover:border-accent light:hover:border-accent-light',
    hoverAccentText: 'hover:text-accent light:hover:text-accent-light',
    hoverAccentSoftBg: 'hover:bg-accent/10 light:hover:bg-accent-light/10',
};
export function PrimaryButton({ children, className = '', ...props }) {
    return (_jsx("button", { type: "button", ...props, className: `font-barlow-condensed font-black text-base tracking-wider uppercase text-black light:text-white px-9 py-3.5 bg-accent light:bg-accent-light clip-angled-lg transition-all duration-200 hover:bg-accent/90 light:hover:bg-accent-light/90 disabled:opacity-60 disabled:cursor-not-allowed ${className}`, children: children }));
}
export function SecondaryButton({ children, className = '', ...props }) {
    return (_jsx("button", { type: "button", ...props, className: `font-barlow-condensed font-bold text-base tracking-wider uppercase px-8 py-3 border ${tone.text} ${tone.borderStrong} ${tone.hoverAccentBorder} ${tone.hoverAccentText} transition-all duration-200 disabled:opacity-60 ${className}`, children: children }));
}
export function StepShell({ eyebrow, onBack, children, }) {
    return (_jsxs("div", { className: `w-full max-w-[720px] bg-black/55 light:bg-white/85 backdrop-blur-sm border border-white/10 light:border-black/10 p-6 md:p-10 ${tone.text} animate-fadeUp`, children: [_jsxs("div", { className: "flex items-center justify-between mb-6 min-h-[24px]", children: [onBack ? (_jsxs("button", { type: "button", onClick: onBack, className: `flex items-center gap-1.5 font-barlow-condensed font-bold text-xs tracking-widest uppercase ${tone.textSubtle} ${tone.hoverAccentText} transition-colors`, children: [_jsx(ArrowLeft, { size: 14 }), " Back"] })) : (_jsx("span", {})), eyebrow && (_jsx("span", { className: `font-barlow-condensed font-bold text-xs tracking-widest uppercase ${tone.accentText}`, children: eyebrow }))] }), children] }));
}
export function StepTitle({ children }) {
    return (_jsx("h2", { className: `font-bebas text-[clamp(32px,4.5vw,56px)] leading-[0.95] ${tone.text} mb-4`, children: children }));
}
export function ErrorNote({ message }) {
    if (!message)
        return null;
    return (_jsx("div", { className: "bg-red-500/10 border border-red-500/30 border-l-4 border-l-red-500 px-4 py-3 text-sm text-red-300 light:text-red-700 mb-4", children: message }));
}
//# sourceMappingURL=ui.js.map