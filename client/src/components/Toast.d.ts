export interface ToastMessage {
    id: number;
    type: 'success' | 'error' | 'info';
    title: string;
    message?: string;
}
interface ToastStackProps {
    toasts: ToastMessage[];
    onDismiss: (id: number) => void;
}
export declare function ToastStack({ toasts, onDismiss }: ToastStackProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=Toast.d.ts.map