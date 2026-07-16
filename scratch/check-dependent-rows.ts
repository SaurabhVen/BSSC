import { getDb, closeDb } from '../src/database/drizzle';
import { users, candidates, applications } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Querying DB...');

  const user = await db.select().from(users).where(eq(users.email, 'shivam+32@vensysco.in')).limit(1);
  if (user.length === 0) {
    console.log('User not found.');
    return;
  }
  console.log('User:', user[0]);

  const candidate = await db.select().from(candidates).where(eq(candidates.userId, user[0].id)).limit(1);
  if (candidate.length === 0) {
    console.log('Candidate not found.');
    return;
  }
  console.log('Candidate:', candidate[0]);

  const app = await db.select().from(applications).where(eq(applications.candidateId, candidate[0].id));
  console.log('Applications:', app);
}

main().catch(console.error).finally(closeDb);
