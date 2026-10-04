import type { ButtonHTMLAttributes, ReactNode } from 'react';
/** Theme-aware class tokens: dark theme by default, `light:` overrides for the light theme. */
export declare const tone: {
    text: string;
    textStrong: string;
    textMuted: string;
    textSubtle: string;
    border: string;
    borderStrong: string;
    surface: string;
    accentText: string;
    accentBorder: string;
    accentSoftBg: string;
    accentSolid: string;
    hoverAccentBorder: string;
    hoverAccentText: string;
    hoverAccentSoftBg: string;
};
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