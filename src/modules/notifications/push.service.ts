import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly firebaseEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.firebaseEnabled = !!(
      this.configService.get('FIREBASE_PROJECT_ID') &&
      this.configService.get('FIREBASE_CLIENT_EMAIL') &&
      this.configService.get('FIREBASE_PRIVATE_KEY')
    );

    if (!this.firebaseEnabled) {
      this.logger.warn('Firebase is not configured - push notifications will be logged only');
    }
  }

  /**
   * Send push notification to a specific user's devices
   */
  async sendToUser(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ success: number; failure: number; invalidTokens: string[] }> {
    if (tokens.length === 0) {
      return { success: 0, failure: 0, invalidTokens: [] };
    }

    if (!this.firebaseEnabled) {
      this.logger.debug(`[Mock Push] To ${tokens.length} devices: ${title} - ${body}`);
      return { success: tokens.length, failure: 0, invalidTokens: [] };
    }

    try {
      // Firebase Admin SDK integration would go here
      // For now, we'll mock the response
      this.logger.debug(`[Push] Sending to ${tokens.length} devices: ${title}`);
      
      // In production, you would use:
      // const messaging = getMessaging();
      // const response = await messaging.sendEachForMulticast({
      //   tokens,
      //   notification: { title, body },
      //   data,
      // });

      return {
        success: tokens.length,
        failure: 0,
        invalidTokens: [],
      };
    } catch (error) {
      this.logger.error(`Push notification failed: ${error.message}`);
      return {
        success: 0,
        failure: tokens.length,
        invalidTokens: [],
      };
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToMany(
    userTokensMap: Map<string, string[]>,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ success: number; failure: number }> {
    let totalSuccess = 0;
    let totalFailure = 0;

    for (const [userId, tokens] of userTokensMap) {
      const result = await this.sendToUser(tokens, title, body, data);
      totalSuccess += result.success;
      totalFailure += result.failure;
    }

    return { success: totalSuccess, failure: totalFailure };
  }
}
