import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { User, Session } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  type: 'access' | 'refresh';
  jti?: string; // JWT ID for refresh tokens
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate access and refresh token pair
   */
  async generateTokens(user: User): Promise<TokenPair> {
    const accessTokenPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    const refreshTokenPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
      jti: uuidv4(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessTokenPayload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<number>('JWT_ACCESS_EXPIRATION', 900), // 15 minutes
      }),
      this.jwtService.signAsync(refreshTokenPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<number>('JWT_REFRESH_EXPIRATION', 2592000), // 30 days
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Create a new session with hashed refresh token
   */
  async createSession(
    userId: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<Session> {
    // Hash the refresh token before storing
    const hashedRefreshToken = await this.hashToken(refreshToken);

    const expiresAt = new Date(
      Date.now() +
        this.configService.get<number>('JWT_REFRESH_EXPIRATION', 2592000) * 1000,
    );

    return this.prisma.session.create({
      data: {
        userId,
        refreshToken: hashedRefreshToken,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });
  }

  /**
   * Validate refresh token and return user with session
   */
  async validateRefreshToken(
    refreshToken: string,
  ): Promise<{ user: User; session: Session }> {
    // Verify JWT signature and expiration
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      this.logger.debug(`Invalid refresh token: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, status: 'ACTIVE' },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Find valid session with matching hashed token
    const sessions = await this.prisma.session.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
    });

    // Find the session that matches this refresh token
    let matchingSession: Session | null = null;
    for (const session of sessions) {
      const isMatch = await this.verifyToken(refreshToken, session.refreshToken);
      if (isMatch) {
        matchingSession = session;
        break;
      }
    }

    if (!matchingSession) {
      throw new UnauthorizedException('Session not found or expired');
    }

    return { user, session: matchingSession };
  }

  /**
   * Verify access token payload
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * Hash a token using argon2
   */
  private async hashToken(token: string): Promise<string> {
    return argon2.hash(token, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  /**
   * Verify a token against its hash
   */
  private async verifyToken(token: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, token);
    } catch {
      return false;
    }
  }

  /**
   * Clean up expired sessions (to be called by cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  }
}
