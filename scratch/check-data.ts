import { getDb, closeDb } from '../src/database/drizzle';
import { educations } from '../src/database/schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Connecting to database...');

  try {
    const allEd = await db.select().from(educations);
    console.log(`\n=== Educations Table (Total Rows: ${allEd.length}) ===`);
    allEd.forEach((ed) => {
      console.log(`ID: ${ed.eduId} | UserID: ${ed.eduUserId} | Name: ${ed.eduName}`);
    });
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(closeDb);
