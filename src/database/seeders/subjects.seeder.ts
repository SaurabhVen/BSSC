import { getDb } from '../drizzle';
import { subjects } from '../schema';
import { eq } from 'drizzle-orm';

const SUBJECTS = [
  'Zoology',
  'Botany',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Statistics',
  'Geology',
  'Entomology',
  'Economics',
  'Commerce',
  'Dairy Technology',
  'Dairy Science',
  'Fisheries Science',
  'Pharmacy',
  'Pharmaceutical Chemistry',
  'Ayurveda',
  'Pharmaceutics',
  'Hindi',
  'English',
  'Sanskrit',
  'Urdu',
  'Santhali',
  'Bengali',
  'Mundari (Horo)',
  'Ho',
  'Khadiya',
  'Kudukh (Oraon)',
  'Kurmali',
  'Khortha',
  'Nagpuri',
  'Panchpargania',
  'Odia',
  'General Studies',
  'General Mathematics',
  'General Science',
  'Biology',
  'Dairy Engineering',
  'Computer Programming',
];

export const seedSubjects = async (
  userId: number = 1
): Promise<{ inserted: string[]; skipped: string[] }> => {
  const db = getDb();
  console.log(' Seeding subjects...');

  const inserted: string[] = [];
  const skipped: string[] = [];

  for (const subjectName of SUBJECTS) {
    const existing = await db
      .select()
      .from(subjects)
      .where(eq(subjects.subjectName, subjectName))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(subjects).values({
        subjectName: subjectName,
      });
      inserted.push(subjectName);
      console.log(`  Created subject: ${subjectName}`);
    } else {
      skipped.push(subjectName);
      console.log(`  Subject already exists: ${subjectName}`);
    }
  }

  console.log(
    ` Subjects seeding complete (inserted: ${inserted.length}, skipped: ${skipped.length})`
  );
  return { inserted, skipped };
};

export default seedSubjects;
