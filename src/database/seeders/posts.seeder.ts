import { getDb } from '../drizzle';
import { posts } from '../schema';
import { eq } from 'drizzle-orm';

const POSTS_DATA = [
  { postCode: '1', postName: 'Assistant Entomologist, VBDCP' },
  { postCode: '4', postName: 'Block Statics Supervisor' },
  { postCode: '5', postName: 'Dairy Technical Officer' },
  { postCode: '6', postName: 'Fisheries Extension Supervisor' },
  { postCode: '7', postName: 'Auditor' },
  { postCode: '9', postName: 'Lab Assistant (Physics)' },
  { postCode: '10', postName: 'Lab Assistant (Chemistry)' },
];

export const seedPostsRelatedData = async (): Promise<void> => {
  const db = getDb();
  console.log(' Seeding BSSC job posts (code and name only)...');

  for (const p of POSTS_DATA) {
    const existing = await db.select().from(posts).where(eq(posts.postCode, p.postCode)).limit(1);

    if (existing.length === 0) {
      await db.insert(posts).values({
        postCode: p.postCode,
        postName: p.postName,
      });
      console.log(`  Created post: [${p.postCode}] ${p.postName}`);
    } else {
      await db.update(posts).set({ postName: p.postName }).where(eq(posts.postCode, p.postCode));
      console.log(`  Post already exists, updated name: [${p.postCode}]`);
    }
  }

  console.log(' BSSC posts seeding complete!');
};

export default seedPostsRelatedData;
