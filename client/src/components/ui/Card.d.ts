import React, { ReactNode } from 'react';
interface CardProps {
    children: ReactNode;
    variant?: 'default' | 'elevated' | 'interactive';
    className?: string;
}
interface CardHeaderProps {
    children: ReactNode;
    className?: string;
}
interface CardBodyProps {
    children: ReactNode;
    className?: string;
}
interface CardFooterProps {
    children: ReactNode;
    className?: string;
}
declare const Card: React.FC<CardProps> & {
    Header: React.FC<CardHeaderProps>;
    Body: React.FC<CardBodyProps>;
    Footer: React.FC<CardFooterProps>;
};
export default Card;
//# sourceMappingURL=Card.d.ts.map