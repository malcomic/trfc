import api from './index';

export interface HeroSlide {
  id: string;
  media_url: string;
  media_type?: string;
  caption?: string;
  show_on_hero?: boolean;
  hero_sort_order?: number;
  uploaded_at?: string;
}

export const getGallery = async () => {
  const response = await api.get('/gallery');
  return response.data;
};

export const getHeroSlides = async (): Promise<HeroSlide[]> => {
  const response = await api.get('/gallery/hero');
  return response.data;
};
