interface TicketDownloadButtonProps {
    ticketId: string;
    paymentStatus: 'pending' | 'paid' | 'failed';
    eventTitle?: string;
    className?: string;
}
export default function TicketDownloadButton({ ticketId, paymentStatus, eventTitle, className, }: TicketDownloadButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TicketDownloadButton.d.ts.map