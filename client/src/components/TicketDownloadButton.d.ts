interface TicketDownloadButtonProps {
    ticketId: string;
    paymentStatus: 'pending' | 'paid' | 'failed' | string;
    eventTitle?: string;
    className?: string;
    /** Guest verification — email/phone used at checkout */
    verify?: {
        email?: string;
        phone?: string;
    };
    compact?: boolean;
}
export default function TicketDownloadButton({ ticketId, paymentStatus, eventTitle, className, verify, compact, }: TicketDownloadButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TicketDownloadButton.d.ts.map