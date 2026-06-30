import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-all duration-300 bg-ash-light hover:bg-ash-light/80 dark:bg-smoke dark:hover:bg-mist"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-chalk-light dark:text-fog" />
      ) : (
        <Sun className="w-5 h-5 text-fire" />
      )}
    </button>
  );
}
