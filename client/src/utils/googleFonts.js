const GOOGLE_FONTS_LINK_ID = 'trfc-google-fonts';
export function buildGoogleFontsUrl(fonts) {
    const unique = [...new Set(fonts.map((font) => font.trim()).filter(Boolean))];
    if (unique.length === 0) {
        return '';
    }
    const params = unique
        .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;600;700`)
        .join('&');
    return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
export function loadGoogleFonts(fonts) {
    const url = buildGoogleFontsUrl(fonts);
    if (!url) {
        return;
    }
    let link = document.getElementById(GOOGLE_FONTS_LINK_ID);
    if (!link) {
        link = document.createElement('link');
        link.id = GOOGLE_FONTS_LINK_ID;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
    if (link.href !== url) {
        link.href = url;
    }
}
export function loadGoogleFontsBatched(fonts, batchSize = 15) {
    const unique = [...new Set(fonts.map((font) => font.trim()).filter(Boolean))];
    const batchCount = Math.ceil(unique.length / batchSize);
    for (let index = 0; index < batchCount; index += 1) {
        const batch = unique.slice(index * batchSize, index * batchSize + batchSize);
        const url = buildGoogleFontsUrl(batch);
        if (!url) {
            continue;
        }
        const linkId = `${GOOGLE_FONTS_LINK_ID}-batch-${index}`;
        let link = document.getElementById(linkId);
        if (!link) {
            link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        if (link.href !== url) {
            link.href = url;
        }
    }
}
export function applyTypographyVariables(settings) {
    const root = document.documentElement;
    root.style.setProperty('--font-sans', `'${settings.sans_font}', system-ui, sans-serif`);
    root.style.setProperty('--font-display', `'${settings.display_font}', sans-serif`);
    root.style.setProperty('--font-body', `'${settings.body_font}', sans-serif`);
    root.style.setProperty('--font-condensed', `'${settings.condensed_font}', sans-serif`);
}
export function applyTypography(settings) {
    applyTypographyVariables(settings);
    loadGoogleFonts([
        settings.display_font,
        settings.body_font,
        settings.condensed_font,
        settings.sans_font,
    ]);
}
//# sourceMappingURL=googleFonts.js.map