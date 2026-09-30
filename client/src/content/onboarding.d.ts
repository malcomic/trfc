import type { ProgramId } from './programs';
export type Q1Answer = 'start_moving' | 'lose_weight' | 'race' | 'outside';
export type Q2Answer = 'not_much' | 'active';
export type Tier = 'free' | 'plus' | 'elite';
export declare const HERO_COPY: {
    headline: string;
    subline: string;
    smallLine: string;
    button: string;
};
export declare const QUESTION_1: {
    prompt: string;
    options: {
        value: Q1Answer;
        label: string;
    }[];
};
export declare const QUESTION_2: {
    prompt: string;
    options: {
        value: Q2Answer;
        label: string;
    }[];
};
export declare function matchProgram(q1: Q1Answer, q2: Q2Answer): ProgramId;
export declare const MATCH_COPY: {
    learnMore: string;
    almostThere: string;
};
export declare const PRICES: {
    plusReturning: number;
    plusNew: number;
    elite: number;
};
export declare const ACCESS_COPY: {
    title: string;
    plusPrice: string;
    elite: {
        name: string;
        description: string;
        price: string;
        button: string;
    };
    foundations: {
        free: {
            name: string;
            description: string;
            price: string;
            button: string;
        };
        plus: {
            name: string;
            description: string;
            button: string;
        };
    };
    locked: {
        badge: string;
        free: {
            name: string;
            description: (track: string) => string;
            button: string;
        };
        plus: {
            name: (track: string) => string;
            description: string;
            button: string;
        };
    };
};
export declare const CONTACT_COPY: {
    name: {
        label: string;
        placeholder: string;
    };
    phone: {
        label: string;
        placeholder: string;
    };
    whatsapp: {
        label: string;
        placeholder: string;
    };
    button: string;
};
export declare const CHECKOUT_COPY: {
    title: string;
    body: (phone: string) => string;
    amount: (amount: number) => string;
    button: string;
    returningNote: string;
};
export declare const WAITING_COPY: {
    title: string;
    body: string;
};
export declare const FAILED_COPY: {
    title: string;
    body: string;
    retry: string;
    changeNumber: string;
};
export declare const CONFIRMATION_COPY: {
    freeTitle: string;
    paidTitle: string;
    body: string;
    signoff: string;
};
export declare const TIER_LABELS: Record<Tier, string>;
/** Client-side mirror of the server's msisdn normalisation, for validation and display. */
export declare function toKenyanMsisdn(phone: string): string | null;
export declare function formatLocalPhone(msisdn: string): string;
//# sourceMappingURL=onboarding.d.ts.map