export const FONT_CATALOG = {
    display: ['Bebas Neue', 'Oswald', 'Anton', 'Archivo Black', 'Teko'],
    body: ['Barlow', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans 3'],
    condensed: ['Barlow Condensed', 'Roboto Condensed', 'Oswald', 'Archivo Narrow'],
    sans: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Nunito Sans'],
};
export const DEFAULT_TYPOGRAPHY = {
    display_font: 'Bebas Neue',
    body_font: 'Barlow',
    condensed_font: 'Barlow Condensed',
    sans_font: 'Inter',
};
export const TYPOGRAPHY_LABELS = {
    display_font: 'Display / Headings',
    body_font: 'Body Text',
    condensed_font: 'Labels / Condensed',
    sans_font: 'Sans Fallback',
};
export const TYPOGRAPHY_FIELDS = [
    'display_font',
    'body_font',
    'condensed_font',
    'sans_font',
];
export function getCatalogForField(field) {
    switch (field) {
        case 'display_font':
            return FONT_CATALOG.display;
        case 'body_font':
            return FONT_CATALOG.body;
        case 'condensed_font':
            return FONT_CATALOG.condensed;
        case 'sans_font':
            return FONT_CATALOG.sans;
    }
}
//# sourceMappingURL=fontCatalog.js.map