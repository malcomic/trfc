import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { AlertCircle, CheckCircle, Mail, MapPin, Phone } from 'lucide-react';
import { Button, FormInput } from '../components/ui';
export default function Contact() {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const onSubmit = async (data) => {
        try {
            setLoading(true);
            setErrorMessage('');
            // TODO: Replace with actual API call
            console.log('Contact form submitted:', data);
            setSuccess(true);
            reset();
            setTimeout(() => setSuccess(false), 5000);
        }
        catch (error) {
            setErrorMessage(error.message || 'Failed to send message. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-night text-chalk font-barlow", children: [_jsxs("section", { className: "relative overflow-hidden bg-gradient-to-br from-ink via-ash to-night border-b border-white/5 px-[6%] py-16 md:py-24", children: [_jsxs("div", { className: "absolute inset-0 opacity-10", children: [_jsx("div", { className: "absolute top-0 right-0 w-96 h-96 bg-fire rounded-full blur-3xl", style: { transform: 'translate(50%, -50%)' } }), _jsx("div", { className: "absolute bottom-0 left-0 w-72 h-72 bg-ember rounded-full blur-3xl", style: { transform: 'translate(-30%, 30%)' } })] }), _jsxs("div", { className: "max-w-5xl mx-auto relative z-10", children: [_jsx("div", { className: "inline-flex items-center gap-2 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-4 before:block before:w-5 before:h-0.5 before:bg-fire", children: "Get In Touch" }), _jsxs("h1", { className: "font-bebas text-clamp-lg leading-tight text-chalk mb-4 letter-spacing-tighter", children: ["CONNECT", _jsx("br", {}), "WITH US"] }), _jsx("p", { className: "font-barlow text-lg text-fog max-w-2xl leading-relaxed", children: "Have questions about TRFC events, shop products, or want to collaborate? Our community team is here to help. Reach out anytime \u2014 we'd love to hear from you." })] })] }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-16", children: [_jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8 mb-16", children: [
                            {
                                icon: MapPin,
                                title: 'Location',
                                details: ['Nairobi, Kenya', 'East Africa'],
                                color: 'fire'
                            },
                            {
                                icon: Mail,
                                title: 'Email',
                                details: ['info@thikafrc.com', 'support@thikafrc.com'],
                                color: 'fire'
                            },
                            {
                                icon: Phone,
                                title: 'Phone',
                                details: ['+254 712 345 678', 'Mon-Sat 9am-5pm'],
                                color: 'fire'
                            }
                        ].map((contact, idx) => {
                            const Icon = contact.icon;
                            return (_jsx("div", { className: "bg-ash border border-white/10 p-6 hover:border-fire/30 transition-all duration-300 group", children: _jsxs("div", { className: "flex items-start gap-4", children: [_jsx("div", { className: "w-12 h-12 bg-fire/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-fire/20 transition-colors duration-300", children: _jsx(Icon, { size: 20, className: "text-fire" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk mb-2", children: contact.title }), contact.details.map((detail, i) => (_jsx("p", { className: "text-sm text-fog mb-1", children: detail }, i)))] })] }) }, idx));
                        }) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-12", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-bebas text-4xl text-chalk mb-2 letter-spacing-tighter", children: "Send us a Message" }), _jsx("p", { className: "text-fog mb-8", children: "Fill out the form below and we'll get back to you as soon as possible." }), success && (_jsxs("div", { className: "flex items-start gap-3 bg-success-green/10 border border-success-green/30 p-4 mb-6 rounded-sm", children: [_jsx(CheckCircle, { size: 20, className: "text-success-green flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-success-green", children: "Message Sent!" }), _jsx("p", { className: "text-sm text-chalk/70 mt-1", children: "Thank you for reaching out. We'll be in touch soon." })] })] })), errorMessage && (_jsxs("div", { className: "flex items-start gap-3 bg-danger-red/10 border border-danger-red/30 p-4 mb-6 rounded-sm", children: [_jsx(AlertCircle, { size: 20, className: "text-danger-red flex-shrink-0 mt-0.5" }), _jsx("span", { className: "text-sm text-danger-red", children: errorMessage })] })), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsx(FormInput, { label: "Full Name", id: "contact-name", type: "text", placeholder: "Jane Mwangi", error: errors.name ? errors.name.message : undefined, ...register('name', { required: 'Name is required' }) }), _jsx(FormInput, { label: "Email Address", id: "contact-email", type: "email", placeholder: "you@example.com", error: errors.email ? errors.email.message : undefined, ...register('email', {
                                                            required: 'Email is required',
                                                            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' }
                                                        }) })] }), _jsx(FormInput, { label: "Phone Number", id: "contact-phone", type: "tel", placeholder: "+254 712 345 678", error: errors.phone ? errors.phone.message : undefined, ...register('phone', { required: 'Phone is required' }) }), _jsxs("div", { children: [_jsx("label", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/40 mb-2.5 block", htmlFor: "contact-subject", children: "Subject" }), _jsxs("select", { id: "contact-subject", className: "w-full bg-ash border border-white/10 text-chalk font-barlow text-base px-4 py-3 outline-none transition-all duration-200 focus:border-fire/50 focus:bg-ash/90 appearance-none cursor-pointer", ...register('subject', { required: 'Please select a subject' }), children: [_jsx("option", { value: "", children: "Choose a topic..." }), _jsx("option", { value: "event", children: "Event Inquiry" }), _jsx("option", { value: "shop", children: "Shop/Merchandise" }), _jsx("option", { value: "equipment", children: "Equipment Hire" }), _jsx("option", { value: "partnership", children: "Partnership Inquiry" }), _jsx("option", { value: "other", children: "Other" })] }), errors.subject && (_jsx("p", { className: "text-xs text-danger-red mt-1.5", children: errors.subject.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/40 mb-2.5 block", htmlFor: "contact-message", children: "Message" }), _jsx("textarea", { id: "contact-message", rows: 5, className: "w-full bg-ash border border-white/10 text-chalk font-barlow text-base px-4 py-3 outline-none transition-all duration-200 focus:border-fire/50 focus:bg-ash/90 resize-none", placeholder: "Tell us what's on your mind...", ...register('message', { required: 'Message is required', minLength: { value: 10, message: 'Minimum 10 characters' } }) }), errors.message && (_jsx("p", { className: "text-xs text-danger-red mt-1.5", children: errors.message.message }))] }), _jsx(Button, { type: "submit", disabled: loading, isLoading: loading, variant: "primary", size: "lg", fullWidth: true, children: "Send Message" })] })] }), _jsx("div", { className: "space-y-8", children: _jsxs("div", { className: "bg-ash border border-white/10 p-8 h-full flex flex-col justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bebas text-3xl text-fire mb-4 letter-spacing-tighter", children: "Community First" }), _jsx("p", { className: "text-fog text-sm leading-relaxed mb-6", children: "TRFC isn't just a running club \u2014 it's a community of passionate athletes, fitness enthusiasts, and friends who share a love for the sport. Whether you're a seasoned runner or just starting your fitness journey, we're here to support you." })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-2", children: "Quick Links" }), _jsxs("ul", { className: "space-y-2 text-sm text-fog", children: [_jsx("li", { children: _jsx("a", { href: "/events", className: "hover:text-fire transition-colors", children: "Upcoming Events" }) }), _jsx("li", { children: _jsx("a", { href: "/shop", className: "hover:text-fire transition-colors", children: "TRFC Shop" }) }), _jsx("li", { children: _jsx("a", { href: "/gallery", className: "hover:text-fire transition-colors", children: "Community Gallery" }) }), _jsx("li", { children: _jsx("a", { href: "/equipment", className: "hover:text-fire transition-colors", children: "Equipment Hire" }) })] })] }), _jsxs("div", { children: [_jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-2", children: "Follow Us" }), _jsx("div", { className: "flex gap-3", children: ['Facebook', 'Instagram', 'Twitter'].map((social) => (_jsx("a", { href: "#", className: "w-10 h-10 bg-fire/10 hover:bg-fire hover:text-night transition-all duration-300 flex items-center justify-center text-sm font-bold", children: social.charAt(0) }, social))) })] })] })] }) })] })] })] }));
}
//# sourceMappingURL=Contact.js.map