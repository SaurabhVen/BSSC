import { getDb } from '../drizzle';
import { roles } from '../schema';
import { eq } from 'drizzle-orm';

const ROLES = [
  { name: 'admin', description: 'System administrator with full access' },
  { name: 'candidate', description: 'Applicant filling the portal' },
  { name: 'reviewer', description: 'Reviewer who validates applications' },
];

export const seedRoles = async (): Promise<void> => {
  const db = getDb();
  console.log(' Seeding roles...');
  for (const role of ROLES) {
    const existing = await db.select().from(roles).where(eq(roles.name, role.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(roles).values(role);
      console.log(` Created role: ${role.name}`);
    } else {
      console.log(`  Role already exists: ${role.name}`);
    }
  }
  console.log(' Roles seeding complete');
};

export default seedRoles;
