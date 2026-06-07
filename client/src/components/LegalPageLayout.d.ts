export interface LegalSection {
    id: string;
    title: string;
    paragraphs: string[];
}
export interface LegalPageMeta {
    documentTitle: string;
    eyebrow: string;
    title: string;
    titleAccent?: string;
    intro: string;
    watermark: string;
    lastUpdated: string;
}
interface LegalPageLayoutProps {
    meta: LegalPageMeta;
    sections: LegalSection[];
    crossLink?: {
        label: string;
        to: string;
    };
}
export default function LegalPageLayout({ meta, sections, crossLink }: LegalPageLayoutProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=LegalPageLayout.d.ts.map