import imghash from 'imghash';
import sharp from 'sharp';
import { hammingDistance } from '../shared/utils/hamming.util.js';
import { fetchDiscordImage, IMAGE_FETCH_LIMITS, ImageFetchError } from '../shared/utils/image-fetch.util.js';
import type { ScamHashRecord } from '../infra/database/repositories/scam-hash.repository.js';
import type { ImageMatch } from '../shared/types/index.js';
import { logger } from '../infra/logger/index.js';

// imghash size 8 => 8x8 DCT => 64-bit perceptual hash (16 hex chars)
const PHASH_SIZE = 8;

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

  async computeHashFromBuffer(buffer: Buffer): Promise<string> {
    const normalized = await sharp(buffer, { animated: true, limitInputPixels: IMAGE_FETCH_LIMITS.maxPixels })
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    const hash = await imghash.hash(normalized, PHASH_SIZE, 'hex');
    return hash.toLowerCase();
  }

  async computeHashFromUrl(url: string): Promise<string> {
    const buffer = await fetchDiscordImage(url);
    return this.computeHashFromBuffer(buffer);
  }

  matchHash(inputHash: string, threshold: number, guildId: string): ImageMatch | null {
    const candidates = this.hashRecords.filter(
      (record) => record.guildId === null || record.guildId === guildId,
    );

    let bestMatch: ImageMatch | null = null;

    for (const record of candidates) {
      try {
        const distance = hammingDistance(inputHash, record.hash);
        if (distance <= threshold && (!bestMatch || distance < bestMatch.hammingDistance)) {
          bestMatch = {
            hash: inputHash,
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
      const hash = await this.computeHashFromUrl(url);
      return this.matchHash(hash, threshold, guildId);
    } catch (error) {
      if (error instanceof ImageFetchError) {
        logger.debug({ url, error: error.message }, 'Image fetch skipped');
        return null;
      }
      throw error;
    }
  }
}

export { PHASH_SIZE };
