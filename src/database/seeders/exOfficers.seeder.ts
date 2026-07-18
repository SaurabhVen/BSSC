import { getDb } from '../drizzle';
import { typeOfExOfficers } from '../schema';
import { sql } from 'drizzle-orm';

export const seedTypeOfExOfficers = async (): Promise<void> => {
  const db = getDb();
  console.log(' Seeding type_of_ex_officers...');
  await db.execute(sql`
    INSERT INTO "type_of_ex_officers" ("id", "name")
    VALUES 
      (1, 'commissiononed officer'),
      (2, 'militey officer')
    ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name";
  `);
  console.log(' Seeding type_of_ex_officers completed');
};
