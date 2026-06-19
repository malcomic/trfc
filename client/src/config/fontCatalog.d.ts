export declare const FONT_CATALOG: {
    readonly display: readonly ["Bebas Neue", "Oswald", "Anton", "Archivo Black", "Teko", "Alfa Slab One", "Bungee", "Cinzel", "Fjalla One", "Kanit", "League Spartan", "Montserrat", "Orbitron", "Passion One", "Playfair Display", "Poppins", "Rajdhani", "Righteous", "Russo One", "Saira Extra Condensed", "Staatliches", "Syne", "Titillium Web", "Ultra", "Work Sans"];
    readonly body: readonly ["Barlow", "Bebas Neue", "Inter", "Roboto", "Open Sans", "Lato", "Source Sans 3", "DM Sans", "Manrope", "Merriweather", "Montserrat", "Nunito", "Poppins", "PT Sans", "Raleway", "Rubik", "Ubuntu", "Work Sans", "IBM Plex Sans", "Karla", "Mulish", "Outfit", "Plus Jakarta Sans", "Quicksand", "Red Hat Display", "Space Grotesk", "Figtree", "Lexend", "Epilogue", "Cabin", "Hind"];
    readonly condensed: readonly ["Barlow Condensed", "Roboto Condensed", "Oswald", "Archivo Narrow", "Bebas Neue", "Saira Condensed", "Saira Extra Condensed", "Yanone Kaffeesatz", "Pathway Gothic One", "Chivo", "Fjalla One", "Anton", "Teko", "Big Shoulders Display", "League Spartan", "Rajdhani", "Titillium Web", "Abel", "Asap Condensed", "Encode Sans Condensed", "Exo 2", "Kanit", "Passion One", "Russo One", "Staatliches"];
    readonly sans: readonly ["Inter", "Bebas Neue", "Roboto", "Open Sans", "Lato", "Nunito Sans", "Source Sans 3", "DM Sans", "Manrope", "Montserrat", "Nunito", "Poppins", "PT Sans", "Raleway", "Rubik", "Ubuntu", "Work Sans", "IBM Plex Sans", "Karla", "Mulish", "Outfit", "Plus Jakarta Sans", "Figtree", "Lexend", "Barlow", "Cabin", "Hind", "Quicksand", "Red Hat Display", "Space Grotesk", "Epilogue"];
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
export declare function getAllCatalogFonts(): string[];
//# sourceMappingURL=fontCatalog.d.ts.map