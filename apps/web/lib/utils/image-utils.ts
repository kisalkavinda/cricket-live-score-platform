/**
 * Image URL normalization utility.
 * 
 * Google Drive sharing links (drive.google.com/uc, drive.google.com/file/d/...)
 * now return `Cross-Origin-Resource-Policy: same-site`, which causes modern web browsers
 * to block them when embedded in third-party websites.
 * 
 * The reliable format that serves images with `Access-Control-Allow-Origin: *` is:
 * `https://lh3.googleusercontent.com/d/{FILE_ID}`
 */
export function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Convert Google Drive and Googleusercontent links to internal image proxy to bypass 403/429 Referer blocking
  const driveMatch =
    trimmed.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.google\.com\/open\?.*id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.usercontent\.google\.com\/download\?.*id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);

  if (driveMatch && driveMatch[1]) {
    return `/api/image-proxy?id=${driveMatch[1]}`;
  }

  return trimmed;
}
