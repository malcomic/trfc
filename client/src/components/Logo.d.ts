declare const SIZES: {
    readonly sm: "h-12";
    readonly md: "h-14";
    readonly lg: "h-19";
    readonly xl: "h-31";
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