import { Test, TestingModule } from '@nestjs/testing';
import { UsersService, ProfileCompleteness, RewardStatus } from '../users.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { BadgeTier, User, UserRole, UserStatus, Gender } from '@prisma/client';

// Mock user data
const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  passwordHash: 'hashedpassword',
  firstName: 'John',
  lastName: 'Doe',
  displayName: 'JohnD',
  avatar: 'https://example.com/avatar.jpg',
  bio: 'Test bio',
  dateOfBirth: new Date('1990-01-15'),
  gender: Gender.MALE,
  phone: '+1234567890',
  city: 'New York',
  country: 'USA',
  latitude: 40.7128,
  longitude: -74.006,
  locationRadius: 10,
  preferredLanguage: 'en',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  emailVerifiedAt: new Date(),
  referralCode: 'A7X9K2PM',
  referredBy: null,
  googleId: null,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  currentBadge: BadgeTier.BRONZE,
  totalEventsAttended: 5,
  stripeCustomerId: null,
  stripeConnectedAccountId: null,
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  checkin: {
    count: jest.fn(),
  },
  rewardHistory: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should return null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('should return a user when found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getById(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateData = { firstName: 'Jane', lastName: 'Smith' };
      const updatedUser = { ...mockUser, ...updateData };

      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(mockUser.id, updateData);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: updateData,
      });
    });
  });

  describe('calculateProfileCompleteness', () => {
    it('should return 100% for complete profile', () => {
      const result: ProfileCompleteness =
        service.calculateProfileCompleteness(mockUser);

      expect(result.percentage).toBe(100);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should return correct percentage for incomplete profile', () => {
      const incompleteUser: User = {
        ...mockUser,
        avatar: null,
        bio: null,
        dateOfBirth: null,
      };

      const result: ProfileCompleteness =
        service.calculateProfileCompleteness(incompleteUser);

      expect(result.percentage).toBeLessThan(100);
      expect(result.missingFields).toContain('Profile Picture');
      expect(result.missingFields).toContain('Bio');
      expect(result.missingFields).toContain('Date of Birth');
    });

    it('should return 0% for minimal profile', () => {
      const minimalUser: User = {
        ...mockUser,
        firstName: null,
        lastName: null,
        displayName: null,
        avatar: null,
        bio: null,
        dateOfBirth: null,
        gender: null,
        city: null,
        country: null,
        latitude: null,
      };

      const result: ProfileCompleteness =
        service.calculateProfileCompleteness(minimalUser);

      expect(result.percentage).toBe(0);
      expect(result.missingFields).toHaveLength(10);
    });
  });

  describe('calculateRewardTier', () => {
    it('should return GOLD for 15+ events', async () => {
      prisma.checkin.count.mockResolvedValue(15);

      const result = await service.calculateRewardTier(mockUser.id);

      expect(result).toBe(BadgeTier.GOLD);
    });

    it('should return SILVER for 8-14 events', async () => {
      prisma.checkin.count.mockResolvedValue(10);

      const result = await service.calculateRewardTier(mockUser.id);

      expect(result).toBe(BadgeTier.SILVER);
    });

    it('should return BRONZE for 3-7 events', async () => {
      prisma.checkin.count.mockResolvedValue(5);

      const result = await service.calculateRewardTier(mockUser.id);

      expect(result).toBe(BadgeTier.BRONZE);
    });

    it('should return NONE for less than 3 events', async () => {
      prisma.checkin.count.mockResolvedValue(2);

      const result = await service.calculateRewardTier(mockUser.id);

      expect(result).toBe(BadgeTier.NONE);
    });
  });

  describe('getRewardStatus', () => {
    it('should return complete reward status', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.checkin.count.mockResolvedValue(5);
      prisma.rewardHistory.findMany.mockResolvedValue([
        { tier: BadgeTier.BRONZE, earnedAt: new Date() },
      ]);

      const result: RewardStatus = await service.getRewardStatus(mockUser.id);

      expect(result.currentTier).toBe(BadgeTier.BRONZE);
      expect(result.eventsAttendedLast30Days).toBe(5);
      expect(result.progressToNextTier.nextTier).toBe(BadgeTier.SILVER);
      expect(result.progressToNextTier.eventsNeeded).toBe(8);
      expect(result.progressToNextTier.eventsRemaining).toBe(3);
    });

    it('should return no next tier for GOLD users', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        currentBadge: BadgeTier.GOLD,
      });
      prisma.checkin.count.mockResolvedValue(20);
      prisma.rewardHistory.findMany.mockResolvedValue([]);

      const result: RewardStatus = await service.getRewardStatus(mockUser.id);

      expect(result.currentTier).toBe(BadgeTier.GOLD);
      expect(result.progressToNextTier.nextTier).toBeNull();
      expect(result.progressToNextTier.eventsRemaining).toBe(0);
    });
  });

  describe('validateReferralCode', () => {
    it('should return valid for existing referral code', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateReferralCode('A7X9K2PM');

      expect(result.valid).toBe(true);
      expect(result.referrerId).toBe(mockUser.id);
    });

    it('should return invalid for non-existent referral code', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateReferralCode('INVALID');

      expect(result.valid).toBe(false);
      expect(result.referrerId).toBeUndefined();
    });
  });

  describe('generateQRCode', () => {
    it('should generate a base64 QR code data URL', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.generateQRCode(mockUser.id);

      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.generateQRCode('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getReferrals', () => {
    it('should return list of referred users', async () => {
      const referrals = [
        { ...mockUser, id: 'ref1', email: 'ref1@example.com' },
        { ...mockUser, id: 'ref2', email: 'ref2@example.com' },
      ];
      prisma.user.findMany.mockResolvedValue(referrals);

      const result = await service.getReferrals(mockUser.id);

      expect(result).toHaveLength(2);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { referredBy: mockUser.id },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('countReferrals', () => {
    it('should return count of referred users', async () => {
      prisma.user.count.mockResolvedValue(5);

      const result = await service.countReferrals(mockUser.id);

      expect(result).toBe(5);
    });
  });
});
