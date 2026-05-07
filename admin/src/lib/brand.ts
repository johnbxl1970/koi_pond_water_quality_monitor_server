// Brand constants — single source of truth for the slogan and logo references
// so we never accidentally diverge across screens. Mobile + admin share the
// same slogan; mobile imports its copy of the logo asset out of this repo's
// ml/admin public folder via its own asset pipeline.

export const BRAND = {
  name: 'Koi',
  slogan: 'Koi . Care . Peace.',
  logo: '/logo.jpg',
  icon: '/icon.png',
} as const;
