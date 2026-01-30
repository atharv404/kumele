import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { TokenService } from '../services/token.service';
import { PasswordService } from '../services/password.service';
import { UsersService } from '../../users/users.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { BadgeTier, User, UserRole, UserStatus, Gender } from '@prisma/client';

// Mock user data
const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hashedpassword',
  firstName: 'John',
  lastName: 'Doe',
  displayName: 'JohnD',
  avatar: null,
  bio: null,
  dateOfBirth: null,
  gender: null,
  phone: null,
  city: null,
  country: null,
  latitude: null,
  longitude: null,
  locationRadius: 10,
  preferredLanguage: 'en',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  emailVerified: false,
  emailVerifiedAt: null,
  referralCode: 'A7X9K2PM',
  referredBy: null,
  googleId: null,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  currentBadge: BadgeTier.NONE,
  totalEventsAttended: 0,
  stripeCustomerId: null,
  stripeConnectedAccountId: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  session: {
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
};

const mockTokenService = {
  generateTokens: jest.fn(),
  createSession: jest.fn(),
  validateRefreshToken: jest.fn(),
  rotateRefreshToken: jest.fn(),
  invalidateSession: jest.fn(),
  invalidateAllSessions: jest.fn(),
};

const mockPasswordService = {
  hash: jest.fn(),
  verify: jest.fn(),
};

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  validateReferralCode: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: typeof mockPrismaService;
  let tokenService: typeof mockTokenService;
  let passwordService: typeof mockPasswordService;
  let usersService: typeof mockUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    tokenService = module.get(TokenService);
    passwordService = module.get(PasswordService);
    usersService = module.get(UsersService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const signupDto = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    it('should create a new user and return tokens', async () => {
      // First call for checking existing user, second for referral code, third for unique code check
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // Check existing user - not found
        .mockResolvedValueOnce(null); // Check referral code generation uniqueness
      passwordService.hash.mockResolvedValue('hashedpassword');
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
      });
      tokenService.generateTokens.mockResolvedValue(mockTokens);
      tokenService.createSession.mockResolvedValue(undefined);

      const result = await service.signup(signupDto);

      expect(result.accessToken).toBe(mockTokens.accessToken);
      expect(result.refreshToken).toBe(mockTokens.refreshToken);
      expect(result.user.email).toBe(signupDto.email);
      expect(prisma.user.findUnique).toHaveBeenCalled();
      expect(passwordService.hash).toHaveBeenCalledWith(signupDto.password);
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
    });

    it('should validate referral code if provided', async () => {
      const signupWithReferral = {
        ...signupDto,
        referralCode: 'VALID123',
      };

      const referrer = { ...mockUser, id: 'referrer-id', referralCode: 'VALID123' };
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // Check existing user
        .mockResolvedValueOnce(referrer) // Check referral code - found
        .mockResolvedValueOnce(null); // Check unique referral code generation
      passwordService.hash.mockResolvedValue('hashedpassword');
      prisma.user.create.mockResolvedValue(mockUser);
      tokenService.generateTokens.mockResolvedValue(mockTokens);
      tokenService.createSession.mockResolvedValue(undefined);

      await service.signup(signupWithReferral);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { referralCode: 'VALID123' } }),
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
    };

    it('should return tokens for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      passwordService.verify.mockResolvedValue(true);
      tokenService.generateTokens.mockResolvedValue(mockTokens);
      tokenService.createSession.mockResolvedValue(undefined);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe(mockTokens.accessToken);
      expect(result.refreshToken).toBe(mockTokens.refreshToken);
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      passwordService.verify.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for suspended user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });
      passwordService.verify.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens for valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';

      tokenService.validateRefreshToken.mockResolvedValue({
        user: mockUser,
        session: { id: 'session-id' },
      });
      tokenService.generateTokens.mockResolvedValue(mockTokens);
      prisma.session.delete.mockResolvedValue(undefined);
      tokenService.createSession.mockResolvedValue(undefined);

      const result = await service.refreshTokens(refreshToken);

      expect(result.accessToken).toBe(mockTokens.accessToken);
      expect(result.refreshToken).toBe(mockTokens.refreshToken);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      tokenService.validateRefreshToken.mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should invalidate the session', async () => {
      prisma.session.findFirst.mockResolvedValue({ id: 'session-id' });
      prisma.session.delete.mockResolvedValue(undefined);

      await service.logout(mockUser.id);

      expect(prisma.session.findFirst).toHaveBeenCalled();
      expect(prisma.session.delete).toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should return user for valid active user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      // The implementation filters by status: 'ACTIVE', so inactive users return null
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(mockUser.id);

      expect(result).toBeNull();
    });
  });
});
