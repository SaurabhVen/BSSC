import { getDb } from '../src/database/drizzle';
import { posts, degrees } from '../src/database/schema';
import { inArray } from 'drizzle-orm';

async function test() {
  const db = getDb();
  try {
    const matchingDegrees = await db.select().from(degrees).where(inArray(degrees.degreeId, [1]));
    console.log("matchingDegrees", matchingDegrees);
    const codes = ["1", "2"];
    const allPosts = await db.select().from(posts).where(inArray(posts.postCode, codes));
    console.log("allPosts", allPosts);
  } catch (err) {
    console.error("ERROR", err);
  }
}
test().then(() => process.exit(0));
