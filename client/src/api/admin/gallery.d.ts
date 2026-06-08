export declare const getGallery: () => Promise<any>;
export declare const uploadGalleryFile: (formData: FormData) => Promise<any>;
export declare const uploadMedia: (data: {
    media_url: string;
    media_type?: string;
    caption?: string;
    show_on_hero?: boolean;
    hero_sort_order?: number;
}) => Promise<any>;
export declare const updateMedia: (id: string, data: {
    caption?: string;
    media_type?: string;
    show_on_hero?: boolean;
    hero_sort_order?: number;
}) => Promise<any>;
export declare const reorderHeroSlides: (items: {
    id: string;
    hero_sort_order: number;
}[]) => Promise<any>;
export declare const deleteMedia: (id: string) => Promise<any>;
//# sourceMappingURL=gallery.d.ts.map