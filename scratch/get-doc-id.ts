import { getDb, closeDb } from '../src/database/drizzle';
import { documents } from '../src/database/schema';

async function main() {
  const db = getDb();
  try {
    const docRows = await db.select().from(documents).limit(5);
    console.log('Documents in DB:');
    console.log(JSON.stringify(docRows, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await closeDb();
  }
}
main();
