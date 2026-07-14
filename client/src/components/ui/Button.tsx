import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles =
      'font-barlow-condensed font-700 transition-all duration-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-night focus:ring-fire disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';

    // Size styles
    const sizeStyles = {
      sm: 'h-9 px-4 text-xs md:text-sm',
      md: 'h-11 px-6 text-sm md:text-base',
      lg: 'h-13 px-8 text-base md:text-lg',
    };

    // Variant styles
    const variantStyles = {
      primary:
        'bg-fire text-chalk hover:bg-ember hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-lg',
      secondary:
        'bg-smoke border border-mist text-chalk hover:bg-mist hover:scale-[1.02] active:scale-[0.98] transition-colors',
      outline:
        'border-2 border-fire text-fire hover:bg-fire/10 hover:scale-[1.02] active:scale-[0.98] transition-colors',
      ghost:
        'text-chalk hover:text-fire transition-colors hover:scale-[1.02] active:scale-[0.98]',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
