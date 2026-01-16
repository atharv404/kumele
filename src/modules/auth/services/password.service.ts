import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  /**
   * Hash a password using argon2id
   * This is the recommended algorithm for password hashing
   */
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterations
      parallelism: 4, // 4 parallel threads
    });
  }

  /**
   * Verify a password against its hash
   */
  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Check if password needs rehashing (e.g., algorithm params changed)
   */
  needsRehash(hash: string): boolean {
    try {
      return argon2.needsRehash(hash);
    } catch {
      return true;
    }
  }
}
