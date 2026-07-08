import { getDb, closeDb } from '../src/database/drizzle';
import { users } from '../src/database/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Connecting to database...');
  const db = getDb();
  try {
    console.log('Querying by cognitoSubId with a non-uuid string...');
    const result2 = await db.select().from(users).where(eq(users.cognitoSubId, 'not-a-uuid')).limit(1);
    console.log('Result 2:', JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error('Error during query:', error);
  } finally {
    await closeDb();
  }
}

main();
