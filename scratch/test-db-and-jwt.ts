import { getDb } from '../src/database/drizzle';
import { users, candidates } from '../src/database/schema';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Connecting to database...');
  try {
    const dbUsers = await db.select().from(users).limit(5);
    console.log('Users in DB:', dbUsers.map(u => ({ id: u.id, email: u.email })));

    const dbCandidates = await db.select().from(candidates).limit(5);
    console.log('Candidates in DB:', dbCandidates.map(c => ({ id: c.id, userId: c.userId, registrationNumber: c.registrationNumber })));

    if (dbCandidates.length > 0) {
      const candidate = dbCandidates[0];
      const user = dbUsers.find(u => u.id === candidate.userId) || { email: 'candidate@example.com' };
      const secret = process.env.JWT_SECRET || 'c807e8068945233498906c2158e63747ab9cdc6f8146ed280a9b81b768f7867e';
      const token = jwt.sign(
        { sub: candidate.userId, email: user.email, 'cognito:groups': ['Candidates'] },
        secret,
        { expiresIn: 36000 }
      );
      console.log('Generated token for candidate:', candidate.id);
      console.log('Token:', token);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main().then(() => process.exit(0));
