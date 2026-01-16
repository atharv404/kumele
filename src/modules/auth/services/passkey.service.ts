import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { User } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { TokenService } from './token.service';
import { PasskeyLoginFinishDto, PasskeyRegistrationFinishDto } from '../dto/passkey.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class PasskeyService {
  private readonly logger = new Logger(PasskeyService.name);
  private readonly rpName: string;
  private readonly rpID: string;
  private readonly origin: string;
  private readonly challengeTTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.rpName = this.configService.get<string>('WEBAUTHN_RP_NAME', 'Kumele');
    this.rpID = this.configService.get<string>('WEBAUTHN_RP_ID', 'localhost');
    this.origin = this.configService.get<string>('WEBAUTHN_ORIGIN', 'http://localhost:3000');
  }

  /**
   * Generate registration options for creating a new passkey
   */
  async generateRegistrationOptions(
    user: User,
    deviceName?: string,
  ) {
    // Get existing credentials to exclude
    const existingCredentials = await this.prisma.passkeyCredential.findMany({
      where: { userId: user.id },
      select: { credentialId: true, transports: true },
    });

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: user.email,
      userDisplayName: user.displayName || user.email,
      attestationType: 'none', // We don't need attestation for most use cases
      excludeCredentials: existingCredentials.map(cred => ({
        id: cred.credentialId.toString('base64url'),
        transports: cred.transports as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Prefer platform authenticators (Face ID, Windows Hello)
      },
      timeout: 60000, // 60 seconds
    });

    // Store challenge in Redis with TTL
    const challengeKey = `passkey:registration:${user.id}`;
    await this.cacheManager.set(
      challengeKey,
      JSON.stringify({
        challenge: options.challenge,
        deviceName: deviceName || 'Unknown Device',
      }),
      this.challengeTTL,
    );

    this.logger.debug(`Registration options generated for user: ${user.email}`);

    return options;
  }

  /**
   * Verify registration response and save passkey
   */
  async verifyRegistrationResponse(
    user: User,
    dto: PasskeyRegistrationFinishDto,
  ): Promise<{ success: boolean; credentialId: string }> {
    // Retrieve challenge from Redis
    const challengeKey = `passkey:registration:${user.id}`;
    const storedData = await this.cacheManager.get<string>(challengeKey);

    if (!storedData) {
      throw new BadRequestException('Registration challenge expired or not found');
    }

    const { challenge, deviceName } = JSON.parse(storedData);

    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: dto.response as unknown as RegistrationResponseJSON,
        expectedChallenge: challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
      });
    } catch (error) {
      this.logger.error(`Registration verification failed: ${(error as Error).message}`);
      throw new BadRequestException('Invalid registration response');
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Registration verification failed');
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Save passkey to database
    await this.prisma.passkeyCredential.create({
      data: {
        userId: user.id,
        credentialId: Buffer.from(credential.id, 'base64url'),
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        deviceType: credentialDeviceType,
        deviceName,
        transports: (dto.response.response.transports || []) as string[],
      },
    });

    // Delete challenge from Redis
    await this.cacheManager.del(challengeKey);

    this.logger.log(`Passkey registered for user: ${user.email}, device: ${deviceName}`);

    return {
      success: true,
      credentialId: Buffer.from(credential.id).toString('base64url'),
    };
  }

  /**
   * Generate authentication options for passkey login
   */
  async generateAuthenticationOptions(email: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user's passkeys
    const credentials = await this.prisma.passkeyCredential.findMany({
      where: { userId: user.id },
      select: { credentialId: true, transports: true },
    });

    if (credentials.length === 0) {
      throw new BadRequestException('No passkeys registered for this account');
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: credentials.map(cred => ({
        id: cred.credentialId.toString('base64url'),
        transports: cred.transports as AuthenticatorTransportFuture[],
      })),
      userVerification: 'preferred',
      timeout: 60000, // 60 seconds
    });

    // Store challenge in Redis with TTL
    const challengeKey = `passkey:authentication:${user.id}`;
    await this.cacheManager.set(
      challengeKey,
      JSON.stringify({
        challenge: options.challenge,
        userId: user.id,
      }),
      this.challengeTTL,
    );

    this.logger.debug(`Authentication options generated for user: ${user.email}`);

    return options;
  }

  /**
   * Verify authentication response and return tokens
   */
  async verifyAuthenticationResponse(dto: PasskeyLoginFinishDto): Promise<AuthResponseDto> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Retrieve challenge from Redis
    const challengeKey = `passkey:authentication:${user.id}`;
    const storedData = await this.cacheManager.get<string>(challengeKey);

    if (!storedData) {
      throw new BadRequestException('Authentication challenge expired or not found');
    }

    const { challenge } = JSON.parse(storedData);

    // Find the credential being used
    const credentialIdBuffer = Buffer.from(dto.response.id, 'base64url');
    const credential = await this.prisma.passkeyCredential.findFirst({
      where: {
        userId: user.id,
        credentialId: credentialIdBuffer,
      },
    });

    if (!credential) {
      throw new UnauthorizedException('Passkey not found');
    }

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response: dto.response as unknown as AuthenticationResponseJSON,
        expectedChallenge: challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        credential: {
          id: credential.credentialId.toString('base64url'),
          publicKey: new Uint8Array(credential.publicKey),
          counter: Number(credential.counter),
          transports: credential.transports as AuthenticatorTransportFuture[],
        },
      });
    } catch (error) {
      this.logger.error(`Authentication verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid passkey');
    }

    if (!verification.verified) {
      throw new UnauthorizedException('Passkey verification failed');
    }

    // Update counter to prevent replay attacks
    await this.prisma.passkeyCredential.update({
      where: { id: credential.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    // Delete challenge from Redis
    await this.cacheManager.del(challengeKey);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(user);

    // Create session
    await this.tokenService.createSession(user.id, tokens.refreshToken);

    this.logger.log(`Passkey authentication successful for user: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 900, // 15 minutes
    };
  }

  /**
   * Get user's registered passkeys
   */
  async getUserPasskeys(userId: string) {
    const credentials = await this.prisma.passkeyCredential.findMany({
      where: { userId },
      select: {
        id: true,
        deviceType: true,
        deviceName: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return credentials;
  }

  /**
   * Delete a passkey
   */
  async deletePasskey(userId: string, credentialId: string): Promise<void> {
    await this.prisma.passkeyCredential.deleteMany({
      where: {
        id: credentialId,
        userId,
      },
    });

    this.logger.log(`Passkey deleted: ${credentialId} for user: ${userId}`);
  }
}
