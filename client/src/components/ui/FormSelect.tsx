import React, { SelectHTMLAttributes } from 'react';

interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ value: string; label: string }>;
  size?: 'sm' | 'md' | 'lg';
}

const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, helperText, options = [], size = 'md', className = '', children, ...props }, ref) => {
    const sizeStyles = {
      sm: 'px-3 py-2 text-xs',
      md: 'px-4 py-3 text-sm',
      lg: 'px-4 py-4 text-base',
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs md:text-sm font-barlow-condensed font-700 text-chalk light:text-chalk-light mb-2">
            {label}
            {props.required && <span className="text-danger-red ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full bg-smoke light:bg-smoke-light border border-mist light:border-mist-light rounded-lg text-chalk light:text-chalk-light
            focus:outline-none focus:border-accent light:focus:border-accent-light focus:ring-2 focus:ring-accent/30 light:focus:ring-accent-light/30
            transition-all duration-300
            ${error ? 'border-danger-red focus:ring-danger-red/30 focus:border-danger-red' : ''}
            disabled:bg-ash light:disabled:bg-ash-light disabled:opacity-60 disabled:cursor-not-allowed
            appearance-none cursor-pointer
            ${sizeStyles[size]}
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        {error && <p className="text-danger-red text-xs mt-1">{error}</p>}
        {helperText && !error && <p className="text-fog light:text-fog-light text-xs mt-1">{helperText}</p>}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';

export default FormSelect;
