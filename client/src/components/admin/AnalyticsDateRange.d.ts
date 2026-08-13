export type DateRangeValue = {
    mode: 'preset';
    days: '7' | '30' | '90';
} | {
    mode: 'custom';
    startDate: string;
    endDate: string;
};
interface AnalyticsDateRangeProps {
    value: DateRangeValue;
    onChange: (value: DateRangeValue) => void;
}
export declare function toAnalyticsParams(value: DateRangeValue): {
    days?: string;
    startDate?: string;
    endDate?: string;
};
export declare function describeDateRange(value: DateRangeValue): string;
export default function AnalyticsDateRange({ value, onChange }: AnalyticsDateRangeProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AnalyticsDateRange.d.ts.map