const env = import.meta.env

export const siteContact = {
  email: (env.VITE_CONTACT_EMAIL as string) || 'thikaroadfitness@gmail.com',
  phone: (env.VITE_CONTACT_PHONE as string) || '+254 762 550214',
  phoneTel: (env.VITE_CONTACT_PHONE_TEL as string) || '+254762550214',
  whatsappUrl: (env.VITE_WHATSAPP_URL as string) || 'https://wa.me/254762550214',
  location: 'Thika Road, Nairobi, Kenya',
  mapsUrl: 'https://maps.google.com/?q=Thika+Road+Nairobi',
}

export interface SocialLink {
  label: string
  href: string
}

export const siteSocial: SocialLink[] = [
  { label: 'Instagram', href: (env.VITE_INSTAGRAM_URL as string) || 'https://www.instagram.com/thika_road_fitness_community_/' },
  { label: 'Facebook', href: (env.VITE_FACEBOOK_URL as string) || 'https://www.facebook.com/p/Thika-Road-Fitness-Community-61586327542745/' },
  { label: 'TikTok', href: (env.VITE_TIKTOK_URL as string) || 'https://www.tiktok.com/@thika_road_fitness_community_' },
  { label: 'Threads', href: (env.VITE_THREADS_URL as string) || 'https://www.threads.net/@thika_road_fitness_community_' },
  { label: 'YouTube', href: (env.VITE_YOUTUBE_URL as string) || 'https://www.youtube.com/@thika_road_fitness_community_' },
  { label: 'WhatsApp', href: (env.VITE_WHATSAPP_URL as string) || 'https://wa.me/254762550214' },
].filter((s) => s.href)
