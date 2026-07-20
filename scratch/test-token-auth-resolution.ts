import jwt from 'jsonwebtoken';
import { getDb, closeDb } from '../src/database/drizzle';
import { users, roles } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function testResolution() {
  const token = 'eyJraWQiOiJVcHNWbTkrMVBDZUJRb3J1M3NrbEQ0My9TWFpsV3FSdm50ZGJlUXhPSFBBPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1MWEzNWQwYS01MDAxLTcwOTQtN2RiNi0wNjEyOWIyNzljNzQiLCJpc3MiOiJodHRwczovL2NvZ25pdG8taWRwLmFwLXNvdXRoLTEuYW1hem9uYXdzLmNvbS9hcC1zb3V0aC0xX25VVXBleE9GOCIsImNsaWVudF9pZCI6IjRrZDRuaThlYmhodTRsMHYzaXYwcmwycHJtIiwib3JpZ2luX2p0aSI6ImM3ZjkyMjQ4LTNjNDUtNGI1MS1hMDY4LWU3MTRjM2FlMTAxMSIsImV2ZW50X2lkIjoiM2JmOWJjYzgtMGRhMi00MzgyLWFkMWYtMGRjMjMzYzgzNDc2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc4NDIwNzMwMiwiZXhwIjoxNzg0MjEwOTAyLCJpYXQiOjE3ODQyMDczMDIsImp0aSI6ImRjZGI5NWQ4LThmYzItNDYzZS04YzFkLTA5NDc2ZDcyYjAzYyIsInVzZXJuYW1lIjoiYW5pbEB5b3BtYWlsLmNvbSJ9.MAblOFuLLGTzmkHAUGXblHNn1ECOZhnSDIxgmKCG6W3APC-7DQKn-wvndAzGYjVHnWO3y0yJOBPm6gBI0nUUYMByw2yk3Z5c64r_RaSZxwWFMJ9FdVvismjpEp4vL7JZFvuhBCWfD0pb3_sppMMG8TtD_9gSFIuKW3C2NCgpa4-ZHIeAaZ7SQz2FimR70dQhijM5znFgdyT80IZHslJioyHDm0ufvMALHKZksS08SRG6VBmGlmjTi-6EpYYOiJRshBz4Gt6C0mVBsmgpyNN7v0ki3DQjQkZB21Xs1XNoT28arcV43jAB4OneH4cTkxusCX3Y0w1HijYB36ZKj7Qc2w';

  console.log('1. Decoding token payload...');
  const decoded = jwt.decode(token) as any;
  console.log('Decoded Payload:', JSON.stringify(decoded, null, 2));

  // Extract email using our new logic
  console.log('\n2. Resolving email address using new middleware logic...');
  const email = decoded.email || (decoded.username && decoded.username.includes('@') ? decoded.username : undefined);
  console.log('Resolved Email:', email);

  if (email === 'anil@yopmail.com') {
    console.log('✅ Success: Resolved email correctly from Access Token payload!');
  } else {
    console.error('❌ Failure: Failed to resolve email.');
    return;
  }

  console.log('\n3. Verifying database lookup...');
  const db = getDb();
  
  // Check if user already exists in DB
  const dbUser = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (dbUser.length > 0) {
    console.log('✅ Success: Existing User found in DB directly by resolved email:');
    console.log(JSON.stringify(dbUser[0], null, 2));
  } else {
    console.log('User not found. Inserting mock user temporarily to verify query...');
    let candidateRoleId: string;
    const roleRows = await db.select().from(roles).where(eq(roles.name, 'candidate')).limit(1);
    if (roleRows.length > 0) {
      candidateRoleId = roleRows[0].id;
    } else {
      const newRole = await db.insert(roles).values({
        id: uuidv4(),
        name: 'candidate',
        description: 'Candidate role',
      }).returning();
      candidateRoleId = newRole[0].id;
    }

    const testUserId = decoded.sub;
    await db.insert(users).values({
      id: testUserId,
      email: email,
      passwordHash: 'TEST_HASH',
      fullName: 'Anil Test User',
      roleId: candidateRoleId,
      isActive: true,
    });

    const newDbUser = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (newDbUser.length > 0) {
      console.log('✅ Success: User successfully created and found in DB by resolved email:');
      console.log(JSON.stringify(newDbUser[0], null, 2));
    } else {
      console.error('❌ Failure: User lookup failed.');
    }

    console.log('\n4. Cleaning up mock user...');
    await db.delete(users).where(eq(users.id, testUserId));
    console.log('Mock user deleted.');
  }

  closeDb();
}

testResolution().catch(err => {
  console.error(err);
  closeDb();
});
