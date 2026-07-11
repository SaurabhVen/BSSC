import dotenv from 'dotenv';
dotenv.config();
import { getDb } from '../src/database/drizzle';
import { users, roles, candidates } from '../src/database/schema';
import jwt from 'jsonwebtoken';
import config from '../src/config';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  const db = getDb();
  const email = 'awanish@vensysco.in';

  // Find or create role
  let candidateRole = await db.select().from(roles).where(eq(roles.name, 'candidate')).limit(1);
  let roleId: string;
  if (candidateRole.length === 0) {
    const newRole = await db.insert(roles).values({
      name: 'candidate',
      description: 'Candidate role',
    }).returning();
    roleId = newRole[0].id;
  } else {
    roleId = candidateRole[0].id;
  }

  // Find or create user
  let user = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let userId: string;

  if (user.length === 0) {
    console.log(`User ${email} not found. Creating user and candidate profile...`);
    const newUser = await db.insert(users).values({
      id: uuidv4(),
      email: email,
      firstName: 'Awanish',
      lastName: 'Vensysco',
      passwordHash: '$2a$10$UnFkQWua2vD8h1Jp9l2Ofe7XlB7g/D9aQ5jF5YtI32B7N5Xp5h6G.', // mock hash
      roleId: roleId,
      isActive: true,
    }).returning();
    userId = newUser[0].id;

    // Create candidate profile
    await db.insert(candidates).values({
      id: uuidv4(),
      userId: userId,
      mobileVerified: true,
      emailVerified: true,
    });

    console.log(`Created user ID: ${userId}`);
  } else {
    userId = user[0].id;
    console.log(`Found existing user ID: ${userId}`);
  }

  // Generate Token
  const token = jwt.sign(
    {
      sub: userId,
      email: email,
      'cognito:groups': ['Candidates']
    },
    config.JWT_SECRET,
    { expiresIn: '30d' }
  );

  console.log(`\n==================================================`);
  console.log(`Token for: ${email}`);
  console.log(`User ID: ${userId}`);
  console.log(`\nBearer Token:\n${token}`);
  console.log(`==================================================\n`);
}

main().catch(console.error);
