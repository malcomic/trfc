interface QuizStepProps<T extends string> {
    eyebrow: string;
    prompt: string;
    options: {
        value: T;
        label: string;
    }[];
    selected?: T;
    onSelect: (value: T) => void;
    onBack: () => void;
}
export default function QuizStep<T extends string>({ eyebrow, prompt, options, selected, onSelect, onBack, }: QuizStepProps<T>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=QuizStep.d.ts.map