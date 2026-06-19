import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
const SIZES = {
    sm: 'h-12',
    md: 'h-14',
    lg: 'h-19',
    xl: 'h-31',
};
export function Logo({ size = 'md', showTagline = false, className = '', linkToHome = false, onClick, }) {
    const content = (_jsxs("div", { className: `flex flex-col items-start ${className}`, children: [_jsx("img", { src: "/trfc-logo.png", alt: "Thika Road FC", className: `${SIZES[size]} w-auto object-contain dark:invert` }), showTagline && (_jsx("span", { className: "font-barlow-condensed font-bold text-[8px] tracking-wider text-fog light:text-fog-light leading-none mt-0.5", children: "Thika Road FC" }))] }));
    if (linkToHome) {
        return (_jsx(Link, { to: "/", onClick: onClick, className: "no-underline shrink-0", children: content }));
    }
    return content;
}
//# sourceMappingURL=Logo.js.map