import React, { InputHTMLAttributes } from 'react';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helperText, size = 'md', className = '', ...props }, ref) => {
    const sizeStyles = {
      sm: 'px-3 py-2 text-xs',
      md: 'px-4 py-3 text-sm',
      lg: 'px-4 py-4 text-base',
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs md:text-sm font-barlow-condensed font-700 text-chalk mb-2">
            {label}
            {props.required && <span className="text-danger-red ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-smoke border border-mist rounded-lg text-chalk placeholder-fog
            focus:outline-none focus:border-fire focus:ring-2 focus:ring-fire/30
            transition-all duration-300
            ${error ? 'border-danger-red focus:ring-danger-red/30 focus:border-danger-red' : ''}
            disabled:bg-ash disabled:opacity-60 disabled:cursor-not-allowed
            ${sizeStyles[size]}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-danger-red text-xs mt-1">{error}</p>}
        {helperText && !error && <p className="text-fog text-xs mt-1">{helperText}</p>}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;
