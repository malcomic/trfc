import { jsx as _jsx } from "react/jsx-runtime";
const Card = ({ variant = 'default', children, className = '' }) => {
    const baseStyles = 'bg-ash border border-mist rounded-lg transition-all duration-300';
    const variantStyles = {
        default: '',
        elevated: 'shadow-lg',
        interactive: 'hover:shadow-lg hover:scale-[1.01] cursor-pointer',
    };
    return _jsx("div", { className: `${baseStyles} ${variantStyles[variant]} ${className}`, children: children });
};
const CardHeader = ({ children, className = '' }) => (_jsx("div", { className: `px-6 py-4 border-b border-mist ${className}`, children: _jsx("h3", { className: "text-lg md:text-xl font-barlow-condensed font-700 text-chalk", children: children }) }));
const CardBody = ({ children, className = '' }) => (_jsx("div", { className: `px-6 py-4 ${className}`, children: children }));
const CardFooter = ({ children, className = '' }) => (_jsx("div", { className: `px-6 py-4 border-t border-mist flex gap-3 ${className}`, children: children }));
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
export default Card;
//# sourceMappingURL=Card.js.map