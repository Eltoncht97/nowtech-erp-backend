import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const PREFIX = 'scrypt$v1$131072$8$1';

@Injectable()
export class PasswordHasher {
  private derive(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(
        password,
        salt,
        64,
        { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
        (error, key) => {
          if (error) reject(error);
          else resolve(key);
        },
      );
    });
  }

  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await this.derive(password, salt);
    return `${PREFIX}$${salt.toString('hex')}$${key.toString('hex')}`;
  }

  async verify(
    password: string,
    encoded: string | null | undefined,
  ): Promise<boolean> {
    // Accept only this version's fixed costs, never untrusted work factors.
    if (
      !encoded ||
      !/^scrypt\$v1\$131072\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(encoded)
    )
      return false;
    const parts = encoded.split('$');
    const actual = await this.derive(password, Buffer.from(parts[5], 'hex'));
    return timingSafeEqual(actual, Buffer.from(parts[6], 'hex'));
  }
}
