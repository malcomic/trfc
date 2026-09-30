export interface ContactValues {
    name: string;
    phone: string;
    whatsapp: string;
}
export default function ContactForm({ eyebrow, initial, submitting, serverError, onSubmit, onBack, }: {
    eyebrow: string;
    initial: ContactValues;
    submitting: boolean;
    serverError: string;
    onSubmit: (values: ContactValues) => void;
    onBack: () => void;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ContactForm.d.ts.map