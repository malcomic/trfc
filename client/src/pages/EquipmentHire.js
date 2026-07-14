import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableEquipment } from '../api/equipment';
import { AlertCircle, ArrowRight, Dumbbell, Check } from 'lucide-react';
import { Button, Card } from '../components/ui';
export default function EquipmentHire() {
    const navigate = useNavigate();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        const fetchPackages = async () => {
            try {
                setLoading(true);
                const data = await getAvailableEquipment();
                setPackages(data);
            }
            catch (err) {
                setError(err.response?.data?.error || 'Failed to load equipment packages');
            }
            finally {
                setLoading(false);
            }
        };
        fetchPackages();
    }, []);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-night text-chalk font-barlow flex items-center justify-center px-[6%] py-12", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-16 h-16 border-4 border-accent/20 light:border-accent-light/20 border-t-accent light:border-t-accent-light rounded-full animate-spin mx-auto mb-4" }), _jsx("p", { className: "text-fog", children: "Loading equipment packages..." })] }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-night text-chalk font-barlow", children: [_jsx("section", { className: "bg-gradient-to-r from-ink via-ash to-ink border-b border-white/5 px-[6%] py-16 md:py-20", children: _jsxs("div", { className: "max-w-5xl mx-auto", children: [_jsx("div", { className: "inline-flex items-center gap-2 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-accent light:text-accent-light mb-4 before:block before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light", children: "Premium Rentals" }), _jsxs("h1", { className: "font-bebas text-clamp-lg leading-tight text-chalk mb-4 letter-spacing-tighter", children: ["EQUIPMENT ", _jsx("span", { className: "text-accent light:text-accent-light", children: "HIRE" })] }), _jsx("p", { className: "text-lg text-fog max-w-2xl", children: "Rent professional gym equipment at affordable rates. Choose your rental period and start your fitness journey today." })] }) }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-16", children: [error && (_jsxs("div", { className: "flex items-start gap-3 bg-danger-red/10 border border-danger-red/30 p-5 mb-8 rounded-sm", children: [_jsx(AlertCircle, { size: 20, className: "text-danger-red flex-shrink-0 mt-0.5" }), _jsx("p", { className: "text-sm text-chalk/70", children: error })] })), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-16", children: packages.map((pkg) => (_jsx(Card, { variant: "interactive", children: _jsxs(Card.Body, { children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-accent light:text-accent-light mb-2", children: "Rental Option" }), _jsx("h3", { className: "font-bebas text-2xl text-chalk letter-spacing-tighter capitalize", children: pkg.packageType })] }), _jsx("div", { className: "w-12 h-12 bg-accent/10 light:bg-accent-light/10 rounded-lg flex items-center justify-center flex-shrink-0", children: _jsx(Dumbbell, { size: 20, className: "text-accent light:text-accent-light" }) })] }), _jsx("p", { className: "text-sm text-fog mb-6 leading-relaxed", children: pkg.description }), _jsxs("div", { className: "mb-8 pb-8 border-b border-white/10", children: [_jsxs("div", { className: "font-bebas text-4xl text-accent light:text-accent-light letter-spacing-tighter", children: ["KES ", pkg.price.toLocaleString()] }), _jsx("p", { className: "text-xs text-fog mt-1", children: "Per day" })] }), _jsxs(Button, { onClick: () => navigate('/equipment-checkout', {
                                            state: { packageType: pkg.packageType, pricePerDay: pkg.price },
                                        }), variant: "primary", size: "lg", fullWidth: true, className: "flex items-center justify-center gap-2", children: ["Book Now ", _jsx(ArrowRight, { size: 16 })] })] }) }, pkg.packageType))) }), _jsx(Card, { children: _jsxs(Card.Body, { children: [_jsxs("h2", { className: "font-bebas text-3xl text-chalk mb-8 letter-spacing-tighter", children: ["HOW ", _jsx("span", { className: "text-accent light:text-accent-light", children: "IT WORKS" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-6", children: [
                                        {
                                            step: 1,
                                            title: 'Choose Package',
                                            desc: 'Select your rental period (daily, weekly, or monthly)'
                                        },
                                        {
                                            step: 2,
                                            title: 'Select Dates',
                                            desc: 'Pick your hire and return dates that work for you'
                                        },
                                        {
                                            step: 3,
                                            title: 'Confirm Details',
                                            desc: 'Review total cost and equipment specifications'
                                        },
                                        {
                                            step: 4,
                                            title: 'Pay with M-Pesa',
                                            desc: 'Complete payment securely via M-Pesa'
                                        },
                                        {
                                            step: 5,
                                            title: 'Collect Equipment',
                                            desc: 'Pick up your equipment at our location'
                                        }
                                    ].map((item) => (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-12 h-12 bg-accent light:bg-accent-light text-night font-bebas text-lg rounded-full flex items-center justify-center mx-auto mb-3", children: item.step }), _jsx("h4", { className: "font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk mb-2", children: item.title }), _jsx("p", { className: "text-xs text-fog leading-relaxed", children: item.desc })] }, item.step))) })] }) }), _jsx(Card, { className: "mt-12 bg-gradient-to-r from-accent/10 light:from-accent-light/10 via-accent/5 light:via-accent-light/5 to-accent/10 light:to-accent-light/10 border-accent/20 light:border-accent-light/20", children: _jsx(Card.Body, { children: _jsxs("div", { className: "flex items-start gap-4", children: [_jsx(Check, { size: 24, className: "text-accent light:text-accent-light flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("h3", { className: "font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk mb-2", children: "Why Rent From TRFC?" }), _jsxs("ul", { className: "space-y-2 text-sm text-fog", children: [_jsx("li", { children: "\u2713 Professional-grade equipment maintained to the highest standards" }), _jsx("li", { children: "\u2713 Competitive pricing with flexible rental periods" }), _jsx("li", { children: "\u2713 Quick booking process \u2014 rent in minutes" }), _jsx("li", { children: "\u2713 Local pickup at our Nairobi location" }), _jsx("li", { children: "\u2713 Dedicated support for all rentals" })] })] })] }) }) })] })] }));
}
//# sourceMappingURL=EquipmentHire.js.map