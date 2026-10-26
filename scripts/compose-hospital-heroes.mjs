#!/usr/bin/env node
/**
 * Build ONE pre-composited panoramic hero WebP per hospital.
 * Pixel blend (Sharp) — not CSS masks.
 *
 * Layout (2560×760):
 *   LEFT  ~40%  hospital facade (inner edge fades into center)
 *   CENTER ~34% calm #EAF4FB field for title / search
 *   RIGHT ~26%  medication still-life (inner edge fades into center)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'assets', 'heroes');

const WIDTH = 2560;
const HEIGHT = 760;
const CENTER_RGB = { r: 234, g: 244, b: 251 }; // #EAF4FB

/* Push photos outward so the center stays clear for typography */
const HOSPITAL_PANEL_W = Math.round(WIDTH * 0.4); // ~1024
const PHARMACY_PANEL_W = Math.round(WIDTH * 0.28); // ~717
const HOSPITAL_FADE = Math.round(WIDTH * 0.16); // longer dissolve into center
const PHARMACY_FADE = Math.round(WIDTH * 0.14);

const pharmacySrc = path.join(root, 'public', 'assets', 'hero-pharmacy.jpg');

/** @type {{ slug: string; file: string; source: string; focusX: number }[]} */
const hospitals = [
  {
    slug: 'king-salman',
    file: 'king-salman-hero.webp',
    source: path.join(root, 'public', 'assets', 'hospital-exterior-primary.jpg'),
    focusX: 0.14,
  },
  {
    slug: 'maternity-children',
    file: 'maternity-children-hero.webp',
    source: path.join(root, 'public', 'assets', 'hospitals', 'maternity-children.jpg'),
    /* Bias left so the dense facade stays out of the title zone */
    focusX: 0.18,
  },
  {
    slug: 'hail-general',
    file: 'hail-general-hero.webp',
    source: path.join(root, 'public', 'assets', 'hospitals', 'hail-general.jpg'),
    focusX: 0.28,
  },
  {
    slug: 'king-khalid',
    file: 'king-khalid-hero.webp',
    source: path.join(root, 'public', 'assets', 'hospitals', 'king-khalid.jpg'),
    focusX: 0.3,
  },
  {
    slug: 'eradah',
    file: 'eradah-hero.webp',
    source: path.join(root, 'public', 'assets', 'hospitals', 'eradah-mental-health.jpg'),
    focusX: 0.22,
  },
];

/**
 * Cover-crop to target size with horizontal focus (0–1).
 * Uses a two-pass resize so extract dimensions stay in-bounds.
 * @param {string} src
 * @param {number} targetW
 * @param {number} targetH
 * @param {number} focusX
 */
