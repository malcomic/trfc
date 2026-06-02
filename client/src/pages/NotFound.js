import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { pageRoot } from '../utils/themeClasses';
export default function NotFound() {
    return (_jsxs("div", { className: `${pageRoot} flex flex-col items-center justify-center px-6 text-center`, children: [_jsx("div", { className: "font-bebas text-[clamp(120px,20vw,200px)] text-fire/10 leading-none letter-spacing-tighter mb-4", children: "404" }), _jsx("h1", { className: "font-bebas text-4xl mb-3", children: "PAGE NOT FOUND" }), _jsx("p", { className: "text-fog light:text-fog-light max-w-md mb-10", children: "This route doesn't exist \u2014 maybe you took a wrong turn on the track." }), _jsx(Link, { to: "/", className: "bg-fire text-white px-10 py-3.5 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase no-underline hover:bg-ember", children: "Back to Home" })] }));
}
//# sourceMappingURL=NotFound.js.map