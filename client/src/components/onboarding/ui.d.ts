import type { ButtonHTMLAttributes, ReactNode } from 'react';
export declare function PrimaryButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function SecondaryButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function StepShell({ eyebrow, onBack, children, }: {
    eyebrow?: string;
    onBack?: () => void;
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function StepTitle({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function ErrorNote({ message }: {
    message: string;
}): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=ui.d.ts.map