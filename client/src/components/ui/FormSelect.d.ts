import React, { SelectHTMLAttributes } from 'react';
interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    label?: string;
    error?: string;
    helperText?: string;
    options?: Array<{
        value: string;
        label: string;
    }>;
    size?: 'sm' | 'md' | 'lg';
}
declare const FormSelect: React.ForwardRefExoticComponent<FormSelectProps & React.RefAttributes<HTMLSelectElement>>;
export default FormSelect;
//# sourceMappingURL=FormSelect.d.ts.map