import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const FormInput = React.forwardRef(({ label, error, helperText, size = 'md', className = '', ...props }, ref) => {
    const sizeStyles = {
        sm: 'px-3 py-2 text-xs',
        md: 'px-4 py-3 text-sm',
        lg: 'px-4 py-4 text-base',
    };
    return (_jsxs("div", { className: "w-full", children: [label && (_jsxs("label", { className: "block text-xs md:text-sm font-barlow-condensed font-700 text-chalk mb-2", children: [label, props.required && _jsx("span", { className: "text-danger-red ml-1", children: "*" })] })), _jsx("input", { ref: ref, className: `
            w-full bg-smoke border border-mist rounded-lg text-chalk placeholder-fog
            focus:outline-none focus:border-fire focus:ring-2 focus:ring-fire/30
            transition-all duration-300
            ${error ? 'border-danger-red focus:ring-danger-red/30 focus:border-danger-red' : ''}
            disabled:bg-ash disabled:opacity-60 disabled:cursor-not-allowed
            ${sizeStyles[size]}
            ${className}
          `, ...props }), error && _jsx("p", { className: "text-danger-red text-xs mt-1", children: error }), helperText && !error && _jsx("p", { className: "text-fog text-xs mt-1", children: helperText })] }));
});
FormInput.displayName = 'FormInput';
export default FormInput;
//# sourceMappingURL=FormInput.js.map