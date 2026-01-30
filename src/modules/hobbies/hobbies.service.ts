import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HobbiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all hobby categories
   */
  async getCategories() {
    const categories = await this.prisma.hobbyCategory.findMany({
      where: { isActive: true },
      include: {
        hobbies: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      ok: true,
      data: categories,
    };
  }

  /**
   * Get hobbies by category
   */
  async getHobbiesByCategory(categoryId: string) {
    const hobbies = await this.prisma.hobby.findMany({
      where: {
        categoryId,
        isActive: true,
      },
      include: {
        category: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      ok: true,
      data: hobbies,
    };
  }

  /**
   * Get user's hobby preferences
   */
  async getUserHobbies(userId: string) {
    const userHobbies = await this.prisma.userHobby.findMany({
      where: { userId },
      include: {
        hobby: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return {
      ok: true,
      data: userHobbies,
    };
  }

  /**
   * Update user's hobby preferences
   */
  async updateUserHobbies(
    userId: string,
    hobbies: { hobbyId: string; skillLevel?: number; isPrimary?: boolean }[],
  ) {
    // Delete existing hobbies
    await this.prisma.userHobby.deleteMany({
      where: { userId },
    });

    // Create new hobbies
    if (hobbies.length > 0) {
      await this.prisma.userHobby.createMany({
        data: hobbies.map((h) => ({
          userId,
          hobbyId: h.hobbyId,
          skillLevel: h.skillLevel || null,
          isPrimary: h.isPrimary || false,
        })),
      });
    }

    return this.getUserHobbies(userId);
  }

  /**
   * Seed default hobby categories
   */
  async seedDefaultHobbies() {
    const defaultCategories = [
      { name: 'Sports', slug: 'sports', icon: '⚽', sortOrder: 1 },
      { name: 'Arts & Culture', slug: 'arts-culture', icon: '🎨', sortOrder: 2 },
      { name: 'Music', slug: 'music', icon: '🎵', sortOrder: 3 },
      { name: 'Gaming', slug: 'gaming', icon: '🎮', sortOrder: 4 },
      { name: 'Outdoor', slug: 'outdoor', icon: '🏕️', sortOrder: 5 },
      { name: 'Food & Drink', slug: 'food-drink', icon: '🍳', sortOrder: 6 },
      { name: 'Learning', slug: 'learning', icon: '📚', sortOrder: 7 },
      { name: 'Wellness', slug: 'wellness', icon: '🧘', sortOrder: 8 },
      { name: 'Technology', slug: 'technology', icon: '💻', sortOrder: 9 },
      { name: 'Social', slug: 'social', icon: '🎉', sortOrder: 10 },
    ];

    const hobbiesByCategory: Record<string, string[]> = {
      sports: ['Football', 'Basketball', 'Tennis', 'Running', 'Cycling', 'Swimming'],
      'arts-culture': ['Painting', 'Photography', 'Sculpture', 'Dance', 'Theater'],
      music: ['Guitar', 'Piano', 'Singing', 'DJ', 'Concert Going'],
      gaming: ['Video Games', 'Board Games', 'Card Games', 'Esports'],
      outdoor: ['Hiking', 'Camping', 'Rock Climbing', 'Fishing', 'Gardening'],
      'food-drink': ['Cooking', 'Wine Tasting', 'Coffee', 'Baking', 'Restaurant Exploring'],
      learning: ['Reading', 'Languages', 'History', 'Science', 'Workshops'],
      wellness: ['Yoga', 'Meditation', 'Fitness', 'Pilates', 'Martial Arts'],
      technology: ['Programming', 'AI', 'Robotics', 'Crypto', 'Startups'],
      social: ['Networking', 'Volunteering', 'Meetups', 'Dating', 'Travel'],
    };

    for (const category of defaultCategories) {
      const created = await this.prisma.hobbyCategory.upsert({
        where: { slug: category.slug },
        update: {},
        create: category,
      });

      const hobbies = hobbiesByCategory[category.slug] || [];
      for (const hobbyName of hobbies) {
        const hobbySlug = `${category.slug}-${hobbyName.toLowerCase().replace(/\s+/g, '-')}`;
        await this.prisma.hobby.upsert({
          where: { slug: hobbySlug },
          update: {},
          create: {
            categoryId: created.id,
            name: hobbyName,
            slug: hobbySlug,
          },
        });
      }
    }

    return {
      ok: true,
      message: 'Default hobbies seeded successfully',
    };
  }
}
