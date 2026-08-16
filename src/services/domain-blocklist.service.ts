import type { Message } from 'discord.js';
import { BlockedDomainRepository } from '../infra/database/repositories/blocked-domain.repository.js';
import { AllowedDomainRepository } from '../infra/database/repositories/detection-log.repository.js';
import type { DomainMatch } from '../shared/types/index.js';

const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;
const URL_REGEX =
  /(?:https?:\/\/|hxxps?:\/\/|<https?:\/\/|<?https?:\/\/)[^\s<>[\]()]+/gi;
const DOMAIN_REGEX =
  /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\b/gi;
const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\(([^)]+)\)/g;

export function normalizeDomain(raw: string): string {
  let value = raw.trim().toLowerCase();
  value = value.replace(ZERO_WIDTH_REGEX, '');
  value = value.replace(/^www\./, '');
  value = value.replace(/[.,;:!?)>\]}]+$/, '');
  value = value.replace(/^<|>$/g, '');
  return value;
}

export function extractHostname(rawUrl: string): string | null {
  let candidate = rawUrl.trim().replace(ZERO_WIDTH_REGEX, '');
  candidate = candidate.replace(/^<|>$/g, '');
  candidate = candidate.replace(/^hxxps:\/\//i, 'https://');
  candidate = candidate.replace(/^hxxp:\/\//i, 'http://');

  if (!candidate.includes('://')) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return normalizeDomain(parsed.hostname);
  } catch {
    const fallback = normalizeDomain(rawUrl);
    return fallback.includes('.') ? fallback : null;
  }
}

export function isDomainBlocked(hostname: string, blockedDomain: string): boolean {
  return hostname === blockedDomain || hostname.endsWith(`.${blockedDomain}`);
}

export function findBlockedSuffix(hostname: string, blocked: Set<string>): string | null {
  const labels = hostname.split('.');
  for (let index = 0; index < labels.length; index++) {
    const suffix = labels.slice(index).join('.');
    if (blocked.has(suffix)) return suffix;
  }
  return null;
}

export function isAllowedDomain(hostname: string, allowedDomains: Set<string> | string[]): boolean {
  const allowed = allowedDomains instanceof Set ? allowedDomains : new Set(allowedDomains);
  return findBlockedSuffix(hostname, allowed) !== null;
}

export class DomainBlocklistService {
  private globalDomains = new Set<string>();
  private guildDomains = new Map<string, Set<string>>();

  constructor(
    private readonly blockedDomainRepository: BlockedDomainRepository,
    private readonly allowedDomainRepository: AllowedDomainRepository,
  ) {}

  loadFromDatabase(): void {
    const globals = this.blockedDomainRepository.listGlobalDomains();
    this.globalDomains = new Set(globals);
  }

  refreshGuildDomains(guildId: string): void {
    const domains = this.blockedDomainRepository.listGuildDomains(guildId);
    this.guildDomains.set(guildId, new Set(domains));
  }

  addGuildDomain(guildId: string, domain: string, addedBy: string): void {
    const normalized = normalizeDomain(domain);
    this.blockedDomainRepository.upsertGuild(guildId, normalized, addedBy);
    const guildSet = this.guildDomains.get(guildId) ?? new Set<string>();
    guildSet.add(normalized);
    this.guildDomains.set(guildId, guildSet);
  }

  removeGuildDomain(guildId: string, domain: string): boolean {
    const normalized = normalizeDomain(domain);
    const removed = this.blockedDomainRepository.removeGuildDomain(guildId, normalized);
    if (removed) {
      this.guildDomains.get(guildId)?.delete(normalized);
    }
    return removed;
  }

  listGuildDomains(guildId: string): string[] {
    this.refreshGuildDomains(guildId);
    return [...(this.guildDomains.get(guildId) ?? [])].sort();
  }

  listGuildDomainRecords(guildId: string) {
    return this.blockedDomainRepository.listGuildDomainRecords(guildId);
  }

  addGuildAllowedDomain(guildId: string, domain: string, addedBy: string): void {
    this.allowedDomainRepository.add(guildId, normalizeDomain(domain), addedBy);
  }

  removeGuildAllowedDomain(guildId: string, domain: string): boolean {
    return this.allowedDomainRepository.remove(guildId, normalizeDomain(domain));
  }

  listGuildAllowedDomains(guildId: string): string[] {
    return this.allowedDomainRepository.listForGuild(guildId);
  }

  countGuildAllowedDomains(guildId: string): number {
    return this.listGuildAllowedDomains(guildId).length;
  }

  getGlobalDomainCount(): number {
    return this.globalDomains.size;
  }

  extractCandidateHostnames(message: Message): string[] {
    const hostnames = new Set<string>();
    const texts: string[] = [];

    if (message.content) {
      texts.push(message.content);
    }

    for (const embed of message.embeds) {
      if (embed.url) texts.push(embed.url);
      if (embed.title) texts.push(embed.title);
      if (embed.description) texts.push(embed.description);
      if (embed.author?.url) texts.push(embed.author.url);
      for (const field of embed.fields ?? []) {
        texts.push(field.name, field.value);
      }
    }

    for (const componentRow of message.components ?? []) {
      if (!('components' in componentRow)) continue;
      for (const component of componentRow.components) {
        if ('url' in component && component.url) {
          texts.push(component.url);
        }
      }
    }

    for (const text of texts) {
      let markdownText = text;
      for (const match of text.matchAll(MARKDOWN_LINK_REGEX)) {
        hostnames.add(extractHostname(match[2]!)!);
        markdownText = markdownText.replace(match[0], ' ');
      }

      for (const match of markdownText.matchAll(URL_REGEX)) {
        const hostname = extractHostname(match[0]);
        if (hostname) hostnames.add(hostname);
      }

      for (const match of markdownText.matchAll(DOMAIN_REGEX)) {
        const hostname = normalizeDomain(match[0]);
        if (hostname.includes('.')) hostnames.add(hostname);
      }
    }

    return [...hostnames].filter(Boolean);
  }

  private matchHostnames(
    hostnames: Iterable<string>,
    guildId: string,
  ): DomainMatch[] {
    const allowedDomains = new Set(this.allowedDomainRepository.listForGuild(guildId));
    const guildDomains = this.guildDomains.get(guildId) ?? new Set<string>();
    const matches: DomainMatch[] = [];

    for (const hostname of hostnames) {
      if (isAllowedDomain(hostname, allowedDomains)) {
        continue;
      }

      const globalMatch = findBlockedSuffix(hostname, this.globalDomains);
      if (globalMatch) {
        matches.push({ domain: hostname, blockedDomain: globalMatch, source: 'global' });
        continue;
      }

      const guildMatch = findBlockedSuffix(hostname, guildDomains);
      if (guildMatch) {
        matches.push({ domain: hostname, blockedDomain: guildMatch, source: 'guild' });
      }
    }

    return matches;
  }

  scanMessage(message: Message, guildId: string): DomainMatch[] {
    const hostnames = this.extractCandidateHostnames(message);
    return this.matchHostnames(hostnames, guildId);
  }

  dryRun(text: string, guildId: string): DomainMatch[] {
    const hostnames = new Set<string>();

    let scanText = text;
    for (const match of text.matchAll(MARKDOWN_LINK_REGEX)) {
      const hostname = extractHostname(match[2]!);
      if (hostname) hostnames.add(hostname);
      scanText = scanText.replace(match[0], ' ');
    }

    for (const match of scanText.matchAll(URL_REGEX)) {
      const hostname = extractHostname(match[0]);
      if (hostname) hostnames.add(hostname);
    }
    for (const match of scanText.matchAll(DOMAIN_REGEX)) {
      const normalized = normalizeDomain(match[0]);
      if (normalized.includes('.')) hostnames.add(normalized);
    }

    return this.matchHostnames(hostnames, guildId);
  }
}
