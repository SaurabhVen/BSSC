import { getDb, closeDb } from '../src/database/drizzle';
import { categories } from '../src/database/schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Connecting to database...');

  try {
    const allCategories = await db.select().from(categories);

    console.log(`\n=== Categories Table (Total Rows: ${allCategories.length}) ===`);
    allCategories.forEach((cat) => {
      console.log(`ID: ${cat.catId} | Name: ${cat.catName} | Value: ${cat.catValue}`);
    });

  } catch (err: any) {
    console.error('Error querying database:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(closeDb);
