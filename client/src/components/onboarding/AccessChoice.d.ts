import type { Program } from '../../content/programs';
import { type Tier } from '../../content/onboarding';
export default function AccessChoice({ program, onChoose, onSwitchToFoundations, onBack, }: {
    program: Program;
    onChoose: (tier: Tier) => void;
    onSwitchToFoundations: () => void;
    onBack: () => void;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=AccessChoice.d.ts.map