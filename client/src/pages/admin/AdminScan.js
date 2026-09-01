import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { LogOut, QrCode, Keyboard, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { admitScan, listScanEvents, lookupScan, } from '../../api/scan';
import { formatEventDate, formatEventDateTime } from '../../utils/eventDate';
const EVENT_FILTER_KEY = 'trfc_scan_event_id';
const SCAN_MODE_KEY = 'trfc_scan_mode';
const READER_ID = 'qr-reader';
const SUCCESS_DISMISS_MS = 1200;
const ERROR_DISMISS_MS = 2000;
function formatWhen(value) {
    if (!value)
        return '';
    try {
        return new Date(value).toLocaleString();
    }
    catch {
        return value;
    }
}
function statusTone(status) {
    if (status === 'valid')
        return 'bg-emerald-600';
    if (status === 'already_checked_in' || status === 'already_redeemed')
        return 'bg-amber-500';
    return 'bg-red-600';
}
function statusLabel(result) {
    switch (result.status) {
        case 'valid':
            return result.kind === 'medal' ? 'Valid medal' : 'Valid ticket';
        case 'already_checked_in':
            return 'Already checked in';
        case 'already_redeemed':
            return 'Already redeemed';
        case 'unpaid':
            return 'Unpaid';
        case 'wrong_event':
            return 'Wrong event';
        case 'ambiguous':
            return 'Ambiguous code';
        case 'not_found':
        default:
            return 'Not found';
    }
}
export default function AdminScan() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [eventId, setEventId] = useState(() => sessionStorage.getItem(EVENT_FILTER_KEY) || '');
    const [scanMode, setScanMode] = useState(() => {
        const stored = sessionStorage.getItem(SCAN_MODE_KEY);
        return stored === 'hardware' ? 'hardware' : 'camera';
    });
    const [result, setResult] = useState(null);
    const [lookingUp, setLookingUp] = useState(false);
    const [admitting, setAdmitting] = useState(false);
    const [flash, setFlash] = useState('');
    const [manualOpen, setManualOpen] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [cameraError, setCameraError] = useState('');
    const [scannerReady, setScannerReady] = useState(false);
    const scannerRef = useRef(null);
    const busyRef = useRef(false);
    const eventIdRef = useRef(eventId);
    const hardwareInputRef = useRef(null);
    const resetTimeoutRef = useRef(undefined);
    const manualOpenRef = useRef(manualOpen);
    useEffect(() => {
        manualOpenRef.current = manualOpen;
    }, [manualOpen]);
    useEffect(() => {
        eventIdRef.current = eventId;
        if (eventId)
            sessionStorage.setItem(EVENT_FILTER_KEY, eventId);
        else
            sessionStorage.removeItem(EVENT_FILTER_KEY);
    }, [eventId]);
    useEffect(() => {
        listScanEvents()
            .then((data) => setEvents(Array.isArray(data) ? data : []))
            .catch(() => setEvents([]));
    }, []);
    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };
    const setScanModeAndPersist = (mode) => {
        setScanMode(mode);
        sessionStorage.setItem(SCAN_MODE_KEY, mode);
    };
    const focusHardwareInput = useCallback(() => {
        if (!manualOpenRef.current) {
            hardwareInputRef.current?.focus();
            setScannerReady(document.activeElement === hardwareInputRef.current);
        }
    }, []);
    const resumeCamera = useCallback(async () => {
        if (scannerRef.current?.isScanning) {
            try {
                scannerRef.current.resume();
            }
            catch {
                /* ignore */
            }
        }
    }, []);
    const scheduleReset = useCallback((ms) => {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = window.setTimeout(() => {
            setResult(null);
            setFlash('');
            setAdmitting(false);
            busyRef.current = false;
            void resumeCamera();
            focusHardwareInput();
        }, ms);
    }, [resumeCamera, focusHardwareInput]);
    const resetScan = useCallback(() => {
        clearTimeout(resetTimeoutRef.current);
        setResult(null);
        setFlash('');
        setAdmitting(false);
        busyRef.current = false;
        void resumeCamera();
        focusHardwareInput();
    }, [resumeCamera, focusHardwareInput]);
    const processScan = useCallback(async (raw) => {
        const value = raw.trim();
        if (!value || busyRef.current)
            return;
        busyRef.current = true;
        setLookingUp(true);
        setFlash('');
        clearTimeout(resetTimeoutRef.current);
        try {
            const body = {};
            if (value.includes(':') || value.length > 12) {
                body.payload = value;
            }
            else {
                body.shortCode = value;
            }
            if (eventIdRef.current)
                body.eventId = eventIdRef.current;
            const data = await lookupScan(body);
            setResult(data);
            setManualOpen(false);
            setManualCode('');
            if (scannerRef.current?.isScanning) {
                try {
                    await scannerRef.current.pause(true);
                }
                catch {
                    /* ignore */
                }
            }
            if (data.kind && data.status === 'valid') {
                setLookingUp(false);
                setAdmitting(true);
                try {
                    const updated = await admitScan({
                        kind: data.kind,
                        id: data.kind === 'ticket' ? data.ticket.id : data.purchase.id,
                        eventId: eventIdRef.current || undefined,
                    });
                    setResult(updated);
                    setFlash(data.kind === 'ticket' ? 'Checked in' : 'Redeemed');
                    scheduleReset(SUCCESS_DISMISS_MS);
                }
                catch (err) {
                    const errData = err && typeof err === 'object' && 'response' in err
                        ? err.response?.data
                        : undefined;
                    if (errData && 'status' in errData) {
                        setResult(errData);
                    }
                    else {
                        setFlash('Admit failed');
                    }
                    scheduleReset(ERROR_DISMISS_MS);
                }
                finally {
                    setAdmitting(false);
                }
                return;
            }
            scheduleReset(ERROR_DISMISS_MS);
        }
        catch (err) {
            console.error(err);
            setResult({ kind: null, status: 'not_found' });
            scheduleReset(ERROR_DISMISS_MS);
        }
        finally {
            setLookingUp(false);
        }
    }, [scheduleReset]);
    const handleHardwareKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = e.currentTarget.value;
            e.currentTarget.value = '';
            void processScan(value);
        }
    };
    useEffect(() => {
        focusHardwareInput();
        return () => clearTimeout(resetTimeoutRef.current);
    }, [focusHardwareInput]);
    useEffect(() => {
        if (!manualOpen) {
            focusHardwareInput();
        }
    }, [manualOpen, focusHardwareInput]);
    useEffect(() => {
        if (scanMode !== 'camera') {
            setCameraError('');
            return;
        }
        let cancelled = false;
        const scanner = new Html5Qrcode(READER_ID);
        scannerRef.current = scanner;
        const start = async () => {
            try {
                await scanner.start({ facingMode: 'environment' }, { fps: 8, qrbox: { width: 260, height: 260 } }, (decoded) => {
                    void processScan(decoded);
                }, () => { });
                if (cancelled) {
                    await scanner.stop().catch(() => { });
                }
            }
            catch (err) {
                console.error(err);
                if (!cancelled) {
                    setCameraError('Camera unavailable. Use manual code entry or switch to scanner gun mode.');
                }
            }
        };
        void start();
        return () => {
            cancelled = true;
            if (scanner.isScanning) {
                void scanner.stop().catch(() => { });
            }
            scannerRef.current = null;
        };
    }, [processScan, scanMode]);
    return (_jsxs("div", { className: "min-h-screen bg-gray-950 text-white flex flex-col", children: [_jsx("input", { ref: hardwareInputRef, type: "text", className: "sr-only", "aria-label": "Hardware scanner input", autoComplete: "off", onKeyDown: handleHardwareKeyDown, onFocus: () => setScannerReady(true), onBlur: () => setScannerReady(false) }), _jsxs("header", { className: "sticky top-0 z-20 bg-gray-900/95 border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx(QrCode, { size: 22, className: "text-emerald-400 shrink-0" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "font-bold text-sm tracking-wide uppercase truncate", children: "TRFC Scanner" }), _jsx("p", { className: "text-xs text-gray-400 truncate", children: user?.name || 'Staff' })] })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsxs("div", { className: "flex rounded-lg border border-gray-700 overflow-hidden text-xs font-semibold", children: [_jsx("button", { type: "button", onClick: () => setScanModeAndPersist('camera'), className: `px-2.5 py-2 min-h-[36px] transition-colors ${scanMode === 'camera'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:text-white'}`, children: "Camera" }), _jsx("button", { type: "button", onClick: () => setScanModeAndPersist('hardware'), className: `px-2.5 py-2 min-h-[36px] transition-colors ${scanMode === 'hardware'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:text-white'}`, children: "Gun" })] }), _jsxs("button", { type: "button", onClick: handleLogout, className: "flex items-center gap-1.5 text-sm text-gray-300 hover:text-white min-h-[44px] px-2", children: [_jsx(LogOut, { size: 18 }), "Logout"] })] })] }), _jsxs("div", { className: "px-4 py-3 border-b border-gray-800 bg-gray-900", children: [_jsxs("div", { className: "flex items-center justify-between gap-3 mb-1.5", children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-gray-400", children: "Event filter" }), scannerReady && (_jsxs("span", { className: "flex items-center gap-1.5 text-xs text-emerald-400 shrink-0", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-400" }), "Scanner ready"] }))] }), _jsxs("select", { value: eventId, onChange: (e) => setEventId(e.target.value), className: "w-full min-h-[44px] rounded-lg bg-gray-800 border border-gray-700 px-3 text-white", children: [_jsx("option", { value: "", children: "All events" }), events.map((ev) => (_jsxs("option", { value: ev.id, children: [ev.title, ev.event_date
                                        ? ` · ${formatEventDate(ev.event_date, { year: 'numeric', month: 'short', day: 'numeric' })}`
                                        : ''] }, ev.id)))] })] }), _jsxs("div", { className: "flex-1 flex flex-col px-4 py-4 gap-4", children: [scanMode === 'camera' ? (_jsxs("div", { className: "relative rounded-xl overflow-hidden bg-black aspect-square max-h-[55vh] mx-auto w-full max-w-md", children: [_jsx("div", { id: READER_ID, className: "w-full h-full" }), (lookingUp || admitting) && (_jsx("div", { className: "absolute inset-0 bg-black/50 flex items-center justify-center text-sm font-semibold", children: admitting && !flash ? 'Checking in…' : 'Looking up…' }))] })) : (_jsxs("div", { className: "relative rounded-xl overflow-hidden bg-gray-900 border border-gray-700 aspect-square max-h-[55vh] mx-auto w-full max-w-md flex flex-col items-center justify-center px-6 text-center", children: [_jsx(QrCode, { size: 48, className: "text-emerald-400 mb-4" }), _jsx("p", { className: "text-lg font-semibold", children: "Ready to scan" }), _jsx("p", { className: "text-sm text-gray-400 mt-1", children: "Point the scanner gun at a ticket or medal QR code" }), (lookingUp || admitting) && (_jsx("p", { className: "text-sm font-semibold text-emerald-400 mt-4", children: admitting && !flash ? 'Checking in…' : 'Looking up…' }))] })), cameraError && scanMode === 'camera' && (_jsx("p", { className: "text-amber-400 text-sm text-center", children: cameraError })), _jsxs("button", { type: "button", onClick: () => setManualOpen(true), className: "mx-auto flex items-center gap-2 min-h-[48px] px-5 rounded-lg bg-gray-800 border border-gray-700 font-semibold", children: [_jsx(Keyboard, { size: 18 }), "Enter code"] })] }), manualOpen && (_jsx("div", { className: "fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-md bg-gray-900 rounded-2xl p-5 border border-gray-700", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "font-bold text-lg", children: "Enter code" }), _jsx("button", { type: "button", onClick: () => setManualOpen(false), className: "p-2", "aria-label": "Close", children: _jsx(X, { size: 20 }) })] }), _jsx("input", { value: manualCode, onChange: (e) => setManualCode(e.target.value), onKeyDown: (e) => {
                                if (e.key === 'Enter' && manualCode.trim() && !lookingUp && !admitting) {
                                    e.preventDefault();
                                    void processScan(manualCode);
                                }
                            }, placeholder: "Short code or QR payload", className: "w-full min-h-[48px] rounded-lg bg-gray-800 border border-gray-700 px-3 mb-4", autoFocus: true }), _jsx("button", { type: "button", disabled: !manualCode.trim() || lookingUp || admitting, onClick: () => void processScan(manualCode), className: "w-full min-h-[48px] rounded-lg bg-emerald-600 font-bold disabled:opacity-50", children: "Look up" })] }) })), result && (_jsx("div", { className: "fixed inset-0 z-30 bg-black/80 flex items-end sm:items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-2xl overflow-hidden bg-gray-900 border border-gray-700", children: [_jsx("div", { className: `px-5 py-6 text-center ${flash ? 'bg-emerald-600' : statusTone(result.status)}`, children: _jsx("p", { className: "text-2xl font-black uppercase tracking-wide", children: flash || (admitting ? 'Checking in…' : statusLabel(result)) }) }), _jsxs("div", { className: "px-5 py-4 space-y-2 text-sm", children: [result.kind === 'ticket' && result.ticket && (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-xl font-bold", children: result.ticket.attendeeName || 'Guest' }), _jsx("p", { className: "text-gray-300", children: result.ticket.eventTitle || 'Unknown event' }), result.ticket.eventDate && (_jsx("p", { className: "text-gray-400", children: formatEventDateTime(result.ticket.eventDate) })), _jsx("p", { className: "text-gray-500 font-mono", children: result.ticket.shortCode }), result.ticket.checkedInAt && (_jsxs("p", { className: "text-amber-300", children: ["Checked in ", formatWhen(result.ticket.checkedInAt)] }))] })), result.kind === 'medal' && result.purchase && (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-xl font-bold", children: result.purchase.buyerName || 'Guest' }), _jsxs("p", { className: "text-gray-300", children: [result.purchase.tierName, " \u00B7 ", result.purchase.distanceKm, " km"] }), _jsx("p", { className: "text-gray-500 font-mono", children: result.purchase.shortCode }), result.purchase.redeemedAt && (_jsxs("p", { className: "text-amber-300", children: ["Redeemed ", formatWhen(result.purchase.redeemedAt)] }))] })), (result.kind === null || result.status === 'ambiguous') && (_jsx("p", { className: "text-gray-300", children: result.status === 'ambiguous'
                                        ? 'Multiple matches. Scan the full QR or enter a longer code.'
                                        : 'No matching ticket or medal found.' }))] }), _jsx("div", { className: "px-5 pb-5", children: _jsx("button", { type: "button", onClick: () => resetScan(), className: "w-full min-h-[48px] rounded-lg bg-gray-800 border border-gray-700 font-semibold", children: "Continue" }) })] }) }))] }));
}
//# sourceMappingURL=AdminScan.js.map