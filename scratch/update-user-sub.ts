import { getDb, closeDb } from '../src/database/drizzle';
import { users } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  const email = 'awanish@vensysco.in';
  const cognitoSubId = 'b1436d5a-7071-7063-b705-356ff3945c54';
  
  try {
    console.log(`Updating ${email} in local DB setting cognitoSubId = '${cognitoSubId}'...`);
    const result = await db.update(users)
      .set({ cognitoSubId })
      .where(eq(users.email, email))
      .returning();
      
    console.log('Update result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error updating DB:', (error as Error).message);
  } finally {
    await closeDb();
  }
}

main().catch(console.error);
