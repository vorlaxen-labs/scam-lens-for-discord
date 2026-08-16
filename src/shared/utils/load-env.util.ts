import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export function loadEnv(): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const envDir = path.resolve(process.cwd(), 'env');
  const candidates = [
    path.join(envDir, `.env.${nodeEnv}`),
    path.join(envDir, '.env'),
    path.resolve(process.cwd(), `.env.${nodeEnv}`),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return;
    }
  }
}
