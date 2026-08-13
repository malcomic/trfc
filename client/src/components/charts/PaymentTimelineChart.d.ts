interface PaymentTimelineChartProps {
    data: Array<{
        date: string;
        successful: number;
        pending: number;
        failed: number;
    }>;
}
export default function PaymentTimelineChart({ data }: PaymentTimelineChartProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=PaymentTimelineChart.d.ts.map