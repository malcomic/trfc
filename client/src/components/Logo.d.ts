declare const SIZES: {
    readonly sm: "h-9";
    readonly md: "h-11";
    readonly lg: "h-16";
    readonly xl: "h-28";
};
type LogoSize = keyof typeof SIZES;
interface LogoProps {
    size?: LogoSize;
    showTagline?: boolean;
    className?: string;
    linkToHome?: boolean;
    onClick?: () => void;
}
export declare function Logo({ size, showTagline, className, linkToHome, onClick, }: LogoProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Logo.d.ts.map