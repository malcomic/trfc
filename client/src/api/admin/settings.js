import api from '../index';
export async function getTypographyForAdmin() {
    const response = await api.get('/admin/settings/typography');
    return response.data;
}
export async function updateTypography(settings) {
    const response = await api.put('/admin/settings/typography', settings);
    return response.data;
}
export async function resetTypography() {
    const response = await api.post('/admin/settings/typography/reset');
    return response.data;
}
//# sourceMappingURL=settings.js.map