async function coverCrop(src, targetW, targetH, focusX) {
  const meta = await sharp(src).rotate().metadata();
  const srcW = meta.width ?? targetW;
  const srcH = meta.height ?? targetH;
  const scale = Math.max(targetW / srcW, targetH / srcH);
  const scaledW = Math.max(targetW, Math.ceil(srcW * scale));
  const scaledH = Math.max(targetH, Math.ceil(srcH * scale));
  const maxLeft = Math.max(0, scaledW - targetW);
  const maxTop = Math.max(0, scaledH - targetH);
  const left = Math.min(maxLeft, Math.max(0, Math.round(maxLeft * Math.min(1, Math.max(0, focusX)))));
  const top = Math.min(maxTop, Math.max(0, Math.round(maxTop / 2)));

  return sharp(src)
    .rotate()
    .resize(scaledW, scaledH, { fit: 'fill' })
    .extract({ left, top, width: targetW, height: targetH })
    /* Very subtle cool grade — keep facade recognizable */
    .modulate({ brightness: 1.01, saturation: 0.94 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

/**
 * Apply a horizontal alpha ramp in-place on raw RGBA.
 * fadeMode 'right' = opaque left → transparent right (hospital inner edge)
 * fadeMode 'left'  = transparent left → opaque right (pharmacy inner edge)
 */
function applyHorizontalAlpha(raw, width, height, fadeMode, fadePx) {
  const out = Buffer.from(raw);
  const fade = Math.max(1, fadePx);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4 + 3;
      let factor = 1;
      if (fadeMode === 'right') {
        const start = width - fade;
        if (x >= start) {
          const t = (x - start) / fade;
          // smoothstep
          const s = t * t * (3 - 2 * t);
          factor = 1 - s;
        }
      } else {
        if (x < fade) {
          const t = x / fade;
          const s = t * t * (3 - 2 * t);
          factor = s;
        }
      }
      // Mild top/bottom feather so the panel doesn't look rectangular
      const edgeY = Math.min(y, height - 1 - y);
      const featherY = Math.min(48, Math.floor(height * 0.06));
      if (edgeY < featherY) {
        const ty = edgeY / featherY;
        const sy = ty * ty * (3 - 2 * ty);
        factor *= 0.35 + 0.65 * sy;
      }
      out[i] = Math.round(out[i] * factor);
    }
  }
  return out;
}

async function composeOne(hospital) {
  if (!fs.existsSync(hospital.source)) {
    throw new Error(`Missing hospital source: ${hospital.source}`);
  }
  if (!fs.existsSync(pharmacySrc)) {
    throw new Error(`Missing pharmacy source: ${pharmacySrc}`);
  }

  const canvas = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 3,
      background: CENTER_RGB,
    },
  })
    .png()
    .toBuffer();

  // Hospital — left panel, slightly wider than final visible so fade lands in center
  const hospitalW = HOSPITAL_PANEL_W + Math.round(HOSPITAL_FADE * 0.35);
  const hospitalRaw = await coverCrop(hospital.source, hospitalW, HEIGHT, hospital.focusX);
  const hospitalFaded = applyHorizontalAlpha(
    hospitalRaw.data,
    hospitalRaw.info.width,
    hospitalRaw.info.height,
    'right',
    HOSPITAL_FADE,
  );
  const hospitalPng = await sharp(hospitalFaded, {
    raw: {
      width: hospitalRaw.info.width,
      height: hospitalRaw.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  // Pharmacy — right panel (keep blister packs sharp; no heavy tint/wash)
  const pharmacyW = PHARMACY_PANEL_W + Math.round(PHARMACY_FADE * 0.25);
  const pharmacyLayer = await sharp(pharmacySrc)
    .rotate()
    .resize(pharmacyW, HEIGHT, { fit: 'cover', position: 'entropy' })
    .modulate({ brightness: 1.0, saturation: 1.03 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pharmacyFaded = applyHorizontalAlpha(
    pharmacyLayer.data,
    pharmacyLayer.info.width,
    pharmacyLayer.info.height,
    'left',
    PHARMACY_FADE,
  );
  const pharmacyPng = await sharp(pharmacyFaded, {
    raw: {
      width: pharmacyLayer.info.width,
      height: pharmacyLayer.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  const pharmacyLeft = WIDTH - pharmacyLayer.info.width;

  /* Soft center field baked into the asset — keeps typography zone calm */
  const centerScrimSvg = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="c" cx="50%" cy="42%" r="42%" fx="50%" fy="40%">
          <stop offset="0%" stop-color="#F2F8FC" stop-opacity="0.98"/>
          <stop offset="45%" stop-color="#EAF4FB" stop-opacity="0.9"/>
          <stop offset="75%" stop-color="#EAF4FB" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#EAF4FB" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#c)"/>
    </svg>
  `);

  const composed = await sharp(canvas)
    .composite([
      { input: hospitalPng, left: 0, top: 0 },
      { input: pharmacyPng, left: pharmacyLeft, top: 0 },
      { input: centerScrimSvg, left: 0, top: 0 },
    ])
    .webp({ quality: 82, effort: 5 })
    .toBuffer();

  const outPath = path.join(outDir, hospital.file);
  fs.writeFileSync(outPath, composed);
  const sizeKb = Math.round(composed.length / 1024);
  console.log(`✓ ${hospital.file} (${sizeKb} KB) ← ${path.basename(hospital.source)}`);
  return outPath;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`Compositing heroes → ${outDir}`);
  for (const hospital of hospitals) {
    await composeOne(hospital);
  }
  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
