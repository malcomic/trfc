interface MetricCardProps {
    title: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    trendPercent?: number;
    icon?: React.ReactNode;
    unit?: string;
    subtitle?: string;
    onClick?: () => void;
    loading?: boolean;
}
export default function MetricCard({ title, value, trend, trendPercent, icon, unit, subtitle, onClick, loading, }: MetricCardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=MetricCard.d.ts.map