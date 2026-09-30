import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Loader } from 'lucide-react';
import { usePaymentPolling } from '../../hooks/usePaymentPolling';
import { WAITING_COPY } from '../../content/onboarding';
import { StepShell, StepTitle } from './ui';
export default function PaymentWaiting({ checkoutRequestId, onPaid, onFailed, }) {
    const { status, error } = usePaymentPolling(checkoutRequestId, true, {
        rejected: 'The payment was cancelled or declined.',
        timeout: "We couldn't confirm the payment in time. If M-Pesa deducted your money, contact us and we'll sort it out.",
        unreachable: "We couldn't check the payment status. If M-Pesa deducted your money, contact us.",
    });
    useEffect(() => {
        if (status === 'success')
            onPaid();
        if (status === 'failed')
            onFailed(error);
    }, [status]);
    return (_jsx(StepShell, { children: _jsxs("div", { className: "text-center py-6", children: [_jsx(Loader, { className: "w-14 h-14 text-accent animate-spin mx-auto mb-6" }), _jsx(StepTitle, { children: WAITING_COPY.title }), _jsx("p", { className: "text-base leading-relaxed text-white/80 max-w-md mx-auto", children: WAITING_COPY.body })] }) }));
}
//# sourceMappingURL=PaymentWaiting.js.map