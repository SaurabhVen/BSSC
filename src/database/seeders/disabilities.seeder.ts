import { getDb } from '../drizzle';
import { disabilities } from '../schema';
import { eq } from 'drizzle-orm';

const DISABILITIES = [
  { code: 'vi', name: 'Visual Impairment' },
  { code: 'hi', name: 'Hearing Impairment' },
  { code: 'oh', name: 'Orthopedic Handicap' },
  {
    code: 'md/mud',
    name: ' Mental/multiple disability',
  },
];

export const seedDisabilities = async (): Promise<void> => {
  const db = getDb();
  console.log(' Seeding disabilities...');
  for (const disability of DISABILITIES) {
    const existing = await db
      .select()
      .from(disabilities)
      .where(eq(disabilities.code, disability.code))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(disabilities).values(disability);
      console.log(` Created disability: ${disability.code}`);
    } else {
      console.log(`  Disability already exists: ${disability.code}`);
    }
  }
  console.log(' Disabilities seeding complete');
};

export default seedDisabilities;
