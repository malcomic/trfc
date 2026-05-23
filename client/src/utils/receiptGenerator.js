export function generateReceiptText(data) {
    const date = new Date(data.created_at);
    const typeLabel = getTypeLabel(data.type);
    return `
╔════════════════════════════════════════╗
║   TRFC - RECEIPT OF PAYMENT            ║
╚════════════════════════════════════════╝

Date: ${date.toLocaleDateString('en-KE')}
Time: ${date.toLocaleTimeString('en-KE')}

────────────────────────────────────────

TRANSACTION DETAILS

Type:              ${typeLabel}
Status:            ${data.payment_status.toUpperCase()}
Amount:            KES ${data.amount ? data.amount.toFixed(2) : 'N/A'}

${data.mpesa_receipt ? `M-Pesa Receipt:    ${data.mpesa_receipt}` : ''}
${data.checkout_request_id ? `Reference ID:      ${data.checkout_request_id}` : ''}
Transaction ID:    ${data.id}

────────────────────────────────────────

${'items' in data && data.items ? `ITEMS PURCHASED

${data.items.map((item) => `${item.name} x${item.quantity} - KES ${(item.price * item.quantity).toFixed(2)}`).join('\n')}

────────────────────────────────────────
` : ''}

PAYMENT METHOD: M-Pesa

CONTACT INFORMATION
Email: support@trfc.com
Phone: +254 (0) 700 000 000
Website: www.trfc.com

────────────────────────────────────────

Thank you for your transaction with TRFC!
Keep this receipt for your records.

Your payment has been ${data.payment_status === 'paid' ? 'successfully processed' : 'recorded as ' + data.payment_status}.

${data.payment_status === 'pending' ? 'Please allow 3-5 business days for the transaction to complete.' : ''}
${data.payment_status === 'failed' ? 'Please contact support if you were charged. A refund will be issued.' : ''}

═══════════════════════════════════════════
`;
}
export function downloadReceiptAsText(data) {
    const content = generateReceiptText(data);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `receipt-${data.id}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
export function downloadReceiptAsCSV(payments) {
    const headers = ['ID', 'Type', 'Amount (KES)', 'Status', 'Date', 'M-Pesa Receipt', 'Reference'];
    const rows = payments.map((payment) => [
        payment.id,
        getTypeLabel(payment.type),
        payment.amount ? payment.amount.toFixed(2) : 'N/A',
        payment.payment_status,
        new Date(payment.created_at).toLocaleDateString('en-KE'),
        'mpesa_receipt' in payment ? payment.mpesa_receipt || '' : '',
        'checkout_request_id' in payment ? payment.checkout_request_id || '' : '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `payment-history-${new Date().getTime()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
export function getTypeLabel(type) {
    switch (type) {
        case 'order':
            return 'Product Order';
        case 'ticket':
            return 'Event Ticket';
        case 'equipment_hire':
            return 'Equipment Rental';
        default:
            return type;
    }
}
export function formatReceiptData(data) {
    return {
        title: `${getTypeLabel(data.type)} Receipt`,
        items: [
            { label: 'Transaction ID', value: data.id },
            { label: 'Type', value: getTypeLabel(data.type) },
            { label: 'Amount', value: `KES ${data.amount ? data.amount.toFixed(2) : 'N/A'}` },
            { label: 'Status', value: data.payment_status.toUpperCase() },
            { label: 'Date', value: new Date(data.created_at).toLocaleDateString('en-KE') },
            ...(('mpesa_receipt' in data && data.mpesa_receipt)
                ? [{ label: 'M-Pesa Receipt', value: data.mpesa_receipt }]
                : []),
            ...(('checkout_request_id' in data && data.checkout_request_id)
                ? [{ label: 'Reference', value: data.checkout_request_id }]
                : []),
        ],
    };
}
//# sourceMappingURL=receiptGenerator.js.map