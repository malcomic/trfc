import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StepShell, StepTitle, tone } from './ui';
export default function QuizStep({ eyebrow, prompt, options, selected, onSelect, onBack, }) {
    return (_jsxs(StepShell, { eyebrow: eyebrow, onBack: onBack, children: [_jsx(StepTitle, { children: prompt }), _jsx("div", { className: "grid gap-3 mt-6", children: options.map((option) => {
                    const isSelected = option.value === selected;
                    return (_jsxs("button", { type: "button", onClick: () => onSelect(option.value), className: `text-left px-5 py-4 md:py-5 border transition-all duration-200 font-barlow-condensed font-bold text-lg md:text-xl tracking-tight flex items-center justify-between gap-4 group ${isSelected
                            ? `${tone.accentBorder} bg-accent/15 light:bg-accent-light/10 ${tone.text}`
                            : `${tone.border} ${tone.surface} ${tone.textStrong} ${tone.hoverAccentBorder} ${tone.hoverAccentSoftBg}`}`, children: [_jsx("span", { children: option.label }), _jsx("span", { className: `${tone.accentText} opacity-60 group-hover:opacity-100 transition-opacity`, children: "\u2192" })] }, option.value));
                }) })] }));
}
//# sourceMappingURL=QuizStep.js.map