export type ProgramId = 'foundations' | 'fat_loss' | 'endurance' | 'hiking';
export interface ProgramSummary {
    length: string;
    level: string;
    trainingDays: string;
    mainGoal: string;
    equipment: string;
}
export interface ProgramDetailSection {
    title: string;
    body?: string;
    items?: string[];
}
export interface Program {
    id: ProgramId;
    name: string;
    headline: string;
    tagline: string;
    summary: ProgramSummary;
    detail: ProgramDetailSection[];
    requiresPaid: boolean;
}
export declare const SUMMARY_LABELS: {
    key: keyof ProgramSummary;
    label: string;
}[];
export declare const PROGRAMS: Record<ProgramId, Program>;
export declare const PROGRAM_ORDER: ProgramId[];
export declare function isProgramId(value: unknown): value is ProgramId;
//# sourceMappingURL=programs.d.ts.map