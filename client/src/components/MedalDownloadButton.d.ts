interface MedalDownloadButtonProps {
    purchaseId: string;
    paymentStatus: 'pending' | 'paid' | 'failed' | string;
    label?: string;
    className?: string;
    verify?: {
        email?: string;
        phone?: string;
    };
    compact?: boolean;
}
export default function MedalDownloadButton({ purchaseId, paymentStatus, label, className, verify, compact, }: MedalDownloadButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=MedalDownloadButton.d.ts.map