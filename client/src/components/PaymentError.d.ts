interface PaymentErrorProps {
    error: string;
    onRetry?: () => void;
    onContactSupport?: () => void;
    phone?: string;
}
export default function PaymentError({ error, onRetry, onContactSupport, phone, }: PaymentErrorProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=PaymentError.d.ts.map