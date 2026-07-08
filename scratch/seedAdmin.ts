import 'dotenv/config';
import { getDb, closeDb } from '../src/database/drizzle';
import { roles, users } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  const db = getDb();

  try {
    let [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin'));
    if (!adminRole) {
      const [newRole] = await db.insert(roles).values({
        id: uuidv4(),
        name: 'admin',
        description: 'Administrator Role',
      }).returning();
      adminRole = newRole;
      console.log('Created admin role:', adminRole.id);
    } else {
      console.log('Admin role already exists:', adminRole.id);
    }

    let [adminUser] = await db.select().from(users).where(eq(users.email, 'admin@bssc.in'));
    if (!adminUser) {
      const [newUser] = await db.insert(users).values({
        id: uuidv4(),
        email: 'admin@bssc.in',
        passwordHash: 'dummy',
        fullName: 'Admin User',
        roleId: adminRole.id,
        cognitoSubId: '91834d6a-d091-7093-7936-98c792b30a1f',
        isActive: true,
      }).returning();
      console.log('Created admin user:', newUser.id);
    } else {
      console.log('Admin user already exists:', adminUser.id);
      
      // Update cognitoSubId just in case
      await db.update(users).set({
        cognitoSubId: '91834d6a-d091-7093-7936-98c792b30a1f',
        roleId: adminRole.id
      }).where(eq(users.email, 'admin@bssc.in'));
      console.log('Updated existing admin user cognitoSubId.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await closeDb();
  }
}

main();
