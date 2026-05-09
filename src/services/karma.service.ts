// src/services/karma.service.ts

import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../types';

export class KarmaService {
  private readonly baseUrl =
    'https://adjutor.lendsqr.com/v2/verification/karma';

  async isBlacklisted(identity: string): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/${encodeURIComponent(identity)}`, {
        headers: { Authorization: `Bearer ${env.ADJUTOR_API_KEY}` },
      });
      // 200 response = identity found in Karma = blacklisted
      return true;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // 404 = not found in Karma = user is clean
        return false;
      }
      // Network failure, 5xx, or unexpected error — fail closed
      throw new AppError(
        503,
        'Unable to verify user eligibility. Please try again later.'
      );
    }
  }
}
