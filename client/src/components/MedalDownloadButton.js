import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Download, Loader, Check } from 'lucide-react';
import { downloadMedalPdf } from '../api/medals';
export default function MedalDownloadButton({ purchaseId, paymentStatus, label = 'Medal Certificate', className = '', verify, compact = false, }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const isDownloadable = paymentStatus === 'paid';
    const handleDownload = async () => {
        if (!isDownloadable) {
            setError('Payment must be completed before downloading');
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            setSuccess(false);
            await downloadMedalPdf(purchaseId, verify);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        catch (err) {
            console.error('Download error:', err);
            setError(err.response?.data?.error ||
                err.message ||
                'Failed to download certificate. Please try again.');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs("div", { className: className, children: [_jsx("button", { type: "button", onClick: handleDownload, disabled: isLoading || !isDownloadable, className: `
          inline-flex items-center justify-center gap-2 font-barlow-condensed font-black
          text-xs tracking-widest uppercase clip-angled transition-colors
          ${compact ? 'px-3 py-2' : 'px-4 py-2.5'}
          ${isDownloadable
                    ? 'bg-accent light:bg-accent-light text-black light:text-white hover:bg-accent/90 light:hover:bg-accent-light/90 cursor-pointer'
                    : 'bg-smoke text-fog cursor-not-allowed'}
          ${isLoading ? 'opacity-70' : ''}
        `, title: !isDownloadable
                    ? `Payment pending - ${label}`
                    : `Download ${label}`, children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader, { className: "h-3.5 w-3.5 animate-spin" }), "Downloading\u2026"] })) : success ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "h-3.5 w-3.5" }), "Downloaded"] })) : (_jsxs(_Fragment, { children: [_jsx(Download, { className: "h-3.5 w-3.5" }), "Download PDF"] })) }), error && _jsx("p", { className: "mt-2 text-sm text-red-400", children: error })] }));
}
//# sourceMappingURL=MedalDownloadButton.js.map