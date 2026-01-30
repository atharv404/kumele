import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

import { GoogleOAuthService } from '../services/google-oauth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly googleOAuthService: GoogleOAuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || 'placeholder';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || 'placeholder';
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || 
      `${configService.get<string>('APP_URL', 'http://localhost:3000')}/api/v1/auth/google/callback`;

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: false as const,
    });

    if (clientID === 'placeholder' || clientSecret === 'placeholder') {
      this.logger.warn('Google OAuth is not configured - Google login will be disabled');
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const user = await this.googleOAuthService.findOrCreateUser(profile);
      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
