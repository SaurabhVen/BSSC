import { getDb } from '../src/database/drizzle';
import { users, roles } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function main() {
  const db = getDb();
  
  const email = 'alok.rai@vensysco.in';
  const cognitoSubId = '21234d1a-8081-7032-84e4-3fe17eb4a4f8';
  
  console.log('Inserting admin role if not exists...');
  let adminRoleId = '';
  const existingRoles = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);
  
  if (existingRoles.length === 0) {
    const insertedRole = await db.insert(roles).values({
      name: 'admin',
      description: 'System administrator with full access',
    }).returning();
    adminRoleId = insertedRole[0].id;
    console.log(`Created admin role with ID: ${adminRoleId}`);
  } else {
    adminRoleId = existingRoles[0].id;
    console.log(`Admin role found with ID: ${adminRoleId}`);
  }
  
  console.log(`Inserting/Updating user ${email} with admin role...`);
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let userId = '';
  
  if (existingUser.length === 0) {
    // Insert new user
    const insertedUser = await db.insert(users).values({
      email,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', // dummy hash
      firstName: 'Alok',
      lastName: 'Rai',
      roleId: adminRoleId,
      cognitoSubId: cognitoSubId,
      isActive: true,
    }).returning();
    userId = insertedUser[0].id;
    console.log(`Created admin user with local ID: ${userId}`);
  } else {
    // Update existing user to be admin
    userId = existingUser[0].id;
    await db.update(users).set({
      roleId: adminRoleId,
      cognitoSubId: cognitoSubId,
      isActive: true,
    }).where(eq(users.id, userId));
    console.log(`Updated existing user ${email} to admin.`);
  }
  
  // Generate JWT token
  const payload = {
    sub: userId,
    email: email,
    'cognito:groups': ['Admins'],
  };
  
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
  console.log(`\nJWT Token (expires in 30 days):\n${token}`);
}

main().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});
