import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding hobby categories...');

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
    const created = await prisma.hobbyCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });

    console.log(`Created category: ${category.name}`);

    const hobbies = hobbiesByCategory[category.slug] || [];
    for (const hobbyName of hobbies) {
      const hobbySlug = `${category.slug}-${hobbyName.toLowerCase().replace(/\s+/g, '-')}`;
      await prisma.hobby.upsert({
        where: { slug: hobbySlug },
        update: {},
        create: {
          categoryId: created.id,
          name: hobbyName,
          slug: hobbySlug,
        },
      });
    }
    console.log(`  Created ${hobbies.length} hobbies`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
