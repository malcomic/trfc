import React, { InputHTMLAttributes } from 'react';
interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string;
    error?: string;
    helperText?: string;
    size?: 'sm' | 'md' | 'lg';
}
declare const FormInput: React.ForwardRefExoticComponent<FormInputProps & React.RefAttributes<HTMLInputElement>>;
export default FormInput;
//# sourceMappingURL=FormInput.d.ts.map