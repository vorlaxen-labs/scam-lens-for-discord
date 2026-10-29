import type { ImageUrlScenario } from '../types.js';
import { cdnImage } from './fixtures.js';

function images(
  name: string,
  expectUrls: string[],
  patch: Omit<ImageUrlScenario, 'kind' | 'name' | 'expect'> = {},
): ImageUrlScenario {
  return { kind: 'image-urls', name, ...patch, expect: { urls: expectUrls } };
}

const first = cdnImage('1.png');
const second = cdnImage('2.png');
const third = cdnImage('3.png');
const fourth = cdnImage('4.png');

export const IMAGE_SCENARIOS: ImageUrlScenario[] = [
  images('attachment and embed images are collected in order', [
    first,
    'https://media.discordapp.net/attachments/1/3/b.webp',
    'https://images-ext-1.discordapp.net/external/abc/thumb.png',
  ], {
    attachments: [{ url: first, contentType: 'image/png' }],
    embeds: [
      {
        image: { url: 'https://media.discordapp.net/attachments/1/3/b.webp' },
        thumbnail: { url: 'https://images-ext-1.discordapp.net/external/abc/thumb.png' },
      },
    ],
  }),
  images('image extension is enough when content type is missing', [cdnImage('scam.webp')], {
    attachments: [{ url: cdnImage('scam.webp'), contentType: null, name: 'scam.webp' }],
  }),
  images('duplicate urls are kept once', [first], {
    attachments: [{ url: first, contentType: 'image/png' }],
    embeds: [{ image: { url: first }, thumbnail: { url: 'https://evil.com/x.png' } }],
  }),
  images('non-image attachments and foreign hosts are skipped', [second], {
    attachments: [
      { url: cdnImage('notes.pdf'), contentType: 'application/pdf', name: 'notes.pdf' },
      { url: second, contentType: 'image/png' },
    ],
    embeds: [{ image: { url: 'https://example.com/scam.png' } }],
  }),
  images('only the first three images are kept', [first, second, third], {
    attachments: [
      { url: first, contentType: 'image/png' },
      { url: second, contentType: 'image/png' },
      { url: third, contentType: 'image/png' },
      { url: fourth, contentType: 'image/png' },
    ],
    embeds: [{ image: { url: cdnImage('5.png') } }],
  }),
  images('a message with no images yields an empty list', []),
];
