import api from './index';
/**
 * Buy tickets for an event
 */
export async function buyTickets(eventId, quantity, phone) {
    const response = await api.post('/events/tickets', {
        eventId,
        quantity,
        phone,
    });
    return response.data;
}
/**
 * Get all tickets for the current user
 */
export async function getUserTickets() {
    const response = await api.get('/events/tickets/list/user');
    return response.data;
}
/**
 * Get a single ticket by ID
 */
export async function getTicketById(ticketId) {
    const response = await api.get(`/events/tickets/${ticketId}`);
    return response.data;
}
/**
 * Update ticket payment status
 */
export async function updateTicketPaymentStatus(ticketId, paymentStatus, mpesaReceipt) {
    const response = await api.patch(`/events/tickets/${ticketId}`, {
        paymentStatus,
        mpesaReceipt,
    });
    return response.data;
}
/**
 * Download ticket as PDF
 * Triggers a browser download of the PDF file
 */
export async function downloadTicket(ticketId) {
    try {
        const response = await api.get(`/events/tickets/${ticketId}/download`, {
            responseType: 'blob',
        });
        // Create a blob URL and trigger download
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ticket-${ticketId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log(`✅ Ticket downloaded: ticket-${ticketId}.pdf`);
    }
    catch (error) {
        console.error('❌ Error downloading ticket:', error);
        throw error;
    }
}
export default {
    buyTickets,
    getUserTickets,
    getTicketById,
    updateTicketPaymentStatus,
    downloadTicket,
};
//# sourceMappingURL=tickets.js.map