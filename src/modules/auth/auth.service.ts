import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { UsersService } from '../users/users.service';

import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Register a new user with email and password
   */
  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, referralCode } = signupDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Validate referral code if provided
    let referredByUser: User | null = null;
    if (referralCode) {
      referredByUser = await this.prisma.user.findUnique({
        where: { referralCode },
      });

      if (!referredByUser) {
        // Log but don't fail - invalid referral codes are just ignored
        this.logger.warn(`Invalid referral code: ${referralCode}`);
      }
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(password);

    // Generate unique referral code for new user
    const newReferralCode = await this.generateUniqueReferralCode();

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim() || undefined,
        referralCode: newReferralCode,
        referredBy: referredByUser?.id,
      },
    });

    this.logger.log(`New user registered: ${user.email}`);

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(user);

    // Create session
    await this.tokenService.createSession(user.id, tokens.refreshToken);

    return this.buildAuthResponse(user, tokens);
  }

  /**
   * Login with email and password
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(user);

    // Create session
    await this.tokenService.createSession(user.id, tokens.refreshToken);

    this.logger.log(`User logged in: ${user.email}`);

    return this.buildAuthResponse(user, tokens);
  }

  /**
   * Logout user (invalidate current session)
   */
  async logout(userId: string): Promise<void> {
    // Delete the most recent session
    const session = await this.prisma.session.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (session) {
      await this.prisma.session.delete({
        where: { id: session.id },
      });
    }

    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    this.logger.log(`User logged out from all devices: ${userId}`);
  }

  /**
   * Refresh access and refresh tokens
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    // Validate refresh token and get session
    const { user, session } = await this.tokenService.validateRefreshToken(refreshToken);

    // Generate new tokens
    const tokens = await this.tokenService.generateTokens(user);

    // Rotate refresh token (delete old session, create new)
    await this.prisma.session.delete({
      where: { id: session.id },
    });

    await this.tokenService.createSession(user.id, tokens.refreshToken);

    this.logger.debug(`Tokens refreshed for user: ${user.email}`);

    return this.buildAuthResponse(user, tokens);
  }

  /**
   * Handle Google OAuth login/signup
   */
  async googleLogin(user: User): Promise<AuthResponseDto> {
    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(user);

    // Create session
    await this.tokenService.createSession(user.id, tokens.refreshToken);

    this.logger.log(`Google OAuth login: ${user.email}`);

    return this.buildAuthResponse(user, tokens);
  }

  /**
   * Validate user for JWT strategy
   */
  async validateUser(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, status: 'ACTIVE' },
    });

    return user;
  }

  /**
   * Generate a unique referral code
   */
  private async generateUniqueReferralCode(): Promise<string> {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
    const length = 8;

    let code: string;
    let exists = true;

    while (exists) {
      code = '';
      for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Check if code already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { referralCode: code },
      });

      exists = !!existingUser;
    }

    return code!;
  }

  /**
   * Build auth response
   */
  private buildAuthResponse(
    user: User,
    tokens: { accessToken: string; refreshToken: string },
  ): AuthResponseDto {
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
      expiresIn: 900, // 15 minutes in seconds
    };
  }
}
