import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchDiscordImage,
  IMAGE_FETCH_LIMITS,
  ImageFetchError,
  readResponseBodyWithLimit,
} from '../../src/shared/utils/image-fetch.util.js';

function createStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(chunks[index]!);
      index += 1;
    },
  });
}

describe('readResponseBodyWithLimit', () => {
  it('returns concatenated buffer under limit', async () => {
    const body = createStream([new Uint8Array([1, 2]), new Uint8Array([3, 4])]);
    const result = await readResponseBodyWithLimit(body, 10);
    expect(result.equals(Buffer.from([1, 2, 3, 4]))).toBe(true);
  });

  it('aborts when stream exceeds max bytes', async () => {
    const body = createStream([new Uint8Array(6), new Uint8Array(6)]);
    await expect(readResponseBodyWithLimit(body, 10)).rejects.toThrow(ImageFetchError);
  });
});

describe('fetchDiscordImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects blocked hosts', async () => {
    await expect(fetchDiscordImage('https://evil.example/image.png')).rejects.toThrow(
      'Blocked image host',
    );
  });

  it('enforces byte limit while streaming even without content-length', async () => {
    const oversized = new Uint8Array(IMAGE_FETCH_LIMITS.maxBytes + 1);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: {
          get(name: string) {
            if (name === 'content-type') return 'image/png';
            if (name === 'content-length') return null;
            return null;
          },
        },
        body: createStream([oversized]),
      })),
    );

    await expect(
      fetchDiscordImage('https://cdn.discordapp.com/attachments/1/2/image.png'),
    ).rejects.toThrow('Image exceeds maximum allowed size');
  });

  it('rejects unsupported mime types', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: {
          get(name: string) {
            if (name === 'content-type') return 'text/html';
            return null;
          },
        },
        body: createStream([new Uint8Array([1])]),
      })),
    );

    await expect(
      fetchDiscordImage('https://cdn.discordapp.com/attachments/1/2/image.png'),
    ).rejects.toThrow('Unsupported image MIME type');
  });

  it('follows redirects within limit and returns image bytes', async () => {
    const payload = new Uint8Array([9, 8, 7]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 302,
        ok: false,
        headers: {
          get(name: string) {
            if (name === 'location') {
              return 'https://media.discordapp.net/attachments/1/2/final.png';
            }
            return null;
          },
        },
        body: null,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get(name: string) {
            if (name === 'content-type') return 'image/png';
            if (name === 'content-length') return String(payload.byteLength);
            return null;
          },
        },
        body: createStream([payload]),
      });

    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchDiscordImage('https://cdn.discordapp.com/attachments/1/2/start.png');
    expect(result.equals(Buffer.from(payload))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
