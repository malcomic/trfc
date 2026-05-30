interface AdminConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
    onConfirm: () => void;
    onCancel: () => void;
}
export default function AdminConfirmDialog({ open, title, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel, }: AdminConfirmDialogProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=AdminConfirmDialog.d.ts.map