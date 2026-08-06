export interface TicketCardData {
    id: string;
    shortCode: string;
    attendeeName: string;
    paymentStatus: string;
    qrDataUrl: string | null;
    eventTitle: string;
    eventDate?: string | null;
    location?: string | null;
    unitPrice?: number | null;
    mpesaReceipt?: string | null;
    phone?: string | null;
}
interface TicketCardProps {
    ticket: TicketCardData;
    index?: number;
    total?: number;
    verify?: {
        email?: string;
        phone?: string;
    };
    showActions?: boolean;
}
export default function TicketCard({ ticket, index, total, verify, showActions, }: TicketCardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TicketCard.d.ts.map