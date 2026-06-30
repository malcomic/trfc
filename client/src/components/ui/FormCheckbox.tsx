import React, { InputHTMLAttributes } from 'react';

interface FormCheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const FormCheckbox = React.forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          type="checkbox"
          className={`
            w-5 h-5 mt-1 bg-smoke border border-mist rounded cursor-pointer
            text-fire focus:outline-none focus:ring-2 focus:ring-fire/30
            transition-all duration-300
            ${error ? 'border-danger-red' : ''}
            ${className}
          `}
          {...props}
        />
        {label && (
          <label className="text-sm md:text-base text-chalk cursor-pointer pt-1">
            {label}
            {props.required && <span className="text-danger-red ml-1">*</span>}
          </label>
        )}
        {error && <p className="text-danger-red text-xs">{error}</p>}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';

export default FormCheckbox;
