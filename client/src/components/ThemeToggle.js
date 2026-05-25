import { jsx as _jsx } from "react/jsx-runtime";
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    return (_jsx("button", { onClick: toggleTheme, className: "p-2 rounded-lg transition-colors duration-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700", "aria-label": "Toggle theme", children: theme === 'light' ? (_jsx(Moon, { className: "w-5 h-5 text-gray-800" })) : (_jsx(Sun, { className: "w-5 h-5 text-yellow-400" })) }));
}
//# sourceMappingURL=ThemeToggle.js.map