import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 flex items-center justify-center bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light clip-angled-sm transition-all duration-200 hover:border-fire light:hover:border-fire hover:text-fire light:hover:text-fire"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon size={18} className="text-fire" />
      ) : (
        <Sun size={18} className="text-fire" />
      )}
    </button>
  );
}
