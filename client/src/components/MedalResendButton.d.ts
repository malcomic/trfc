interface MedalResendButtonProps {
    checkoutRequestId?: string;
    purchaseId?: string;
    paymentStatus: string;
    verify?: {
        email?: string;
        phone?: string;
    };
    className?: string;
    compact?: boolean;
}
export default function MedalResendButton({ checkoutRequestId, purchaseId, paymentStatus, verify, className, compact, }: MedalResendButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=MedalResendButton.d.ts.map