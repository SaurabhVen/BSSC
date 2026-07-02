import { getDb } from './src/database/drizzle';
import { candidates } from './src/database/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = getDb();
  try {
    const candidateList = await db.select().from(candidates).limit(1);
    if(candidateList.length === 0) {
      console.log("No candidates found");
      return;
    }
    const c = candidateList[0];
    
    await db
      .update(candidates)
      .set({ 
        dateOfBirth: new Date('1999-11-14'), 
        mobileNumber: "9876544567",
        updatedAt: new Date() 
      })
      .where(eq(candidates.id, c.id));
      
    console.log("Update successful!");
  } catch (err) {
    console.error("Actual error:", err);
  }
}
main();
