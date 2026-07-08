import { getDb } from '../drizzle';
import { categories } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Category & Sub-Category definitions for BSSC.
 * Sub-categories use catParentId to reference the parent row.
 */

const CATEGORY_DATA = [
  {
    value: 'unreserved',
    label: 'UR (Unreserved)',
    subCategories: [],
  },
  {
    value: 'bc1',
    label: 'EBC-I',
    subCategories: [],
  },
  {
    value: 'bc2',
    label: 'OBC',
    subCategories: [],
  },
  {
    value: 'sc',
    label: 'Scheduled Caste (SC)',
    subCategories: [],
  },
  {
    value: 'st',
    label: 'Scheduled Tribe (ST)',
    subCategories: [
      {
        value: 'primitive',
        label: 'Primitive Tribe ',
        subCategories: [
          { value: 'asur', label: 'Asur' },
          { value: 'birhor', label: 'Birhor' },
          { value: 'birjia', label: 'Birjia (Birajia)' },
          { value: 'korwa', label: 'Korwa' },
          { value: 'mal_pahariya', label: 'Mal Pahariya' },
          { value: 'pahariya', label: 'Pahariya (Parhaiya/Baiga)' },
          { value: 'sauria_pahariya', label: 'Sauria Pahariya' },
          { value: 'savar', label: 'Savar (Savara)' },
        ],
      },
      {
        value: 'other',
        label: 'Other ST',
        subCategories: [],
      },
    ],
  },
  {
    value: 'ews',
    label: 'EWS',
    subCategories: [],
  },
];

export const seedCategories = async (
  userId: number = 1
): Promise<{ inserted: string[]; skipped: string[] }> => {
  const db = getDb();
  console.log(' Seeding categories & sub-categories...');

  const inserted: string[] = [];
  const skipped: string[] = [];

  const seedRecursive = async (categoriesData: any[], parentId: number | null, level: number) => {
    for (const cat of categoriesData) {
      const existing = await db
        .select()
        .from(categories)
        .where(eq(categories.catName, cat.label))
        .limit(1);

      let currentId: number;
      const indent = '  '.repeat(level + 1);

      if (existing.length === 0) {
        const result = await db
          .insert(categories)
          .values({
            catUserId: userId,
            catName: cat.label,
            catValue: cat.value,
            catParentId: parentId,
            catPublish: 1,
          })
          .returning();
        currentId = result[0].catId;
        inserted.push(cat.label);
        console.log(`${indent}Created category: ${cat.label}`);
      } else {
        currentId = existing[0].catId;
        skipped.push(cat.label);

        const needsUpdate =
          existing[0].catValue !== cat.value ||
          existing[0].catParentId !== parentId ||
          existing[0].catPublish !== 1;

        if (needsUpdate) {
          await db
            .update(categories)
            .set({
              catValue: cat.value,
              catParentId: parentId,
              catPublish: 1,
            })
            .where(eq(categories.catId, currentId));
          console.log(`${indent}Updated category: ${cat.label}`);
        } else {
          console.log(`${indent}Category already exists: ${cat.label}`);
        }
      }

      if (cat.subCategories && cat.subCategories.length > 0) {
        await seedRecursive(cat.subCategories, currentId, level + 1);
      }
    }
  };

  await seedRecursive(CATEGORY_DATA, null, 0);

  console.log(
    ` Categories seeding complete (inserted: ${inserted.length}, skipped: ${skipped.length})`
  );
  return { inserted, skipped };
};

export default seedCategories;
