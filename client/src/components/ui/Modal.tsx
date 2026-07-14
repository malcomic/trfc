import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
}

interface ModalBodyProps {
  children: ReactNode;
}

interface ModalFooterProps {
  children: ReactNode;
}

const Modal: React.FC<ModalProps> & {
  Header: React.FC<ModalHeaderProps>;
  Body: React.FC<ModalBodyProps>;
  Footer: React.FC<ModalFooterProps>;
} = ({ isOpen, onClose, children, title, size = 'md' }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 transition-opacity duration-300" onClick={onClose} />

      {/* Modal */}
      <div
        className={`
          relative bg-ash border border-mist rounded-xl p-8 
          shadow-2xl animate-scaleIn
          ${sizeStyles[size]} w-full mx-4 md:mx-0
        `}
      >
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-barlow-condensed font-700 text-chalk">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-smoke rounded-lg transition-colors duration-300 text-fog hover:text-chalk"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

const ModalHeader: React.FC<ModalHeaderProps> = ({ children, onClose }) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-2xl md:text-3xl font-barlow-condensed font-700 text-chalk">{children}</h2>
    {onClose && (
      <button
        onClick={onClose}
        className="p-1 hover:bg-smoke rounded-lg transition-colors duration-300 text-fog hover:text-chalk"
        aria-label="Close modal"
      >
        <X size={24} />
      </button>
    )}
  </div>
);

const ModalBody: React.FC<ModalBodyProps> = ({ children }) => <div className="mb-6 text-fog">{children}</div>;

const ModalFooter: React.FC<ModalFooterProps> = ({ children }) => (
  <div className="flex gap-3 justify-end border-t border-mist pt-6">{children}</div>
);

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export default Modal;
