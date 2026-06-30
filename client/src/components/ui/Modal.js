import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { X } from 'lucide-react';
const Modal = ({ isOpen, onClose, children, title, size = 'md' }) => {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
    if (!isOpen)
        return null;
    const sizeStyles = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
    };
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [_jsx("div", { className: "absolute inset-0 bg-black/50 transition-opacity duration-300", onClick: onClose }), _jsxs("div", { className: `
          relative bg-ash border border-mist rounded-xl p-8 
          shadow-2xl animate-scaleIn
          ${sizeStyles[size]} w-full mx-4 md:mx-0
        `, children: [title && (_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-2xl md:text-3xl font-barlow-condensed font-700 text-chalk", children: title }), _jsx("button", { onClick: onClose, className: "p-1 hover:bg-smoke rounded-lg transition-colors duration-300 text-fog hover:text-chalk", "aria-label": "Close modal", children: _jsx(X, { size: 24 }) })] })), children] })] }));
};
const ModalHeader = ({ children, onClose }) => (_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-2xl md:text-3xl font-barlow-condensed font-700 text-chalk", children: children }), onClose && (_jsx("button", { onClick: onClose, className: "p-1 hover:bg-smoke rounded-lg transition-colors duration-300 text-fog hover:text-chalk", "aria-label": "Close modal", children: _jsx(X, { size: 24 }) }))] }));
const ModalBody = ({ children }) => _jsx("div", { className: "mb-6 text-fog", children: children });
const ModalFooter = ({ children }) => (_jsx("div", { className: "flex gap-3 justify-end border-t border-mist pt-6", children: children }));
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
export default Modal;
//# sourceMappingURL=Modal.js.map