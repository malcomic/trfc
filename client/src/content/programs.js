export const SUMMARY_LABELS = [
    { key: 'length', label: 'Length' },
    { key: 'level', label: 'Level' },
    { key: 'trainingDays', label: 'Training Days' },
    { key: 'mainGoal', label: 'Main Goal' },
    { key: 'equipment', label: 'Equipment' },
];
export const PROGRAMS = {
    foundations: {
        id: 'foundations',
        name: 'Foundations',
        headline: "You're a Foundations member.",
        tagline: 'We start where you are. No pressure, no judging. Just showing up, one Saturday at a time.',
        summary: {
            length: '8 weeks',
            level: 'Beginner, no running needed to start',
            trainingDays: '5 days a week, 2 rest days',
            mainGoal: 'Finish your first 5K',
            equipment: 'None needed, just shoes',
        },
        // TODO: replace with the full Couch to 5K structure from the Foundations program document
        detail: [
            {
                title: 'Weekly Rhythm',
                body: '[Weekly rhythm from the Foundations / Couch to 5K document]',
            },
            {
                title: 'Sample Week',
                body: '[Sample week from the Foundations / Couch to 5K document]',
            },
            {
                title: 'Support System',
                body: '[Support system from the Foundations / Couch to 5K document]',
            },
        ],
        requiresPaid: false,
    },
    fat_loss: {
        id: 'fat_loss',
        name: 'Fat Loss & Fitness',
        headline: "You're a Fat Loss & Fitness member.",
        tagline: "Real workouts, built for real results. You'll feel the difference in a few weeks, not a few months.",
        summary: {
            length: '[X weeks]',
            level: '[Beginner to intermediate]',
            trainingDays: '[X days a week]',
            mainGoal: '[specific fitness/fat-loss outcome]',
            equipment: "[what's needed, if any]",
        },
        detail: [
            { title: 'Weekly Rhythm', body: '[To be added once the program is built out]' },
            { title: 'Sample Week', body: '[To be added once the program is built out]' },
            { title: 'Support System', body: '[To be added once the program is built out]' },
        ],
        requiresPaid: true,
    },
    endurance: {
        id: 'endurance',
        name: 'Endurance & Race Prep',
        headline: "You're an Endurance & Race Prep member.",
        tagline: "Whatever race you're chasing, we'll get you there one training block at a time.",
        summary: {
            length: '[X weeks]',
            level: '[Intermediate]',
            trainingDays: '[X days a week]',
            mainGoal: '[race distance / finish goal]',
            equipment: "[what's needed, if any]",
        },
        detail: [
            { title: 'Weekly Rhythm', body: '[To be added once the program is built out]' },
            { title: 'Sample Week', body: '[To be added once the program is built out]' },
            { title: 'Support System', body: '[To be added once the program is built out]' },
        ],
        requiresPaid: true,
    },
    hiking: {
        id: 'hiking',
        name: 'Hiking',
        headline: "You're a Hiking member.",
        tagline: "Fresh air, good people, real trails. Fitness that doesn't feel like a workout.",
        summary: {
            length: '[Ongoing / monthly]',
            level: '[All levels]',
            trainingDays: '[Frequency of hikes]',
            mainGoal: '[what a member gets out of it]',
            equipment: '[hiking shoes, day pack, etc.]',
        },
        detail: [
            { title: 'Weekly Rhythm', body: '[To be added once the program is built out]' },
            { title: 'Sample Week', body: '[To be added once the program is built out]' },
            { title: 'Support System', body: '[To be added once the program is built out]' },
        ],
        requiresPaid: true,
    },
};
export const PROGRAM_ORDER = ['foundations', 'fat_loss', 'endurance', 'hiking'];
export function isProgramId(value) {
    return typeof value === 'string' && value in PROGRAMS;
}
//# sourceMappingURL=programs.js.map