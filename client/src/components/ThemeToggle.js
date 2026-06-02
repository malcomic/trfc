import { jsx as _jsx } from "react/jsx-runtime";
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    return (_jsx("button", { onClick: toggleTheme, className: "w-10 h-10 flex items-center justify-center bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light clip-angled-sm transition-all duration-200 hover:border-fire light:hover:border-fire hover:text-fire light:hover:text-fire", "aria-label": "Toggle theme", children: theme === 'light' ? (_jsx(Moon, { size: 18, className: "text-fire" })) : (_jsx(Sun, { size: 18, className: "text-fire" })) }));
}
//# sourceMappingURL=ThemeToggle.js.map