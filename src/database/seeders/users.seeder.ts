import { getDb } from '../drizzle';
import { users, roles } from '../schema';
import { generateHash } from '../../utils/crypto';
import { eq } from 'drizzle-orm';

const SEED_USERS = [
  {
    email: 'admin@candidateportal.gov.in',
    password: 'Admin@12345',
    fullName: 'System Admin',
    roleName: 'admin',
  },
  {
    email: 'candidate@example.com',
    password: 'Candidate@12345',
    fullName: 'Test Candidate',
    roleName: 'candidate',
  },
];

export const seedUsers = async (): Promise<void> => {
  const db = getDb();
  console.log(' Seeding users...');

  for (const seedUser of SEED_USERS) {
    const existing = await db.select().from(users).where(eq(users.email, seedUser.email)).limit(1);

    if (existing.length > 0) {
      console.log(`  User already exists: ${seedUser.email}`);
      continue;
    }

    const roleRows = await db
      .select()
      .from(roles)
      .where(eq(roles.name, seedUser.roleName))
      .limit(1);

    if (roleRows.length === 0) {
      console.warn(`  Role not found for user ${seedUser.email}: ${seedUser.roleName}`);
      continue;
    }

    const passwordHash = await generateHash(seedUser.password);
    await db.insert(users).values({
      email: seedUser.email,
      passwordHash,
      fullName: seedUser.fullName,
      roleId: roleRows[0].id,
    });
    console.log(` Created user: ${seedUser.email}`);
  }
  console.log(' Users seeding complete');
};

export default seedUsers;
