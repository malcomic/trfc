import api from './index';
import type { CatalogProgram } from '../content/programs';

export const getProgramCatalog = async (): Promise<CatalogProgram[]> => {
  const response = await api.get('/programs/catalog');
  return Array.isArray(response.data) ? response.data : [];
};

/** Admins can pass preview to see the unpublished draft. */
export const getProgramBySlug = async (slug: string, preview = false): Promise<CatalogProgram> => {
  const response = await api.get(`/programs/by-slug/${encodeURIComponent(slug)}`, {
    params: preview ? { preview: 'draft' } : undefined,
  });
  return response.data;
};
