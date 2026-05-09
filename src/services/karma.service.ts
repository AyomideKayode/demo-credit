// src/services/karma.service.ts

import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../types';

export class KarmaService {
  private readonly baseUrl =
    'https://adjutor.lendsqr.com/v2/verification/karma';

  async isBlacklisted(identity: string): Promise<boolean> {
    if (env.NODE_ENV === 'development' && env.SKIP_KARMA_CHECK) {
      console.warn('[Karma] Check bypassed via SKIP_KARMA_CHECK');
      return false;
    }
    try {
      const response = await axios.get(
        `${this.baseUrl}/${encodeURIComponent(identity)}`,
        {
          headers: { Authorization: `Bearer ${env.ADJUTOR_API_KEY}` },
        },
      );
      // console.log('[Karma] status:', response.status);
      // console.log('[Karma] data:', JSON.stringify(response.data));
      // 200 with data = found in Karma = blacklisted
      // 200 with empty body = treat as not found (test mode artifact)
      const hasData = response.data && Object.keys(response.data).length > 0;
      return hasData;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // console.log('[Karma] error status:', error.response?.status);
        // console.log(
        //   '[Karma] error data:',
        //   JSON.stringify(error.response?.data),
        // );
        // 404 response = identity not found in Karma = not blacklisted
        return false;
      }
      // Network failure, 5xx, or unexpected error — fail closed
      throw new AppError(
        503,
        'Unable to verify user eligibility. Please try again later.',
      );
    }
  }
}
