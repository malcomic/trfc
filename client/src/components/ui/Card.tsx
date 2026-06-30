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

const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
} = ({ variant = 'default', children, className = '' }) => {
  const baseStyles = 'bg-ash border border-mist rounded-lg transition-all duration-300';

  const variantStyles = {
    default: '',
    elevated: 'shadow-lg',
    interactive: 'hover:shadow-lg hover:scale-[1.01] cursor-pointer',
  };

  return <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>{children}</div>;
};

const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-mist ${className}`}>
    <h3 className="text-lg md:text-xl font-barlow-condensed font-700 text-chalk">{children}</h3>
  </div>
);

const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);

const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-t border-mist flex gap-3 ${className}`}>{children}</div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
