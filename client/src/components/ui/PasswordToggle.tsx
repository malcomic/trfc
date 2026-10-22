import { Eye, EyeOff } from 'lucide-react';

interface PasswordToggleProps {
  visible: boolean;
  onToggle: () => void;
  className?: string;
}

const DEFAULT_COLORS = 'text-fog light:text-fog-light hover:text-accent light:hover:text-accent-light';

/** `className` replaces the default colour classes so pages with a different palette can restyle it. */
export default function PasswordToggle({ visible, onToggle, className = DEFAULT_COLORS }: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-transparent border-0 cursor-pointer transition-colors duration-200 ${className}`}
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}
