import { getDb, closeDb } from '../src/database/drizzle';
import { candidateQualifications } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  const applicationId = '6592d00f-c1bb-40ea-96df-2452ecbdaa6f';

  try {
    const quals = await db
      .select()
      .from(candidateQualifications)
      .where(eq(candidateQualifications.applicationId, applicationId));

    console.log(`\n=== Qualifications for App ${applicationId} (Total: ${quals.length}) ===`);
    quals.forEach((q, i) => {
      console.log(
        `[Qual ${i + 1}] Level: ${q.level} | Degree: ${q.degree} | Board: ${q.boardUniversity} | Marks: ${q.marksObtained}/${q.totalMarks} (${q.percentage}%) | Year: ${q.passingYear}`
      );
    });
  } catch (err: any) {
    console.error('Error querying qualifications:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(closeDb);
