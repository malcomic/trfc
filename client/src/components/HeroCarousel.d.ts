export interface HeroSlideItem {
    id: string;
    media_url: string;
    media_type?: string;
    caption?: string;
}
interface HeroCarouselProps {
    slides: HeroSlideItem[];
}
export default function HeroCarousel({ slides }: HeroCarouselProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=HeroCarousel.d.ts.map