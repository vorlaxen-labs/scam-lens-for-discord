import type { DomainDryRunScenario, DomainMatchExpect, DomainMessageScenario } from '../types.js';
import { DEFAULT_GLOBAL_DOMAINS } from './fixtures.js';

const evil: DomainMatchExpect = {
  domain: 'login.evil.com',
  blockedDomain: 'evil.com',
  source: 'global',
};

function dry(
  name: string,
  text: string,
  matches: DomainMatchExpect[],
  patch: Partial<DomainDryRunScenario> = {},
): DomainDryRunScenario {
  return {
    kind: 'domain-dry-run',
    name,
    text,
    globalDomains: DEFAULT_GLOBAL_DOMAINS,
    guildId: 'guild-1',
    ...patch,
    expect: { matches },
  };
}

function message(
  name: string,
  matches: DomainMatchExpect[],
  patch: Partial<DomainMessageScenario> = {},
): DomainMessageScenario {
  return {
    kind: 'domain-message',
    name,
    globalDomains: DEFAULT_GLOBAL_DOMAINS,
    guildId: 'guild-1',
    ...patch,
    expect: { matches },
  };
}

export const DOMAIN_SCENARIOS: Array<DomainDryRunScenario | DomainMessageScenario> = [
  dry('https url matches a blocked suffix', 'claim it at https://login.evil.com/free', [evil]),
  dry('exact domain matches the blocklist entry', 'https://evil.com/login', [
    { domain: 'evil.com', blockedDomain: 'evil.com', source: 'global' },
  ]),
  dry('uppercase host is normalized', 'HTTPS://LOGIN.EVIL.COM/Free', [evil]),
  dry('leading www is stripped before the lookup', 'https://www.evil.com/path', [
    { domain: 'evil.com', blockedDomain: 'evil.com', source: 'global' },
  ]),
  dry('www on a subdomain still matches the registrable suffix', 'https://www.login.evil.com/a', [
    evil,
  ]),
  dry('trailing comma does not become part of the host', 'go to https://login.evil.com, now', [evil]),
  dry('hxxps obfuscation is treated as https', 'hxxps://login.evil.com/nitro', [evil]),
  dry('hxxp obfuscation is treated as http', 'hxxp://login.evil.com/nitro', [evil]),
  dry('angle-bracket autolink is unwrapped', 'see <https://login.evil.com>', [evil]),
  dry('zero-width characters inside a url host are removed', 'https://login.evi\u200Bl.com/x', [
    evil,
  ]),
  dry('plain domain without a scheme is scanned', 'visit login.evil.com today', [evil]),
  dry('domain wrapped in parentheses is scanned', 'mirror (login.evil.com)', [evil]),
  dry('markdown href is scanned and the label is not', '[click](https://login.evil.com)', [evil]),
  dry('markdown label is ignored when the href is safe', '[login.evil.com](https://example.com)', []),
  dry(
    'path inside a markdown href is not a second hostname',
    '[x](https://example.com/login.evil.com)',
    [],
  ),
  dry(
    'path of a raw url is scanned for a blocked domain',
    'https://example.com/ref/login.evil.com',
    [evil],
  ),
  dry('userinfo is ignored and the host is kept', 'https://user:pass@login.evil.com/a', [evil]),
  dry('port is ignored and the host is kept', 'https://login.evil.com:443/a', [evil]),
  dry('nested subdomain matches the blocked suffix', 'https://a.b.login.evil.com/x', [
    { domain: 'a.b.login.evil.com', blockedDomain: 'evil.com', source: 'global' },
  ]),
  dry('longest blocked suffix wins', 'https://login.evil.com/x', [
    { domain: 'login.evil.com', blockedDomain: 'login.evil.com', source: 'global' },
  ], {
    globalDomains: ['evil.com', 'discord-gift.com', 'login.evil.com'],
  }),
  dry('substring lookalikes are not suffix matches', 'https://notevil.com/login', []),
  dry('a blocked name that is only a prefix of the host is ignored', 'https://evil.com.attacker.test', []),
  dry('localhost is not a blocked domain', 'https://localhost/admin', []),
  dry('ordinary chat has no domain hit', 'hello team, standup at 10', []),
  dry('empty blocklist matches nothing', 'https://login.evil.com', [], { globalDomains: [] }),
  dry('two blocked hosts in one message are both reported', 'https://login.evil.com and https://free.discord-gift.com/a', [
    evil,
    { domain: 'free.discord-gift.com', blockedDomain: 'discord-gift.com', source: 'global' },
  ]),
  dry('the same host repeated twice is one match', 'https://login.evil.com https://login.evil.com/bonus', [
    evil,
  ]),
  dry('comma-separated bare domains are both reported', 'evil.com, discord-gift.com', [
    { domain: 'evil.com', blockedDomain: 'evil.com', source: 'global' },
    { domain: 'discord-gift.com', blockedDomain: 'discord-gift.com', source: 'global' },
  ]),
  dry('allowlist drops the blocked suffix and its subdomains', 'https://login.evil.com', [], {
    allowedDomains: ['evil.com'],
  }),
  dry('allowlist of one subdomain does not cover a sibling host', 'https://pay.evil.com', [
    { domain: 'pay.evil.com', blockedDomain: 'evil.com', source: 'global' },
  ], {
    allowedDomains: ['login.evil.com'],
  }),
  dry('allowlisted subdomain itself is skipped', 'https://login.evil.com', [], {
    allowedDomains: ['login.evil.com'],
  }),
  dry('guild blocklist hit is tagged as guild', 'https://pay.custom-scam.net/pay', [
    { domain: 'pay.custom-scam.net', blockedDomain: 'custom-scam.net', source: 'guild' },
  ], {
    globalDomains: [],
    guildDomains: ['custom-scam.net'],
  }),
  dry('guild blocklist does not apply to another server', 'https://pay.custom-scam.net', [], {
    globalDomains: [],
    guildDomains: ['custom-scam.net'],
    seedGuildId: 'guild-1',
    guildId: 'guild-2',
  }),
  dry('global blocklist is consulted before the guild list', 'https://login.evil.com', [evil], {
    guildDomains: ['login.evil.com'],
  }),
  message('embed url and description are both scanned', [
    { domain: 'discord-gift.com', blockedDomain: 'discord-gift.com', source: 'global' },
    evil,
  ], {
    embeds: [
      {
        title: 'You won',
        description: 'Visit login.evil.com now',
        url: 'https://discord-gift.com/prize',
      },
    ],
  }),
  message('embed title is scanned', [evil], {
    embeds: [{ title: 'login.evil.com' }],
  }),
  message('embed author url is scanned', [evil], {
    embeds: [{ author: { url: 'https://login.evil.com' } }],
  }),
  message('embed field name and value are scanned', [
    evil,
    { domain: 'discord-gift.com', blockedDomain: 'discord-gift.com', source: 'global' },
  ], {
    embeds: [{ fields: [{ name: 'login.evil.com', value: 'https://discord-gift.com' }] }],
  }),
  message('button url is scanned', [evil], {
    components: [{ components: [{ url: 'https://login.evil.com/claim' }] }],
  }),
  message('message content and embed host are combined', [
    evil,
    { domain: 'discord-gift.com', blockedDomain: 'discord-gift.com', source: 'global' },
  ], {
    content: 'https://login.evil.com',
    embeds: [{ url: 'https://discord-gift.com' }],
  }),
];
