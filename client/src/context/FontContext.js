import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_TYPOGRAPHY } from '../config/fontCatalog';
import { getTypography } from '../api/settings';
import { applyTypography } from '../utils/googleFonts';
const TYPOGRAPHY_CACHE_KEY = 'trfc-typography';
const FontContext = createContext(undefined);
function isTypographySettings(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const record = value;
    return (typeof record.display_font === 'string' &&
        typeof record.body_font === 'string' &&
        typeof record.condensed_font === 'string' &&
        typeof record.sans_font === 'string');
}
export function FontProvider({ children }) {
    const [typography, setTypography] = useState({ ...DEFAULT_TYPOGRAPHY });
    const applyTypographySettings = useCallback((settings) => {
        setTypography(settings);
        applyTypography(settings);
        localStorage.setItem(TYPOGRAPHY_CACHE_KEY, JSON.stringify(settings));
    }, []);
    const refreshTypography = useCallback(async () => {
        try {
            const data = await getTypography();
            if (isTypographySettings(data)) {
                applyTypographySettings(data);
            }
        }
        catch (error) {
            console.error('Failed to load typography settings:', error);
        }
    }, [applyTypographySettings]);
    useEffect(() => {
        const cached = localStorage.getItem(TYPOGRAPHY_CACHE_KEY);
        let hasCachedSettings = false;
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (isTypographySettings(parsed)) {
                    applyTypography(parsed);
                    setTypography(parsed);
                    hasCachedSettings = true;
                }
            }
            catch {
                localStorage.removeItem(TYPOGRAPHY_CACHE_KEY);
            }
        }
        if (!hasCachedSettings) {
            applyTypography({ ...DEFAULT_TYPOGRAPHY });
        }
        refreshTypography();
    }, [refreshTypography]);
    return (_jsx(FontContext.Provider, { value: { typography, refreshTypography, applyTypographySettings }, children: children }));
}
export function useFonts() {
    const context = useContext(FontContext);
    if (!context) {
        throw new Error('useFonts must be used within FontProvider');
    }
    return context;
}
//# sourceMappingURL=FontContext.js.map