import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JoinStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventFilterDto } from './dto/event-filter.dto';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  /**
   * Create a new event
   */
  async createEvent(hostId: string, dto: CreateEventDto) {
    // Validate hobby category exists
    const hobbyCategory = await this.prisma.hobbyCategory.findUnique({
      where: { id: dto.hobbyCategoryId },
      include: { hobbies: { take: 1 } },
    });

    if (!hobbyCategory || !hobbyCategory.isActive) {
      throw new BadRequestException('Invalid hobby category');
    }

    // Validate time range
    const startTime = new Date(dto.eventStartTime);
    const endTime = new Date(dto.eventEndTime);
    const now = new Date();

    if (startTime <= now) {
      throw new BadRequestException('Event must start in the future');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('Event end time must be after start time');
    }

    // Validate pricing
    if (dto.isPaid && (!dto.basePriceEur || dto.basePriceEur <= 0)) {
      throw new BadRequestException('Paid events must have a valid price');
    }

    // Create event
    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        hostId,
        startsAt: startTime,
        endsAt: endTime,
        eventStartTime: startTime,
        eventEndTime: endTime,
        capacity: dto.capacity,
        isPaid: dto.isPaid,
        basePriceEur: dto.basePriceEur,
        price: dto.basePriceEur || 0,
        currency: 'EUR',
        currencyBase: 'EUR',
        latitude: dto.latitude,
        longitude: dto.longitude,
        displayAddress: dto.displayAddress,
        coverImage: dto.coverImage,
        status: 'ACTIVE', // Auto-activate
        hobbies: {
          create: {
            hobbyId: hobbyCategory.hobbies?.[0]?.id || dto.hobbyCategoryId,
          },
        },
      },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        hobbies: {
          include: {
            hobby: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    return {
      ok: true,
      data: event,
    };
  }

  /**
   * Get event details by ID
   */
  async getEventDetails(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        hobbies: {
          include: {
            hobby: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Calculate availability
    const isFull = event.currentCount >= event.capacity;
    const spotsRemaining = event.capacity - event.currentCount;
    const now = new Date();

    return {
      ok: true,
      data: {
        ...event,
        isFull,
        spotsRemaining,
        // Flags for consumers (matching, payments, attendance)
        flags: {
          isPaid: event.isPaid,
          isCancelled: event.isCancelled,
          isFull,
          isActive: event.status === 'ACTIVE',
          hasStarted: now >= (event.eventStartTime || event.startsAt),
          hasEnded: now >= (event.eventEndTime || event.endsAt),
        },
      },
    };
  }

  /**
   * List events with filtering
   */
  async listEvents(filters: EventFilterDto) {
    const {
      hobbyCategoryId,
      startAfter,
      startBefore,
      centerLat,
      centerLon,
      radiusKm,
      page = 1,
      limit = 20,
    } = filters;

    // Build where clause
    const where: any = {
      status: 'ACTIVE',
      isCancelled: false,
    };

    if (hobbyCategoryId) {
      where.hobbies = {
        some: {
          hobby: {
            categoryId: hobbyCategoryId,
          },
        },
      };
    }

    if (startAfter || startBefore) {
      where.startsAt = {};
      if (startAfter) where.startsAt.gte = new Date(startAfter);
      if (startBefore) where.startsAt.lte = new Date(startBefore);
    }

    // Get events
    const events = await this.prisma.event.findMany({
      where,
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        hobbies: {
          include: {
            hobby: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: { startsAt: 'asc' }, // Soonest first
      skip: (page - 1) * limit,
      take: limit,
    });

    // Filter by distance if location provided
    let filteredEvents = events;
    if (centerLat !== undefined && centerLon !== undefined && radiusKm) {
      filteredEvents = events.filter((event) => {
        const distance = this.calculateHaversineDistance(
          centerLat,
          centerLon,
          event.latitude,
          event.longitude,
        );
        return distance <= radiusKm;
      });
    }

    const total = await this.prisma.event.count({ where });

    return {
      ok: true,
      data: filteredEvents.map((e) => ({
        ...e,
        isFull: e.currentCount >= e.capacity,
        spotsRemaining: e.capacity - e.currentCount,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    };
  }

  /**
   * Join an event (triggers matching)
   */
  async joinEvent(userId: string, eventId: string) {
    // 1. Validate event
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        hobbies: {
          include: {
            hobby: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.isCancelled) {
      throw new BadRequestException('Event is cancelled');
    }

    if (event.currentCount >= event.capacity) {
      throw new BadRequestException('Event is full');
    }

    const eventStartTime = event.eventStartTime || event.startsAt;
    if (new Date() >= eventStartTime) {
      throw new BadRequestException('Event has already started');
    }

    // 2. Check existing participation
    const existing = await this.prisma.eventJoin.findUnique({
      where: {
        eventId_userId: { userId, eventId },
      },
    });

    if (existing && ['MATCHED', 'RESERVED', 'CONFIRMED', 'JOINED'].includes(existing.status)) {
      throw new BadRequestException('Already joined this event');
    }

    // 3. Get user profile for matching
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        hobbies: {
          include: { hobby: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 4. Trigger matching (AI + fallback)
    const matchResult = await this.performMatching(user, event);

    // 5. Create or update participation record
    const participationData = {
      userId,
      eventId,
      status: matchResult.decision === 'accept' ? JoinStatus.MATCHED : JoinStatus.REQUESTED,
      matchScore: matchResult.score,
      matchDecision: matchResult.decision,
      matchedAt: matchResult.decision === 'accept' ? new Date() : null,
      matchingMode: matchResult.mode,
      fallbackUsed: matchResult.fallbackUsed,
    };

    let participation;
    if (existing) {
      participation = await this.prisma.eventJoin.update({
        where: { id: existing.id },
        data: participationData,
      });
    } else {
      participation = await this.prisma.eventJoin.create({
        data: participationData as any,
      });
    }

    // 6. If matched and paid event, start payment window
    const paymentWindowMinutes = this.configService.get<number>('PAYMENT_WINDOW_MINUTES', 10);
    
    if (matchResult.decision === 'accept' && event.isPaid) {
      const paymentExpiresAt = new Date(Date.now() + paymentWindowMinutes * 60 * 1000);

      participation = await this.prisma.eventJoin.update({
        where: { id: participation.id },
        data: {
          status: JoinStatus.RESERVED,
          paymentWindowStart: new Date(),
          paymentExpiresAt,
        },
      });

      // Increment current count (temporary reservation)
      await this.prisma.event.update({
        where: { id: eventId },
        data: { currentCount: { increment: 1 } },
      });
    } else if (matchResult.decision === 'accept' && !event.isPaid) {
      // Free event - confirm immediately
      participation = await this.prisma.eventJoin.update({
        where: { id: participation.id },
        data: { status: 'CONFIRMED' },
      });

      await this.prisma.event.update({
        where: { id: eventId },
        data: { currentCount: { increment: 1 } },
      });
    }

    return {
      ok: true,
      data: {
        participationId: participation.id,
        status: participation.status,
        matchScore: matchResult.score,
        matchReasons: matchResult.reasons,
        paymentRequired: event.isPaid,
        paymentExpiresAt: participation.paymentExpiresAt,
      },
    };
  }

  /**
   * CRITICAL: Matching with MANDATORY fallback
   * If AI/ML is down, the platform must still function correctly [file:35][file:37]
   */
  private async performMatching(user: any, event: any) {
    const matchingMode = this.configService.get<string>('MATCHING_MODE', 'auto');

    let result: any = null;
    let fallbackUsed = false;

    // Try AI/ML matching first (if mode allows)
    if (matchingMode === 'ml' || matchingMode === 'auto') {
      try {
        const mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://ml-service:8000');
        const mlTimeout = this.configService.get<number>('ML_TIMEOUT_MS', 2000);

        // Dynamically import axios to avoid startup issues if not installed
        const axios = await import('axios').catch(() => null);
        
        if (axios) {
          const response = await axios.default.post(
            `${mlServiceUrl}/match`,
            {
              user: {
                id: user.id,
                hobbies: user.hobbies?.map((h: any) => h.hobby.id) || [],
                location: {
                  lat: user.latitude,
                  lon: user.longitude,
                },
              },
              event: {
                id: event.id,
                hobbyCategoryId: event.hobbies?.[0]?.hobby?.categoryId,
                location: {
                  lat: event.latitude,
                  lon: event.longitude,
                },
                startTime: event.eventStartTime || event.startsAt,
              },
            },
            { timeout: mlTimeout },
          );

          if (response.data && response.data.score !== undefined) {
            result = {
              score: response.data.score,
              decision: response.data.decision || (response.data.score >= 0.6 ? 'accept' : 'reject'),
              reasons: response.data.reasons || [],
              mode: 'ml',
              fallbackUsed: false,
            };
          }
        }
      } catch (error: any) {
        this.logger.warn(`ML matching failed, using fallback: ${error?.message || 'Unknown error'}`);
        // Fall through to fallback
      }
    }

    // Use fallback if ML failed or mode is fallback
    if (!result) {
      result = this.fallbackMatching(user, event);
      fallbackUsed = true;
    }

    return result;
  }

  /**
   * MANDATORY: Deterministic fallback matching [file:35][file:37]
   * Platform MUST function without AI/ML services
   */
  private fallbackMatching(user: any, event: any) {
    let score = 0;
    const reasons: string[] = [];

    // 1. Hobby match (30 points)
    const userHobbyIds = user.hobbies?.map((h: any) => h.hobby.id) || [];
    const eventHobbyIds = event.hobbies?.map((h: any) => h.hobby.id) || [];
    const eventCategoryIds = event.hobbies?.map((h: any) => h.hobby.categoryId) || [];
    
    const hasHobbyMatch = userHobbyIds.some((id: string) => 
      eventHobbyIds.includes(id) || eventCategoryIds.includes(id)
    );
    
    if (hasHobbyMatch) {
      score += 30;
      reasons.push('same_hobby');
    }

    // 2. Distance score (30 points)
    if (user.latitude && user.longitude) {
      const distance = this.calculateHaversineDistance(
        user.latitude,
        user.longitude,
        event.latitude,
        event.longitude,
      );

      const userRadius = user.locationRadius || 10;
      if (distance <= userRadius) {
        const proximityScore = (1 - distance / userRadius) * 30;
        score += proximityScore;
        reasons.push('nearby');
      }
    }

    // 3. Time score (20 points)
    const eventStartTimeRaw = event.eventStartTime || event.startsAt;
    const eventStartTime = eventStartTimeRaw ? new Date(eventStartTimeRaw) : null;
    
    if (eventStartTime) {
      const hoursUntilStart = (eventStartTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilStart <= 24) {
        score += 20;
        reasons.push('starting_soon');
      } else if (hoursUntilStart <= 72) {
        score += 10;
      } else {
        score += 5;
      }
    }

    // 4. Availability score (20 points)
    const fillRate = event.currentCount / event.capacity;
    if (fillRate < 0.8) {
      score += 20;
      reasons.push('spots_available');
    }

    // Normalize to 0-1 range
    const normalizedScore = Math.min(score / 100, 1);

    return {
      score: normalizedScore,
      decision: normalizedScore >= 0.5 ? 'accept' : 'reject',
      reasons,
      mode: 'fallback',
      fallbackUsed: true,
    };
  }

  /**
   * Get user attendance history
   */
  async getAttendanceHistory(userId: string) {
    const participations = await this.prisma.eventJoin.findMany({
      where: {
        userId,
        status: { in: ['CONFIRMED', 'ATTENDED', 'EXPIRED', 'CANCELLED', 'JOINED'] },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            eventStartTime: true,
            eventEndTime: true,
            displayAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ok: true,
      data: participations.map((p) => ({
        event: p.event,
        status: p.status,
        joinedAt: p.createdAt,
        cancelledAt: p.cancelledAt,
        cancelReason: p.cancelReason,
      })),
    };
  }

  /**
   * Cancel event (host only)
   */
  async cancelEvent(eventId: string, hostId: string, reason: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.hostId !== hostId) {
      throw new ForbiddenException('Only the host can cancel this event');
    }

    if (event.status === 'COMPLETED' || event.isCancelled) {
      throw new BadRequestException('Event already completed or cancelled');
    }

    // Cancel event
    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        isCancelled: true,
        cancelReason: reason,
        cancelledAt: new Date(),
        canceledAt: new Date(),
        status: 'CANCELED',
      },
    });

    // Cancel all participations
    await this.prisma.eventJoin.updateMany({
      where: { eventId },
      data: {
        status: 'CANCELLED',
        cancelledBy: 'host',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    // TODO: Trigger refund flow (Day 12)
    // TODO: Send notifications to participants

    return {
      ok: true,
      message: 'Event cancelled successfully',
    };
  }

  /**
   * Host QR scan check-in
   */
  async hostCheckin(eventId: string, hostId: string, guestUserId: string, note?: string) {
    // 1. Validate host
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.hostId !== hostId) {
      throw new ForbiddenException('Only the host can check in guests');
    }

    // 2. Validate check-in window
    const now = new Date();
    const eventStartTime = event.eventStartTime || event.startsAt;
    const eventEndTime = event.eventEndTime || event.endsAt;
    const windowBeforeMinutes = this.configService.get<number>('CHECKIN_WINDOW_BEFORE_MINUTES', 60);
    const windowAfterMinutes = this.configService.get<number>('CHECKIN_WINDOW_AFTER_MINUTES', 120);
    
    const windowStart = new Date(eventStartTime.getTime() - windowBeforeMinutes * 60 * 1000);
    const windowEnd = new Date(eventEndTime.getTime() + windowAfterMinutes * 60 * 1000);

    if (now < windowStart || now > windowEnd) {
      throw new BadRequestException('Check-in window not active');
    }

    // 3. Validate guest participation
    const participation = await this.prisma.eventJoin.findUnique({
      where: {
        eventId_userId: { userId: guestUserId, eventId },
      },
    });

    if (!participation || !['CONFIRMED', 'RESERVED', 'JOINED'].includes(participation.status)) {
      throw new BadRequestException('Guest not confirmed for this event');
    }

    // 4. Check if already checked in
    const existing = await this.prisma.checkin.findUnique({
      where: {
        eventId_userId: { eventId, userId: guestUserId },
      },
    });

    if (existing) {
      return {
        ok: true,
        message: 'Guest already checked in',
        data: existing,
      };
    }

    // 5. Create check-in record
    const checkin = await this.prisma.checkin.create({
      data: {
        eventId,
        userId: guestUserId,
        method: 'HOST_VERIFIED',
        status: 'HOST_VERIFIED',
        verifiedBy: hostId,
        scannedByHostId: hostId,
      },
    });

    // 6. Update participation status
    await this.prisma.eventJoin.update({
      where: { id: participation.id },
      data: { status: 'ATTENDED' },
    });

    return {
      ok: true,
      message: 'Guest checked in successfully',
      data: checkin,
    };
  }

  /**
   * Self check-in via GPS (≤2km)
   */
  async selfCheckin(eventId: string, userId: string, guestLat: number, guestLng: number) {
    // 1. Validate event
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // 2. Validate check-in window
    const now = new Date();
    const eventStartTime = event.eventStartTime || event.startsAt;
    const eventEndTime = event.eventEndTime || event.endsAt;
    const windowBeforeMinutes = this.configService.get<number>('CHECKIN_WINDOW_BEFORE_MINUTES', 60);
    const windowAfterMinutes = this.configService.get<number>('CHECKIN_WINDOW_AFTER_MINUTES', 120);
    
    const windowStart = new Date(eventStartTime.getTime() - windowBeforeMinutes * 60 * 1000);
    const windowEnd = new Date(eventEndTime.getTime() + windowAfterMinutes * 60 * 1000);

    if (now < windowStart || now > windowEnd) {
      throw new BadRequestException('Check-in window not active');
    }

    // 3. Validate participation
    const participation = await this.prisma.eventJoin.findUnique({
      where: {
        eventId_userId: { userId, eventId },
      },
    });

    if (!participation || !['CONFIRMED', 'RESERVED', 'JOINED'].includes(participation.status)) {
      throw new BadRequestException('You are not confirmed for this event');
    }

    // 4. Check if already checked in
    const existing = await this.prisma.checkin.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    if (existing) {
      return {
        ok: true,
        message: 'Already checked in',
        data: existing,
      };
    }

    // 5. Calculate distance (OpenStreetMap compatible)
    const distance = this.calculateHaversineDistance(
      guestLat,
      guestLng,
      event.latitude,
      event.longitude,
    );

    // 6. Validate ≤2km rule
    const maxDistance = this.configService.get<number>('CHECKIN_MAX_DISTANCE_KM', 2.0);
    if (distance > maxDistance) {
      return {
        ok: false,
        error: 'TOO_FAR',
        message: `You are ${distance.toFixed(2)}km away. Must be within ${maxDistance}km to check in.`,
        distance,
      };
    }

    // 7. Create check-in
    const checkin = await this.prisma.checkin.create({
      data: {
        eventId,
        userId,
        method: 'SELF_VERIFIED',
        status: 'SELF_VERIFIED',
        guestLat,
        guestLng,
        latitude: guestLat,
        longitude: guestLng,
        distanceKm: distance,
      },
    });

    // 8. Update participation
    await this.prisma.eventJoin.update({
      where: { id: participation.id },
      data: { status: 'ATTENDED' },
    });

    return {
      ok: true,
      message: 'Checked in successfully',
      data: {
        ...checkin,
        distance,
      },
    };
  }

  /**
   * Get event guest list (host only)
   */
  async getGuestList(eventId: string, hostId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.hostId !== hostId) {
      throw new ForbiddenException('Only the host can view the guest list');
    }

    const guests = await this.prisma.eventJoin.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const checkins = await this.prisma.checkin.findMany({
      where: { eventId },
    });

    const checkinUserIds = new Set(checkins.map((c) => c.userId));

    return {
      ok: true,
      data: guests.map((g) => ({
        user: g.user,
        status: g.status,
        joinedAt: g.createdAt,
        checkedIn: checkinUserIds.has(g.userId),
      })),
    };
  }

  /**
   * Haversine distance calculation (OpenStreetMap compatible)
   */
  calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Finalize match and create chat room
   * CRITICAL: Match FIRST, then create chat (Day 10)
   */
  async finalizeMatch(participationId: string, finalizedBy: string) {
    // 1. Get participation record
    const participation = await this.prisma.eventJoin.findUnique({
      where: { id: participationId },
      include: {
        event: true,
      },
    });

    if (!participation) {
      throw new NotFoundException('Participation not found');
    }

    // 2. Verify the finalizer is the host
    if (participation.event.hostId !== finalizedBy) {
      throw new ForbiddenException('Only the host can finalize matches');
    }

    // 3. Verify match exists (status must be MATCHED, RESERVED, or CONFIRMED)
    const validStatuses = ['MATCHED', 'RESERVED', 'CONFIRMED'];
    if (!validStatuses.includes(participation.status)) {
      throw new BadRequestException(
        `Cannot finalize match in ${participation.status} status`,
      );
    }

    // 4. Update participation with finalization
    await this.prisma.eventJoin.update({
      where: { id: participationId },
      data: {
        matchFinalizedAt: new Date(),
        matchFinalizedBy: finalizedBy,
      },
    });

    // 5. Create chat room AFTER match is finalized
    const chatRoom = await this.chatService.createEventChatRoom(participation.eventId);

    this.logger.log(`Match finalized for participation ${participationId}, chat room created`);

    return {
      ok: true,
      data: {
        participationId,
        matchFinalizedAt: new Date(),
        chatRoomId: chatRoom.id,
        chatClosesAt: chatRoom.closesAt,
      },
    };
  }

  /**
   * Auto-finalize all matched participants for an event (batch operation)
   * Called when host wants to confirm all matches at once
   */
  async finalizeAllMatches(eventId: string, hostId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.hostId !== hostId) {
      throw new ForbiddenException('Only the host can finalize matches');
    }

    // Get all matched/confirmed participants not yet finalized
    const participants = await this.prisma.eventJoin.findMany({
      where: {
        eventId,
        status: { in: ['MATCHED', 'RESERVED', 'CONFIRMED'] },
        matchFinalizedAt: null,
      },
    });

    // Finalize all
    await this.prisma.eventJoin.updateMany({
      where: {
        eventId,
        status: { in: ['MATCHED', 'RESERVED', 'CONFIRMED'] },
        matchFinalizedAt: null,
      },
      data: {
        matchFinalizedAt: new Date(),
        matchFinalizedBy: hostId,
      },
    });

    // Create chat room if we have finalized participants
    let chatRoom = null;
    if (participants.length > 0) {
      chatRoom = await this.chatService.createEventChatRoom(eventId);
    }

    this.logger.log(`Finalized ${participants.length} matches for event ${eventId}`);

    return {
      ok: true,
      data: {
        eventId,
        finalizedCount: participants.length,
        chatRoomId: chatRoom?.id,
        chatClosesAt: chatRoom?.closesAt,
      },
    };
  }

  /**
   * Check if user can access event chat
   */
  async canAccessChat(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return false;
    }

    // Host always has access
    if (event.hostId === userId) {
      return true;
    }

    // Check if user is a finalized participant
    const participation = await this.prisma.eventJoin.findFirst({
      where: {
        eventId,
        userId,
        matchFinalizedAt: { not: null },
        status: { in: ['MATCHED', 'CONFIRMED', 'ATTENDED'] },
      },
    });

    return !!participation;
  }
}
