import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const rawUrl = searchParams.get('url');

  let targetUrl = '';
  if (id) {
    targetUrl = `https://lh3.googleusercontent.com/d/${id}`;
  } else if (rawUrl) {
    targetUrl = decodeURIComponent(rawUrl);
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
      // Fallback: try drive.google.com/thumbnail
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
