import { botConfig } from '../config/index.js';
import { hammingDistance } from '../shared/utils/hamming.util.js';
import { fetchDiscordImage, ImageFetchError } from '../shared/utils/image-fetch.util.js';
import type { ScamHashRecord } from '../infra/database/repositories/scam-hash.repository.js';
import type { ImageMatch } from '../shared/types/index.js';
import { logger } from '../infra/logger/index.js';
import {
  computeImageHash,
  PHASH_MATCH_SIZES,
  PHASH_PRIMARY_SIZE,
  PHASH_SIZE,
  simulateDiscordUpload,
} from './phash-compute.js';

export {
  PHASH_MATCH_SIZES,
  PHASH_PRIMARY_SIZE,
  PHASH_SIZE,
  simulateDiscordUpload,
};

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
    return computeImageHash(buffer, normalizeSize);
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
