const IMAGE_EXTENSION_PATTERN = /\.(webp|png|jpe?g|gif|avif)$/i;

export function hasImageExtension(value: string): boolean {
  return IMAGE_EXTENSION_PATTERN.test(value);
}

export function isImageAttachment(attachment: {
  contentType: string | null;
  name?: string | null;
  url: string;
}): boolean {
  if (attachment.contentType?.startsWith('image/')) {
    return true;
  }

  if (attachment.name && hasImageExtension(attachment.name)) {
    return true;
  }

  try {
    return hasImageExtension(new URL(attachment.url).pathname);
  } catch {
    return false;
  }
}
