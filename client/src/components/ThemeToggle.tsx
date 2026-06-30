import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
<<<<<<< HEAD
      className="p-2 rounded-lg transition-all duration-300 bg-ash-light hover:bg-ash-light/80 dark:bg-smoke dark:hover:bg-mist"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-chalk-light dark:text-fog" />
      ) : (
        <Sun className="w-5 h-5 text-fire" />
=======
      className="w-10 h-10 flex items-center justify-center bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light clip-angled-sm transition-all duration-200 hover:border-accent light:hover:border-accent-light hover:text-accent light:hover:text-accent-light"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon size={18} className="text-accent light:text-accent-light" />
      ) : (
        <Sun size={18} className="text-accent light:text-accent-light" />
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
      )}
    </button>
  );
}
