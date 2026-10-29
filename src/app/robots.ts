import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://whitelabelclothing.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin-main/', '/api/', '/account/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
