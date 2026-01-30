import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlogFilterDto, BlogSortBy } from './dto/blog-filter.dto';
import { CreateBlogDto } from './dto/create-blog.dto';

@Injectable()
export class BlogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get blog feed with filters
   */
  async getBlogFeed(filters: BlogFilterDto) {
    const { hobbyCategoryId, sortBy = BlogSortBy.MOST_RECENT, page = 1, limit = 20 } = filters;

    const where: any = {
      moderationStatus: 'APPROVED', // Only show approved blogs
      isPublished: true,
    };

    if (hobbyCategoryId) {
      where.hobbyCategoryId = hobbyCategoryId;
    }

    // Determine order by
    let orderBy: any = { createdAt: 'desc' }; // Default: most recent
    if (sortBy === BlogSortBy.MOST_LIKED) {
      orderBy = { likesCount: 'desc' };
    } else if (sortBy === BlogSortBy.MOST_COMMENTED) {
      orderBy = { commentsCount: 'desc' };
    }

    const blogs = await this.prisma.blogPost.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        hobbyCategory: true,
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.blogPost.count({ where });

    return {
      ok: true,
      data: blogs.map((b) => ({
        id: b.id,
        title: b.title,
        excerpt: b.excerpt || b.content.substring(0, 150) + '...',
        coverImageUrl: b.coverImageUrl || b.coverImage,
        author: b.author,
        hobbyCategory: b.hobbyCategory,
        likesCount: b.likesCount || b.likeCount,
        commentsCount: b.commentsCount || b.commentCount,
        createdAt: b.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get blog post details
   */
  async getBlogDetails(blogId: string, currentUserId?: string) {
    const blog = await this.prisma.blogPost.findUnique({
      where: { id: blogId },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        hobbyCategory: true,
      },
    });

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    // Increment view count
    await this.prisma.blogPost.update({
      where: { id: blogId },
      data: {
        viewCount: { increment: 1 },
        viewsCount: { increment: 1 },
      },
    });

    // Check if current user liked it
    let likedByMe = false;
    if (currentUserId) {
      const like = await this.prisma.blogLike.findUnique({
        where: {
          postId_userId: { postId: blogId, userId: currentUserId },
        },
      });
      likedByMe = !!like;
    }

    return {
      ok: true,
      data: {
        ...blog,
        likesCount: blog.likesCount || blog.likeCount,
        commentsCount: blog.commentsCount || blog.commentCount,
        viewsCount: blog.viewsCount || blog.viewCount,
        likedByMe,
      },
    };
  }

  /**
   * Create a new blog post
   */
  async createBlog(authorId: string, dto: CreateBlogDto) {
    // Generate slug from title
    const baseSlug = dto.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Add timestamp to make slug unique
    const slug = `${baseSlug}-${Date.now()}`;

    // Basic content sanitization (in production, use DOMPurify or similar)
    const sanitizedContent = dto.content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '');

    const blog = await this.prisma.blogPost.create({
      data: {
        authorId,
        title: dto.title,
        slug,
        content: sanitizedContent,
        excerpt: sanitizedContent.substring(0, 150),
        coverImage: dto.coverImageUrl,
        coverImageUrl: dto.coverImageUrl,
        hobbyCategoryId: dto.hobbyCategoryId,
        language: dto.language,
        moderationStatus: 'PENDING', // Requires approval
        moderation: 'PENDING',
        isPublished: true, // Auto-publish (moderation still applies)
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return {
      ok: true,
      data: blog,
    };
  }

  /**
   * Toggle like on a blog post
   */
  async toggleLike(userId: string, blogId: string) {
    // Check blog exists
    const blog = await this.prisma.blogPost.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    // Check if already liked
    const existing = await this.prisma.blogLike.findUnique({
      where: {
        postId_userId: { postId: blogId, userId },
      },
    });

    if (existing) {
      // Unlike
      await this.prisma.blogLike.delete({
        where: { id: existing.id },
      });

      await this.prisma.blogPost.update({
        where: { id: blogId },
        data: {
          likeCount: { decrement: 1 },
          likesCount: { decrement: 1 },
        },
      });

      const updatedBlog = await this.prisma.blogPost.findUnique({
        where: { id: blogId },
      });

      return {
        ok: true,
        liked: false,
        likesCount: updatedBlog?.likesCount || updatedBlog?.likeCount || 0,
      };
    } else {
      // Like
      await this.prisma.blogLike.create({
        data: { userId, postId: blogId },
      });

      await this.prisma.blogPost.update({
        where: { id: blogId },
        data: {
          likeCount: { increment: 1 },
          likesCount: { increment: 1 },
        },
      });

      const updatedBlog = await this.prisma.blogPost.findUnique({
        where: { id: blogId },
      });

      return {
        ok: true,
        liked: true,
        likesCount: updatedBlog?.likesCount || updatedBlog?.likeCount || 0,
      };
    }
  }

  /**
   * Add comment to a blog post
   */
  async addComment(authorId: string, blogId: string, text: string) {
    // Check blog exists
    const blog = await this.prisma.blogPost.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    const comment = await this.prisma.blogComment.create({
      data: {
        authorId,
        postId: blogId,
        content: text,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Increment comment count
    await this.prisma.blogPost.update({
      where: { id: blogId },
      data: {
        commentCount: { increment: 1 },
        commentsCount: { increment: 1 },
      },
    });

    return {
      ok: true,
      data: comment,
    };
  }

  /**
   * Get blog comments
   */
  async getComments(blogId: string, page: number = 1, limit: number = 20) {
    // Check blog exists
    const blog = await this.prisma.blogPost.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    const comments = await this.prisma.blogComment.findMany({
      where: { postId: blogId },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.blogComment.count({ where: { postId: blogId } });

    return {
      ok: true,
      data: comments,
      meta: {
        page,
        limit,
        total,
      },
    };
  }
}
