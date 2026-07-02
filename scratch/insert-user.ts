import { getDb, closeDb } from '../src/database/drizzle';
import { users, roles } from '../src/database/schema';
import { generateHash } from '../src/utils/crypto';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Connecting to database...');

  const targetEmail = 'alok.rai@vensysco.in'.toLowerCase();
  const cognitoSubId = '3fd42b64-ff77-41ff-8a1b-dae5cefd8975';
  const firstName = 'Alok';
  const lastName = 'rai';
  const plainPassword = 'Alok@1234';

  // 1. Ensure/get role 'admin'
  let roleRows = await db
    .select()
    .from(roles)
    .where(eq(roles.name, 'admin'))
    .limit(1);

  if (roleRows.length === 0) {
    console.log("Admin role not found. Creating it...");
    const [newRole] = await db.insert(roles).values({
      name: 'admin',
      description: 'System administrator with full access'
    }).returning();
    roleRows = [newRole];
  }

  const roleId = roleRows[0].id;

  // 2. Hash password
  const passwordHash = await generateHash(plainPassword);

  // 3. Check if user exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, targetEmail))
    .limit(1);

  if (existing.length > 0) {
    console.log(`User ${targetEmail} already exists. Updating attributes...`);
    await db
      .update(users)
      .set({
        cognitoSubId,
        passwordHash,
        firstName,
        lastName,
        roleId,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.email, targetEmail));
    console.log(`Successfully updated user: ${targetEmail}`);
  } else {
    console.log(`User ${targetEmail} does not exist. Inserting new user...`);
    await db.insert(users).values({
      email: targetEmail,
      cognitoSubId,
      passwordHash,
      firstName,
      lastName,
      roleId,
      isActive: true,
    });
    console.log(`Successfully created new user: ${targetEmail}`);
  }
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(closeDb);
