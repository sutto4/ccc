import { query } from '@/lib/db';
import crypto from 'node:crypto';

const ALG = 'aes-256-gcm';
const KEY_BYTES = 32;       // AES-256
const IV_BYTES = 12;        // GCM best practice
const ENC = 'base64url';    // compact and delimiter-free

function b64url(buf: Buffer) { return buf.toString('base64url'); }
function fromB64url(s: string) { return Buffer.from(s, 'base64url'); }

export class RefreshTokenManager {
  private static KEY = crypto.scryptSync(
    process.env.REFRESH_TOKEN_ENCRYPTION_KEY ?? 'change-me',
    process.env.REFRESH_TOKEN_ENCRYPTION_SALT ?? 'change-me-too',
    KEY_BYTES
  );

  private static assertNodeRuntime(): void {
    // Fail fast if somehow bundled wrong
    if (typeof window !== 'undefined') throw new Error('Server only');
    if (!process.versions?.node) throw new Error('Node runtime required');
  }

  private static encrypt(token: string): string {
    this.assertNodeRuntime();
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALG, this.KEY, iv);
    const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // iv.tag.ct as base64url, dot-joined
    return `${b64url(iv)}.${b64url(tag)}.${b64url(ciphertext)}`;
  }

  private static decrypt(payload: string): string {
    this.assertNodeRuntime();
    const [ivStr, tagStr, ctStr] = payload.split('.');
    if (!ivStr || !tagStr || !ctStr) throw new Error('Invalid encrypted token');
    const iv = fromB64url(ivStr);
    const tag = fromB64url(tagStr);
    const ct = fromB64url(ctStr);
    const decipher = crypto.createDecipheriv(ALG, this.KEY, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(ct), decipher.final()]);
    return out.toString('utf8');
  }

  static async storeRefreshToken(discordId: string, refreshToken: string, expiresAt?: Date): Promise<void> {
    const encrypted = this.encrypt(refreshToken);
    // Ensure you actually have a UNIQUE KEY on discord_id
    await query(
      `INSERT INTO user_refresh_tokens (discord_id, refresh_token_encrypted, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
        refresh_token_encrypted = VALUES(refresh_token_encrypted),
        expires_at = VALUES(expires_at)`,
      [discordId, encrypted, expiresAt ?? null]
    );
  }

  static async rotateRefreshToken(discordId: string, newRefreshToken: string, expiresAt?: Date): Promise<void> {
    // call this right after a successful refresh response
    await this.storeRefreshToken(discordId, newRefreshToken, expiresAt);
  }

  static async getRefreshToken(discordId: string): Promise<string | null> {
    const rows = await query(
      `SELECT refresh_token_encrypted
       FROM user_refresh_tokens
       WHERE discord_id = ?
       ${/* if you truly track expiry */''}
       AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [discordId]
    );
    if (!rows?.length) return null;
    return this.decrypt(rows[0].refresh_token_encrypted);
  }

  static async deleteRefreshToken(discordId: string): Promise<void> {
    await query(`DELETE FROM user_refresh_tokens WHERE discord_id = ?`, [discordId]);
  }

  static async cleanupExpired(): Promise<number> {
    const res = await query(`DELETE FROM user_refresh_tokens WHERE expires_at IS NOT NULL AND expires_at < NOW()`);
    return res?.affectedRows ?? 0;
  }
}
