import { describe, expect, it } from 'vitest';
import { isImageAttachment } from '../../src/shared/utils/image-attachment.util.js';

describe('isImageAttachment', () => {
  it('accepts image content types', () => {
    expect(
      isImageAttachment({
        contentType: 'image/webp',
        name: 'file.bin',
        url: 'https://cdn.discordapp.com/attachments/1/2/file.bin',
      }),
    ).toBe(true);
  });

  it('accepts attachments with missing content type but image file extension', () => {
    expect(
      isImageAttachment({
        contentType: null,
        name: 'scam.webp',
        url: 'https://cdn.discordapp.com/attachments/1/2/scam.webp',
      }),
    ).toBe(true);
  });

  it('accepts image urls even when name and content type are missing', () => {
    expect(
      isImageAttachment({
        contentType: null,
        name: null,
        url: 'https://media.discordapp.net/attachments/1/2/photo.png',
      }),
    ).toBe(true);
  });

  it('rejects non-image attachments', () => {
    expect(
      isImageAttachment({
        contentType: 'application/pdf',
        name: 'invoice.pdf',
        url: 'https://cdn.discordapp.com/attachments/1/2/invoice.pdf',
      }),
    ).toBe(false);
  });
});
