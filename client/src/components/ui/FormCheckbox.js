import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const FormCheckbox = React.forwardRef(({ label, error, className = '', ...props }, ref) => {
    return (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("input", { ref: ref, type: "checkbox", className: `
            w-5 h-5 mt-1 bg-smoke border border-mist rounded cursor-pointer
            text-fire focus:outline-none focus:ring-2 focus:ring-fire/30
            transition-all duration-300
            ${error ? 'border-danger-red' : ''}
            ${className}
          `, ...props }), label && (_jsxs("label", { className: "text-sm md:text-base text-chalk cursor-pointer pt-1", children: [label, props.required && _jsx("span", { className: "text-danger-red ml-1", children: "*" })] })), error && _jsx("p", { className: "text-danger-red text-xs", children: error })] }));
});
FormCheckbox.displayName = 'FormCheckbox';
export default FormCheckbox;
//# sourceMappingURL=FormCheckbox.js.map