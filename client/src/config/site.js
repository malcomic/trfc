const env = import.meta.env;
export const siteContact = {
    email: env.VITE_CONTACT_EMAIL || 'info@trfc.ke',
    phone: env.VITE_CONTACT_PHONE || '+254 712 345 678',
    phoneTel: env.VITE_CONTACT_PHONE_TEL || '+254712345678',
    whatsappUrl: env.VITE_WHATSAPP_URL || 'https://wa.me/254712345678',
    location: 'Thika Road, Nairobi, Kenya',
    mapsUrl: 'https://maps.google.com/?q=Thika+Road+Nairobi',
};
export const siteSocial = [
    { label: 'Instagram', href: env.VITE_INSTAGRAM_URL || 'https://instagram.com' },
    { label: 'Facebook', href: env.VITE_FACEBOOK_URL || 'https://facebook.com' },
    { label: 'YouTube', href: env.VITE_YOUTUBE_URL || 'https://youtube.com' },
].filter((s) => s.href);
//# sourceMappingURL=site.js.map