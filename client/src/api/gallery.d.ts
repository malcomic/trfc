export interface HeroSlide {
    id: string;
    media_url: string;
    media_type?: string;
    caption?: string;
    show_on_hero?: boolean;
    hero_sort_order?: number;
    uploaded_at?: string;
}
export declare const getGallery: () => Promise<any>;
export declare const getHeroSlides: () => Promise<HeroSlide[]>;
//# sourceMappingURL=gallery.d.ts.map