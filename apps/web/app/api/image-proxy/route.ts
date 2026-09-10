import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = new Set([
  'lh3.googleusercontent.com',
  'drive.google.com',
  'googleusercontent.com',
  'images.unsplash.com',
  'res.cloudinary.com',
]);

function isAllowedHost(hostname: string): boolean {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  if (
    hostname.endsWith('.googleusercontent.com') ||
    hostname.endsWith('.google.com') ||
    hostname.endsWith('.supabase.co')
  ) {
    return true;
  }
  return false;
}

function isPrivateIpOrLocalhost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
    return true;
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)/.test(hostname)) {
    return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const rawUrl = searchParams.get('url');

  let targetUrl = '';
  if (id) {
    // Sanitize Google Drive file ID (alphanumeric, hyphen, underscore)
    if (!/^[a-zA-Z0-9_-]{5,128}$/.test(id)) {
      return new NextResponse('Invalid image ID format', { status: 400 });
    }
    targetUrl = `https://lh3.googleusercontent.com/d/${id}`;
  } else if (rawUrl) {
    try {
      const parsedUrl = new URL(decodeURIComponent(rawUrl));
      if (parsedUrl.protocol !== 'https:') {
        return new NextResponse('Only HTTPS URLs are permitted', { status: 400 });
      }
      if (isPrivateIpOrLocalhost(parsedUrl.hostname) || !isAllowedHost(parsedUrl.hostname)) {
        return new NextResponse('Host is not in the allowed list', { status: 403 });
      }
      targetUrl = parsedUrl.toString();
    } catch {
      return new NextResponse('Invalid target image URL', { status: 400 });
    }
  } else {
    return new NextResponse('Missing image id or url parameter', { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      // Fallback: try drive.google.com/thumbnail if id was specified
      if (id) {
        const thumbRes = await fetch(`https://drive.google.com/thumbnail?id=${id}&sz=w400`);
        if (thumbRes.ok) {
          const contentType = thumbRes.headers.get('content-type') || 'image/jpeg';
          const buffer = await thumbRes.arrayBuffer();
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
            },
          });
        }
      }
      return new NextResponse('Failed to fetch image from upstream', { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err: any) {
    console.error('[image-proxy] error:', err);
    return new NextResponse('Internal Server Error fetching image', { status: 500 });
  }
}
