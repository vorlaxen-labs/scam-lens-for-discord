const ALLOWED_HOSTS = new Set([
  'cdn.discordapp.com',
  'media.discordapp.net',
  'images-ext-1.discordapp.net',
  'images-ext-2.discordapp.net',
]);

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

export const IMAGE_FETCH_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  timeoutMs: 10_000,
  maxRedirects: 3,
  maxImagesPerMessage: 3,
  maxPixels: 4096 * 4096,
  maxAnimatedFrames: 100,
} as const;

export class ImageFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageFetchError';
  }
}

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.has(hostname.toLowerCase());
}

export async function fetchDiscordImage(url: string, signal?: AbortSignal): Promise<Buffer> {
  let currentUrl = url;
  let redirects = 0;

  while (true) {
    const parsed = new URL(currentUrl);
    if (!isAllowedHost(parsed.hostname)) {
      throw new ImageFetchError(`Blocked image host: ${parsed.hostname}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_LIMITS.timeoutMs);
    const abortHandler = () => controller.abort();
    signal?.addEventListener('abort', abortHandler);

    try {
      const response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: 'manual',
        headers: { 'User-Agent': 'ScamLensBot/1.0' },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new ImageFetchError('Redirect response missing location header');
        }
        redirects += 1;
        if (redirects > IMAGE_FETCH_LIMITS.maxRedirects) {
          throw new ImageFetchError('Too many redirects while fetching image');
        }
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new ImageFetchError(`Image fetch failed with status ${response.status}`);
      }

      const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
      if (!ALLOWED_MIME_TYPES.has(contentType)) {
        throw new ImageFetchError(`Unsupported image MIME type: ${contentType || 'unknown'}`);
      }

      const contentLength = Number(response.headers.get('content-length') ?? 0);
      if (contentLength > IMAGE_FETCH_LIMITS.maxBytes) {
        throw new ImageFetchError('Image exceeds maximum allowed size');
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > IMAGE_FETCH_LIMITS.maxBytes) {
        throw new ImageFetchError('Image exceeds maximum allowed size');
      }

      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abortHandler);
    }
  }
}
