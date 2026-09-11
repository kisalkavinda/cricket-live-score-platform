import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const masterCricketBallSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Rich 3D Spherical Leather Lighting -->
    <radialGradient id="leatherGrad" cx="30%" cy="24%" r="72%">
      <stop offset="0%" stop-color="#FF3B5F" />
      <stop offset="26%" stop-color="#E60026" />
      <stop offset="58%" stop-color="#990016" />
      <stop offset="85%" stop-color="#56000D" />
      <stop offset="100%" stop-color="#240005" />
    </radialGradient>

    <!-- Subtle Ambient Bounce Light (simulating ground/turf bounce reflection) -->
    <radialGradient id="ambientBounce" cx="75%" cy="80%" r="50%">
      <stop offset="0%" stop-color="rgba(255, 120, 150, 0.22)" />
      <stop offset="60%" stop-color="rgba(255, 60, 90, 0.08)" />
      <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
    </radialGradient>

    <!-- Clip strictly to spherical ball -->
    <clipPath id="ballClip">
      <circle cx="256" cy="256" r="232" />
    </clipPath>

    <!-- Rim light gradient -->
    <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.35)" />
      <stop offset="40%" stop-color="rgba(255, 150, 180, 0.15)" />
      <stop offset="100%" stop-color="rgba(0, 0, 0, 0.4)" />
    </linearGradient>
  </defs>

  <!-- 1. Ambient Drop Shadow for Light Browser Tabs & Bookmarks -->
  <circle cx="256" cy="262" r="232" fill="rgba(0,0,0,0.38)" filter="blur(8px)" />

  <!-- 2. Main Leather Sphere -->
  <circle cx="256" cy="256" r="232" fill="url(#leatherGrad)" stroke="url(#rimGrad)" stroke-width="2.5" />

  <g clip-path="url(#ballClip)">
    <!-- 3. Soft Ambient Bounce on Shadow Hemisphere (smooth spherical gradient) -->
    <circle cx="256" cy="256" r="232" fill="url(#ambientBounce)" />

    <!-- ==================== AUTHENTIC 3D CRICKET SEAM ==================== -->
    <!-- (a) Seam Cast Shadow (gives authentic raised relief above the red leather) -->
    <path d="M 66 335 C 160 380, 330 330, 442 162" 
          transform="translate(4, 7)" 
          fill="none" stroke="rgba(14, 0, 3, 0.65)" stroke-width="22" stroke-linecap="round" />

    <!-- (b) Raised Leather Welt Base -->
    <path d="M 66 335 C 160 380, 330 330, 442 162" 
          fill="none" stroke="#68000E" stroke-width="19" stroke-linecap="round" />

    <!-- (c) Dual Stitched White Cords (Twin outer ridges) -->
    <path d="M 66 335 C 160 380, 330 330, 442 162" 
          transform="translate(2.5, 3)" 
          fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" />
    <path d="M 66 335 C 160 380, 330 330, 442 162" 
          transform="translate(-2.5, -3)" 
          fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" />

    <!-- (d) Subtle Seam Groove Channel -->
    <path d="M 66 335 C 160 380, 330 330, 442 162" 
          fill="none" stroke="#7A0012" stroke-width="2.5" stroke-linecap="round" />

    <!-- (e) Fine Linen Stitch Texture (authentic hand-stitched detailing) -->
    <path d="M 66 335 C 160 380, 330 330, 442 162" 
          transform="translate(2.5, 3)" 
          fill="none" stroke="#E6D7C3" stroke-width="7" stroke-dasharray="2.5 8" stroke-linecap="round" />
    <path d="M 66 335 C 160 380, 330 330, 442 162" 
          transform="translate(-2.5, -3)" 
          fill="none" stroke="#E6D7C3" stroke-width="7" stroke-dasharray="2.5 8" stroke-linecap="round" />

    <!-- (f) High-Gloss Specular Shine on Seam Ridge -->
    <path d="M 66 335 C 160 380, 330 330, 442 162" 
          transform="translate(-2.5, -3)" 
          fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.9" />

    <!-- ==================== SPECULAR GLOSS HIGHLIGHTS ==================== -->
    <!-- (a) Soft luminous aura -->
    <ellipse cx="195" cy="160" rx="46" ry="24" transform="rotate(-45 195 160)" fill="rgba(255, 255, 255, 0.28)" />

    <!-- (b) Primary sharp curved gloss arc -->
    <path d="M 125 210 A 176 176 0 0 1 210 125" 
          fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" opacity="0.82" />

    <!-- (c) Intense core reflection -->
    <path d="M 140 195 A 176 176 0 0 1 195 140" 
          fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" opacity="0.98" />
  </g>
</svg>`;

interface ImageEntry {
  size: number;
  buffer: Buffer;
}

function createIco(images: ImageEntry[]): Buffer {
  const count = images.length;
  const headerLength = 6;
  const entryLength = 16;
  const dirLength = headerLength + entryLength * count;

  let totalLength = dirLength;
  for (const img of images) {
    totalLength += img.buffer.length;
  }

  const out = Buffer.alloc(totalLength);

  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(count, 4);

  let currentOffset = dirLength;
  for (let i = 0; i < count; i++) {
    const img = images[i];
    const offset = headerLength + i * entryLength;

    out.writeUInt8(img.size >= 256 ? 0 : img.size, offset + 0);
    out.writeUInt8(img.size >= 256 ? 0 : img.size, offset + 1);
    out.writeUInt8(0, offset + 2);
    out.writeUInt8(0, offset + 3);
    out.writeUInt16LE(1, offset + 4);
    out.writeUInt16LE(32, offset + 6);
    out.writeUInt32LE(img.buffer.length, offset + 8);
    out.writeUInt32LE(currentOffset, offset + 12);

    img.buffer.copy(out, currentOffset);
    currentOffset += img.buffer.length;
  }

  return out;
}

export async function buildFavicons(): Promise<void> {
  const publicDir = path.resolve(__dirname, '../public');
  const appDir = path.resolve(__dirname, '../app');

  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), masterCricketBallSvg, 'utf8');
  fs.writeFileSync(path.join(appDir, 'icon.svg'), masterCricketBallSvg, 'utf8');

  const svgBuffer = Buffer.from(masterCricketBallSvg);

  const p16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const p32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const p48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  const p180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  const p192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  const p512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();

  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), p180);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), p192);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), p512);

  const icoBuffer = createIco([
    { size: 16, buffer: p16 },
    { size: 32, buffer: p32 },
    { size: 48, buffer: p48 },
  ]);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
}
