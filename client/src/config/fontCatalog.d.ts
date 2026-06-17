export declare const FONT_CATALOG: {
    readonly display: readonly ["Bebas Neue", "Oswald", "Anton", "Archivo Black", "Teko"];
    readonly body: readonly ["Barlow", "Inter", "Roboto", "Open Sans", "Lato", "Source Sans 3"];
    readonly condensed: readonly ["Barlow Condensed", "Roboto Condensed", "Oswald", "Archivo Narrow"];
    readonly sans: readonly ["Inter", "Roboto", "Open Sans", "Lato", "Nunito Sans"];
};
export declare const DEFAULT_TYPOGRAPHY: {
    readonly display_font: "Bebas Neue";
    readonly body_font: "Barlow";
    readonly condensed_font: "Barlow Condensed";
    readonly sans_font: "Inter";
};
export type TypographySettings = {
    display_font: string;
    body_font: string;
    condensed_font: string;
    sans_font: string;
};
export declare const TYPOGRAPHY_LABELS: {
    readonly display_font: "Display / Headings";
    readonly body_font: "Body Text";
    readonly condensed_font: "Labels / Condensed";
    readonly sans_font: "Sans Fallback";
};
export type TypographyField = keyof TypographySettings;
export declare const TYPOGRAPHY_FIELDS: TypographyField[];
export declare function getCatalogForField(field: TypographyField): readonly string[];
//# sourceMappingURL=fontCatalog.d.ts.map