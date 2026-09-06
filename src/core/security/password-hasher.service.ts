import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordHasher {
  hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19 * 1024,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(
    password: string,
    encoded: string | null | undefined,
  ): Promise<boolean> {
    if (!encoded) return false;
    try {
      return await argon2.verify(encoded, password);
    } catch {
      // Invalid stored hashes must fail verification without escaping to callers.
      return false;
    }
  }
}
