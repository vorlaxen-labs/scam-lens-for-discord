import imghash from 'imghash';
import sharp from 'sharp';
import { IMAGE_FETCH_LIMITS, ImageFetchError } from '../shared/utils/image-fetch.util.js';

// imghash size 8 => 8x8 DCT => 64-bit perceptual hash (16 hex chars)
export const PHASH_SIZE = 8;

/** Primary normalization size; also used for stored reference hashes. */
export const PHASH_PRIMARY_SIZE = 512;

/** Extra sizes scanned at match time — improves cross-resolution matching. */
export const PHASH_MATCH_SIZES = [256, PHASH_PRIMARY_SIZE] as const;

/**
 * Identity of the reference-hash pipeline. Bump this when resize, webp quality,
 * imghash size, or the stored variants change. The boot dataset is rejected
 * when its rows carry a different id.
 */
export const IMAGE_HASH_PIPELINE = 'v1:imghash-8:fit-512:webp-75:original-1080p-720p';

export const IMAGE_HASH_VARIANTS = ['original', '1080p', '720p'] as const;

export type ImageHashVariant = (typeof IMAGE_HASH_VARIANTS)[number];

export async function simulateDiscordUpload(
  buffer: Buffer,
  maxWidth: number,
  maxHeight: number,
): Promise<Buffer> {
  return sharp(buffer, {
    animated: true,
    pages: 1,
    limitInputPixels: IMAGE_FETCH_LIMITS.maxPixels,
  })
    .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: false })
    .webp({ quality: 75 })
    .toBuffer();
}

export async function computeImageHash(
  buffer: Buffer,
  normalizeSize = PHASH_PRIMARY_SIZE,
): Promise<string> {
  try {
    const normalized = await sharp(buffer, {
      animated: true,
      pages: 1,
      limitInputPixels: IMAGE_FETCH_LIMITS.maxPixels,
    })
      .resize(normalizeSize, normalizeSize, { fit: 'inside', withoutEnlargement: false })
      .greyscale()
      .toBuffer();

    const hash = await imghash.hash(normalized, PHASH_SIZE, 'hex');
    return hash.toLowerCase();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image processing failed';
    if (message.includes('pixel') || message.includes('Input image')) {
      throw new ImageFetchError('Image exceeds processing limits');
    }
    throw error;
  }
}

export interface ReferenceVariantHash {
  variant: ImageHashVariant;
  hash: string;
  label: string;
}

/** Same three variants the bot used to compute on every boot. */
export async function buildReferenceVariantHashes(
  buffer: Buffer,
  file: string,
): Promise<ReferenceVariantHash[]> {
  const originalHash = await computeImageHash(buffer);
  const upload1080 = await simulateDiscordUpload(buffer, 1920, 1080);
  const upload720 = await simulateDiscordUpload(buffer, 1280, 720);
  const hash1080 = await computeImageHash(upload1080);
  const hash720 = await computeImageHash(upload720);

  return [
    { variant: 'original', hash: originalHash, label: file },
    { variant: '1080p', hash: hash1080, label: `${file}@1080p` },
    { variant: '720p', hash: hash720, label: `${file}@720p` },
  ];
}
