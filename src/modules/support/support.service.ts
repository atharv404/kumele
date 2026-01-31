import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto, AddTicketReplyDto, UpdateTicketStatusDto, TicketPriority } from './dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new support ticket
   */
  async createTicket(userId: string, dto: CreateTicketDto) {
    const ticketNumber = await this.generateTicketNumber();

    const ticket = await this.prisma.supportTicketV2.create({
      data: {
        ticketNumber,
        userId,
        subject: dto.subject,
        description: dto.description,
        category: dto.category,
        priority: dto.priority || TicketPriority.MEDIUM,
        status: 'open',
        relatedEntityId: dto.relatedEntityId,
        relatedEntityType: dto.relatedEntityType,
        metadata: {},
        attachments: dto.attachmentUrls
          ? {
              create: dto.attachmentUrls.slice(0, 5).map((url, index) => ({
                url,
                fileName: `attachment_${index + 1}`,
                fileType: this.getFileTypeFromUrl(url),
                fileSize: 0,
              })),
            }
          : undefined,
      },
      include: {
        attachments: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: this.formatTicketResponse(ticket),
      message: 'Support ticket created successfully',
    };
  }

  /**
   * Get user's tickets with pagination
   */
  async getUserTickets(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
    },
  ) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 10, 50);
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options.status) {
      where.status = options.status;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicketV2.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          attachments: true,
        },
      }),
      this.prisma.supportTicketV2.count({ where }),
    ]);

    return {
      success: true,
      data: tickets.map((t) => this.formatTicketResponse(t)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single ticket details (user must own the ticket)
   */
  async getTicketDetails(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicketV2.findUnique({
      where: { id: ticketId },
      include: {
        attachments: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return {
      success: true,
      data: this.formatTicketResponse(ticket),
    };
  }

  /**
   * Add reply to a ticket (from user)
   */
  async addReply(userId: string, ticketId: string, dto: AddTicketReplyDto) {
    const ticket = await this.prisma.supportTicketV2.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    if (ticket.status === 'closed') {
      throw new BadRequestException('Cannot reply to a closed ticket');
    }

    // Store reply in metadata (or could use a separate replies table)
    const currentReplies = (ticket.metadata as any)?.replies || [];
    const newReply = {
      id: `reply_${Date.now()}`,
      message: dto.message,
      attachmentUrls: dto.attachmentUrls?.slice(0, 5) || [],
      createdAt: new Date().toISOString(),
      isAdmin: false,
      userId,
    };

    const updatedTicket = await this.prisma.supportTicketV2.update({
      where: { id: ticketId },
      data: {
        metadata: {
          ...((ticket.metadata as object) || {}),
          replies: [...currentReplies, newReply],
        },
        status: 'open', // Reopen if was waiting for user
        updatedAt: new Date(),
      },
      include: {
        attachments: true,
      },
    });

    return {
      success: true,
      data: this.formatTicketResponse(updatedTicket),
      message: 'Reply added successfully',
    };
  }

  /**
   * Close a ticket (user can close their own tickets)
   */
  async closeTicket(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicketV2.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    const updatedTicket = await this.prisma.supportTicketV2.update({
      where: { id: ticketId },
      data: {
        status: 'closed',
        resolvedAt: new Date(),
      },
    });

    return {
      success: true,
      data: this.formatTicketResponse(updatedTicket),
      message: 'Ticket closed successfully',
    };
  }

  // ============ ADMIN METHODS ============

  /**
   * Get all tickets (admin)
   */
  async getAllTickets(options: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    priority?: string;
    assigneeId?: string;
    search?: string;
  }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.status) {
      where.status = options.status;
    }
    if (options.category) {
      where.category = options.category;
    }
    if (options.priority) {
      where.priority = options.priority;
    }
    if (options.assigneeId) {
      where.assignedToId = options.assigneeId;
    }
    if (options.search) {
      where.OR = [
        { subject: { contains: options.search, mode: 'insensitive' } },
        { ticketNumber: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicketV2.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
        include: {
          attachments: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.supportTicketV2.count({ where }),
    ]);

    return {
      success: true,
      data: tickets.map((t) => this.formatTicketResponse(t)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get ticket details (admin)
   */
  async getTicketDetailsAdmin(ticketId: string) {
    const ticket = await this.prisma.supportTicketV2.findUnique({
      where: { id: ticketId },
      include: {
        attachments: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      success: true,
      data: this.formatTicketResponse(ticket),
    };
  }

  /**
   * Update ticket status (admin)
   */
  async updateTicketStatus(
    adminId: string,
    ticketId: string,
    dto: UpdateTicketStatusDto,
  ) {
    const ticket = await this.prisma.supportTicketV2.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const validStatuses = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
    if (!validStatuses.includes(dto.status)) {
      throw new BadRequestException('Invalid status');
    }

    const updateData: any = {
      status: dto.status,
      updatedAt: new Date(),
    };

    if (dto.status === 'resolved' || dto.status === 'closed') {
      updateData.resolvedAt = new Date();
    }

    // Store internal note in metadata
    if (dto.internalNote) {
      const currentNotes = (ticket.metadata as any)?.internalNotes || [];
      updateData.metadata = {
        ...((ticket.metadata as object) || {}),
        internalNotes: [
          ...currentNotes,
          {
            note: dto.internalNote,
            adminId,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }

    const updatedTicket = await this.prisma.supportTicketV2.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        attachments: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: this.formatTicketResponse(updatedTicket),
      message: 'Ticket status updated',
    };
  }

  /**
   * Assign ticket to admin/support agent
   */
  async assignTicket(adminId: string, ticketId: string, assigneeId: string) {
    const ticket = await this.prisma.supportTicketV2.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Verify assignee exists and is admin/moderator
    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (!assignee) {
      throw new NotFoundException('Assignee not found');
    }

    if (assignee.role !== 'ADMIN' && assignee.role !== 'MODERATOR') {
      throw new BadRequestException('Assignee must be an admin or moderator');
    }

    const updatedTicket = await this.prisma.supportTicketV2.update({
      where: { id: ticketId },
      data: {
        assignedToId: assigneeId,
        status: ticket.status === 'open' ? 'in_progress' : ticket.status,
        updatedAt: new Date(),
      },
      include: {
        attachments: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      data: this.formatTicketResponse(updatedTicket),
      message: `Ticket assigned to ${assignee.firstName} ${assignee.lastName}`,
    };
  }

  /**
   * Add admin reply to ticket
   */
  async addAdminReply(adminId: string, ticketId: string, dto: AddTicketReplyDto) {
    const ticket = await this.prisma.supportTicketV2.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const currentReplies = (ticket.metadata as any)?.replies || [];
    const newReply = {
      id: `reply_${Date.now()}`,
      message: dto.message,
      attachmentUrls: dto.attachmentUrls?.slice(0, 5) || [],
      createdAt: new Date().toISOString(),
      isAdmin: true,
      adminId,
    };

    const updatedTicket = await this.prisma.supportTicketV2.update({
      where: { id: ticketId },
      data: {
        metadata: {
          ...((ticket.metadata as object) || {}),
          replies: [...currentReplies, newReply],
        },
        status: 'waiting_user',
        updatedAt: new Date(),
      },
      include: {
        attachments: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      data: this.formatTicketResponse(updatedTicket),
      message: 'Reply sent to user',
    };
  }

  /**
   * Get support statistics
   */
  async getStatistics(options: { startDate?: Date; endDate?: Date }) {
    const where: any = {};
    if (options.startDate) {
      where.createdAt = { gte: options.startDate };
    }
    if (options.endDate) {
      where.createdAt = { ...where.createdAt, lte: options.endDate };
    }

    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      avgResolutionTime,
      ticketsByCategory,
      ticketsByPriority,
    ] = await Promise.all([
      this.prisma.supportTicketV2.count({ where }),
      this.prisma.supportTicketV2.count({ where: { ...where, status: 'open' } }),
      this.prisma.supportTicketV2.count({
        where: { ...where, status: { in: ['resolved', 'closed'] } },
      }),
      this.calculateAvgResolutionTime(where),
      this.prisma.supportTicketV2.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
      this.prisma.supportTicketV2.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
    ]);

    return {
      success: true,
      data: {
        totalTickets,
        openTickets,
        inProgressTickets: await this.prisma.supportTicketV2.count({
          where: { ...where, status: 'in_progress' },
        }),
        resolvedTickets,
        avgResolutionTimeHours: avgResolutionTime,
        ticketsByCategory: ticketsByCategory.map((c) => ({
          category: c.category,
          count: c._count,
        })),
        ticketsByPriority: ticketsByPriority.map((p) => ({
          priority: p.priority,
          count: p._count,
        })),
      },
    };
  }

  // ============ HELPER METHODS ============

  private async generateTicketNumber(): Promise<string> {
    const date = new Date();
    const prefix = `TKT${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.supportTicketV2.count({
      where: {
        ticketNumber: {
          startsWith: prefix,
        },
      },
    });
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
  }

  private getFileTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'webm'];
    const docExtensions = ['pdf', 'doc', 'docx', 'txt'];

    if (imageExtensions.includes(extension)) return 'image';
    if (videoExtensions.includes(extension)) return 'video';
    if (docExtensions.includes(extension)) return 'document';
    return 'other';
  }

  private formatTicketResponse(ticket: any) {
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      attachments: ticket.attachments?.map((a: any) => ({
        id: a.id,
        url: a.url,
        fileName: a.fileName,
        fileType: a.fileType,
      })),
      replies: (ticket.metadata as any)?.replies || [],
      user: ticket.user,
      assignedTo: ticket.assignedTo,
      relatedEntityId: ticket.relatedEntityId,
      relatedEntityType: ticket.relatedEntityType,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
    };
  }

  private async calculateAvgResolutionTime(where: any): Promise<number> {
    const resolvedTickets = await this.prisma.supportTicketV2.findMany({
      where: {
        ...where,
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    if (resolvedTickets.length === 0) return 0;

    const totalHours = resolvedTickets.reduce((sum, ticket) => {
      const diff =
        (ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
      return sum + diff;
    }, 0);

    return Math.round((totalHours / resolvedTickets.length) * 10) / 10;
  }
}
