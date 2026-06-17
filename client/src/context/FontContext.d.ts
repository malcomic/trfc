import { type TypographySettings } from '../config/fontCatalog';
interface FontContextType {
    typography: TypographySettings;
    refreshTypography: () => Promise<void>;
    applyTypographySettings: (settings: TypographySettings) => void;
}
export declare function FontProvider({ children }: {
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useFonts(): FontContextType;
export {};
//# sourceMappingURL=FontContext.d.ts.map