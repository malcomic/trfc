import api from './index';
import type { ProgramId } from '../content/programs';

export type ProgramPhotos = Partial<Record<ProgramId, string>>;

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

export const getProgramPhotos = async (): Promise<ProgramPhotos> => {
  const response = await api.get('/gallery/program-photos');
  const data = response.data;
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
};
