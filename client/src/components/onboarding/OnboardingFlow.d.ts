import { type ProgramId } from '../../content/programs';
export interface StartRequest {
    program?: ProgramId;
    nonce: number;
}
export default function OnboardingFlow({ startRequest }: {
    startRequest?: StartRequest | null;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=OnboardingFlow.d.ts.map