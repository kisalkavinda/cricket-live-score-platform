import { MetadataRoute } from 'next';
import { getAdminEntryPath } from '@/lib/auth/admin-auth';

export default function robots(): MetadataRoute.Robots {
  let adminDisallow = '/management*';
  try {
    const entryPath = getAdminEntryPath();
    adminDisallow = `/${entryPath}*`;
  } catch {
    // If env is not loaded yet at build time, fall back
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin*', adminDisallow, '/api/*'],
    },
  };
}
