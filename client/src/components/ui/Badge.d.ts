import React, { ReactNode } from 'react';
interface BadgeProps {
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
    className?: string;
}
declare const Badge: React.FC<BadgeProps>;
export default Badge;
//# sourceMappingURL=Badge.d.ts.map