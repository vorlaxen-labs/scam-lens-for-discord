export class EnvUtils {
  static string(name: string, defaultValue?: string): string {
    const value = process.env[name];
    if (value === undefined || value === '') {
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  static number(name: string, defaultValue?: number): number {
    const raw = process.env[name];
    if (raw === undefined || raw === '') {
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`Missing required environment variable: ${name}`);
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      throw new Error(`Environment variable ${name} must be a number`);
    }
    return parsed;
  }

  static bool(name: string, defaultValue = false): boolean {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return defaultValue;
    return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
  }

  static array(name: string, defaultValue: string[] = []): string[] {
    const raw = process.env[name];
    if (!raw) return defaultValue;
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
  }
}
