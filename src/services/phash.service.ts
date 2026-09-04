import imghash from 'imghash';
import sharp from 'sharp';
import { botConfig } from '../config/index.js';
import { hammingDistance } from '../shared/utils/hamming.util.js';
import { fetchDiscordImage, IMAGE_FETCH_LIMITS, ImageFetchError } from '../shared/utils/image-fetch.util.js';
import type { ScamHashRecord } from '../infra/database/repositories/scam-hash.repository.js';
import type { ImageMatch } from '../shared/types/index.js';
import { logger } from '../infra/logger/index.js';

// imghash size 8 => 8x8 DCT => 64-bit perceptual hash (16 hex chars)
const PHASH_SIZE = 8;

/** Primary normalization size; also used for stored reference hashes. */
export const PHASH_PRIMARY_SIZE = 512;

/** Extra sizes scanned at match time — improves cross-resolution matching. */
export const PHASH_MATCH_SIZES = [256, PHASH_PRIMARY_SIZE] as const;

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

export class PhashService {
  private hashRecords: ScamHashRecord[] = [];

  setHashRecords(records: ScamHashRecord[]): void {
    this.hashRecords = records;
  }

  refreshHashRecords(records: ScamHashRecord[]): void {
    this.hashRecords = records;
  }

  getHashCounts(): { global: number; guildEntries: number } {
    let global = 0;
    let guildEntries = 0;
    for (const record of this.hashRecords) {
      if (record.guildId === null) global++;
      else guildEntries++;
    }
    return { global, guildEntries };
  }

  countForGuild(guildId: string): number {
    return this.hashRecords.filter(
      (record) => record.guildId === null || record.guildId === guildId,
    ).length;
  }

  async computeHashFromBuffer(buffer: Buffer, normalizeSize = PHASH_PRIMARY_SIZE): Promise<string> {
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

  async computeMatchHashesFromBuffer(buffer: Buffer): Promise<string[]> {
    const hashes = await Promise.all(
      PHASH_MATCH_SIZES.map((size) => this.computeHashFromBuffer(buffer, size)),
    );
    return [...new Set(hashes)];
  }

  async computeHashFromUrl(url: string): Promise<string> {
    const buffer = await fetchDiscordImage(url, { authToken: botConfig.token });
    return this.computeHashFromBuffer(buffer);
  }

  matchHash(
    inputHash: string | readonly string[],
    threshold: number,
    guildId: string,
  ): ImageMatch | null {
    const inputHashes = typeof inputHash === 'string' ? [inputHash] : inputHash;
    const candidates = this.hashRecords.filter(
      (record) => record.guildId === null || record.guildId === guildId,
    );

    let bestMatch: ImageMatch | null = null;

    for (const record of candidates) {
      try {
        let distance = Infinity;
        for (const candidateHash of inputHashes) {
          distance = Math.min(distance, hammingDistance(candidateHash, record.hash));
        }
        if (distance <= threshold && (!bestMatch || distance < bestMatch.hammingDistance)) {
          bestMatch = {
            hash: inputHashes[0]!,
            matchedHash: record.hash,
            hammingDistance: distance,
            label: record.label,
            hashSource: record.source,
          };
        }
      } catch (error) {
        logger.warn({ error, hash: record.hash }, 'Failed Hamming comparison');
      }
    }

    return bestMatch;
  }

  async scanUrl(url: string, threshold: number, guildId: string): Promise<ImageMatch | null> {
    try {
      const buffer = await fetchDiscordImage(url, { authToken: botConfig.token });
      const hashes = await this.computeMatchHashesFromBuffer(buffer);
      return this.matchHash(hashes, threshold, guildId);
    } catch (error) {
      if (error instanceof ImageFetchError) {
        logger.warn({ url, error: error.message }, 'Image fetch failed during scam scan');
        return null;
      }
      throw error;
    }
  }
}

export { PHASH_SIZE };
