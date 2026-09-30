export const HERO_COPY = {
    headline: 'Find your program. Start this week.',
    subline: "Walk in fresh, or come back after years off. We've got a group for wherever you're starting.",
    smallLine: "Most plans lose people in the first month. Ours doesn't, because you're never training alone.",
    button: 'Find My Program',
};
export const QUESTION_1 = {
    prompt: "What's pulling you toward TRFC right now?",
    options: [
        { value: 'start_moving', label: 'I just want to start moving again' },
        { value: 'lose_weight', label: 'I want to lose weight and get fit' },
        { value: 'race', label: 'I want to run a race, or go further than I have before' },
        { value: 'outside', label: 'I want to be outside, try something new' },
    ],
};
export const QUESTION_2 = {
    prompt: 'How much have you exercised in the last 3 months?',
    options: [
        { value: 'not_much', label: "Not much, if I'm honest" },
        { value: 'active', label: "I've been active, just not with a group" },
    ],
};
export function matchProgram(q1, q2) {
    switch (q1) {
        case 'start_moving':
            return 'foundations';
        case 'lose_weight':
            return 'fat_loss';
        case 'race':
            return q2 === 'active' ? 'endurance' : 'foundations';
        case 'outside':
            return 'hiking';
    }
}
export const MATCH_COPY = {
    learnMore: 'Learn more about this program →',
    almostThere: 'Almost there. Just tell us where to reach you.',
};
export const PRICES = { plusReturning: 197, plusNew: 497, elite: 2000 };
export const ACCESS_COPY = {
    title: 'How do you want to train?',
    plusPrice: 'Kshs 197 for returning members. Kshs 497 for new members. Pay once, keep it for good.',
    elite: {
        name: 'Elite',
        description: 'Everything in TRFC+, plus a coach in your corner.',
        price: 'Kshs 2,000 a month.',
        button: 'Go Elite',
    },
    foundations: {
        free: {
            name: 'Free',
            description: 'Foundations, free forever.',
            price: 'Start now. No payment needed.',
            button: 'Continue Free',
        },
        plus: {
            name: 'TRFC+',
            description: 'Every other program, unlocked too.',
            button: 'Unlock TRFC+',
        },
    },
    locked: {
        badge: '🔒 LOCKED',
        free: {
            name: 'Free',
            description: (track) => `Free includes Foundations only. ${track} needs TRFC+ or Elite.`,
            button: 'Switch To Foundations (Free)',
        },
        plus: {
            name: (track) => `TRFC+ — unlocks ${track}`,
            description: 'Get the program you just matched to, plus every other track.',
            button: 'Unlock TRFC+',
        },
    },
};
export const CONTACT_COPY = {
    name: { label: 'Name', placeholder: 'Your name' },
    phone: { label: 'Phone Number', placeholder: '07XX XXX XXX' },
    whatsapp: { label: 'WhatsApp Number', placeholder: 'Same as above? Tap here' },
    button: 'Continue',
};
export const CHECKOUT_COPY = {
    title: 'Pay with M-Pesa',
    body: (phone) => `We'll send a payment prompt to ${phone}. Enter your M-Pesa PIN on your phone to finish.`,
    amount: (amount) => `Amount: Kshs ${amount.toLocaleString()}`,
    button: 'Send Payment Prompt',
    returningNote: 'Welcome back — returning member price applied.',
};
export const WAITING_COPY = {
    title: 'Check your phone.',
    body: 'Enter your M-Pesa PIN when the prompt shows up. This page updates on its own, no need to refresh.',
};
export const FAILED_COPY = {
    title: "Payment didn't go through.",
    body: 'The prompt may have been cancelled or timed out. You can try again, or use a different number.',
    retry: 'Try Again',
    changeNumber: 'Change Number',
};
export const CONFIRMATION_COPY = {
    freeTitle: "You're in.",
    paidTitle: "You're in. Payment received.",
    body: "A captain from your program will message you within 24 hours. Keep your phone close, they'll reach out on WhatsApp.",
    signoff: 'See you soon.',
};
export const TIER_LABELS = {
    free: 'Free',
    plus: 'TRFC+',
    elite: 'Elite',
};
/** Client-side mirror of the server's msisdn normalisation, for validation and display. */
export function toKenyanMsisdn(phone) {
    const digits = phone.replace(/\D/g, '');
    if (/^254[17]\d{8}$/.test(digits))
        return digits;
    if (/^0[17]\d{8}$/.test(digits))
        return `254${digits.slice(1)}`;
    if (/^[17]\d{8}$/.test(digits))
        return `254${digits}`;
    return null;
}
export function formatLocalPhone(msisdn) {
    const local = msisdn.startsWith('254') ? `0${msisdn.slice(3)}` : msisdn;
    return local.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
}
//# sourceMappingURL=onboarding.js.map