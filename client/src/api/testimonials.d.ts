export interface Testimonial {
    id: string;
    member_name: string;
    message: string;
    rating: number;
    created_at: string;
}
export declare const getTestimonials: () => Promise<Testimonial[]>;
export declare const submitTestimonial: (data: {
    member_name: string;
    message: string;
    rating: number;
}) => Promise<any>;
//# sourceMappingURL=testimonials.d.ts.map