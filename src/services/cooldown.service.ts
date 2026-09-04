export class CooldownService {
  private readonly cooldowns = new Map<string, number>();

  check(userId: string, commandName: string, cooldownSeconds: number): number | null {
    if (cooldownSeconds <= 0) return null;

    const key = `${userId}:${commandName}`;
    const expiresAt = this.cooldowns.get(key);
    const now = Date.now();

    if (expiresAt && expiresAt > now) {
      return Math.ceil((expiresAt - now) / 1000);
    }

    this.cooldowns.set(key, now + cooldownSeconds * 1000);
    return null;
  }
}
