import React, { ReactNode } from 'react';
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
declare const Modal: React.FC<ModalProps> & {
    Header: React.FC<ModalHeaderProps>;
    Body: React.FC<ModalBodyProps>;
    Footer: React.FC<ModalFooterProps>;
};
export default Modal;
//# sourceMappingURL=Modal.d.ts.map