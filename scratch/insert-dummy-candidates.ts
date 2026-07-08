import { getDb, closeDb } from '../src/database/drizzle';
import { users, roles, candidates, applications } from '../src/database/schema';
import { generateHash } from '../src/utils/crypto';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Connecting to database...');

  // 1. Get role 'candidate'
  let roleRows = await db
    .select()
    .from(roles)
    .where(eq(roles.name, 'candidate'))
    .limit(1);

  if (roleRows.length === 0) {
    console.log("Candidate role not found. Creating it...");
    const [newRole] = await db.insert(roles).values({
      name: 'candidate',
      description: 'Applicant filling the portal'
    }).returning();
    roleRows = [newRole];
  }

  const roleId = roleRows[0].id;
  const passwordHash = await generateHash('Dummy@12345');

  console.log('Inserting 10 dummy candidates...');
  
  const timestamp = Date.now();

  for (let i = 1; i <= 10; i++) {
    const email = `dummy.candidate.${timestamp}.${i}@example.com`.toLowerCase();
    const firstName = `DummyFirstName${i}`;
    const lastName = `DummyLastName${i}`;

    // 2. Insert User
    const [insertedUser] = await db.insert(users).values({
      email,
      passwordHash,
      fullName: `${firstName} ${lastName}`,
      roleId,
      isActive: true,
    }).returning();

    // 3. Insert Candidate
    const regNumber = `REG${String(timestamp).slice(-9)}${String(i).padStart(3, '0')}`;
    const dob = new Date(1996, (i % 12), 10 + i);
    const mobile = `9999000${String(i).padStart(3, '0')}`;

    const [insertedCandidate] = await db.insert(candidates).values({
      userId: insertedUser.id,
      registrationNumber: regNumber,
      dateOfBirth: dob,
      mobileNumber: mobile,
      mobileVerified: true,
      emailVerified: true,
    }).returning();

    console.log(`- Inserted User & Candidate ${i}: ${email} (Reg: ${regNumber})`);

    // 4. Insert Application (5 submitted, 5 draft)
    const isSubmitted = i <= 5;
    const status = isSubmitted ? 'submitted' : 'draft';
    const currentStep = isSubmitted ? 6 : 2;
    const completedSteps = isSubmitted ? [1, 2, 3, 4, 5, 6] : [1, 2];
    const appRefNum = isSubmitted ? `APP${String(timestamp).slice(-6)}${String(i).padStart(3, '0')}` : null;
    const submissionDate = isSubmitted ? new Date() : null;

    const [insertedApp] = await db.insert(applications).values({
      candidateId: insertedCandidate.id,
      status,
      currentStep,
      completedSteps,
      isSubmitted,
      applicationReferenceNumber: appRefNum,
      submissionDate,
    }).returning();

    console.log(`  Created Application: status=${status}, ref=${appRefNum || 'N/A'}`);
  }

  console.log('Successfully completed inserting 10 dummy candidates, users and applications.');
}

main()
  .catch((err) => {
    console.error('Error during execution:', err);
    process.exit(1);
  })
  .finally(closeDb);
