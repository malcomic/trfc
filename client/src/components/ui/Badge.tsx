import React, { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ variant = 'primary', size = 'md', children, className = '' }) => {
  const baseStyles = 'inline-flex items-center justify-center font-barlow-condensed font-700 rounded-full transition-all duration-300';

  const variantStyles = {
    primary: 'bg-accent text-night light:bg-accent-light light:text-night-light',
    secondary: 'bg-smoke light:bg-smoke-light text-chalk light:text-chalk-light border border-mist light:border-mist-light',
    success: 'bg-success-green text-chalk',
    warning: 'bg-warning-amber text-chalk',
    danger: 'bg-danger-red text-chalk',
    info: 'bg-info-blue text-chalk',
  };

  const sizeStyles = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>{children}</span>;
};

export default Badge;
