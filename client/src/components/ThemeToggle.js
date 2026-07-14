import { jsx as _jsx } from "react/jsx-runtime";
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    return (_jsx("button", { onClick: toggleTheme, className: "p-2 rounded-lg transition-all duration-300 bg-ash-light hover:bg-ash-light/80 dark:bg-smoke dark:hover:bg-mist", "aria-label": "Toggle theme", children: theme === 'light' ? (_jsx(Moon, { className: "w-5 h-5 text-chalk-light dark:text-fog" })) : (_jsx(Sun, { className: "w-5 h-5 text-fire" })) }));
}
//# sourceMappingURL=ThemeToggle.js.map