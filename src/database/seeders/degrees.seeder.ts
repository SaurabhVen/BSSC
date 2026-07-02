import { getDb } from '../drizzle';
import { degrees, degreePostMap, postMapping } from '../schema';
import { eq, and } from 'drizzle-orm';

const DEGREES_DATA = [
  {
    degreeName: 'M.Sc. Zoology (with special paper Entomology)',
    degreeType: 'master',
    postCodes: ['1'],
  },
  { degreeName: 'M.Sc. Entomology', degreeType: 'master', postCodes: ['1'] },
  { degreeName: 'B.A. With Mathematics', degreeType: 'bachelor', postCodes: ['4'] },
  { degreeName: 'B.Sc. With Mathematics', degreeType: 'bachelor', postCodes: ['4'] },
  { degreeName: 'B.A. With Statistics', degreeType: 'bachelor', postCodes: ['4'] },
  { degreeName: 'B.Sc. With Statistics', degreeType: 'bachelor', postCodes: ['4'] },
  { degreeName: 'B.A. With Economics', degreeType: 'bachelor', postCodes: ['4'] },
  { degreeName: 'B.Com', degreeType: 'bachelor', postCodes: ['7'] },
  {
    degreeName: 'B.A. in Mathematics (3 Years Degree)',
    degreeType: 'bachelor',
    postCodes: ['4', '7'],
  },
  {
    degreeName: 'B.Sc. in Mathematics (3 Years Degree)',
    degreeType: 'bachelor',
    postCodes: ['4', '7'],
  },
  {
    degreeName: 'B.A. in Statistics (3 Years Degree)',
    degreeType: 'bachelor',
    postCodes: ['4', '7'],
  },
  {
    degreeName: 'B.Sc. in Statistics (3 Years Degree)',
    degreeType: 'bachelor',
    postCodes: ['4', '7'],
  },
  {
    degreeName: 'B.A. in Economics (3 Years Degree)',
    degreeType: 'bachelor',
    postCodes: ['4', '7'],
  },
  { degreeName: 'B.A. Mathematics Honours', degreeType: 'bachelor', postCodes: ['4', '7'] },
  { degreeName: 'B.Sc. Mathematics Honours', degreeType: 'bachelor', postCodes: ['4', '7'] },
  { degreeName: 'B.A. Statistics Honours', degreeType: 'bachelor', postCodes: ['4', '7'] },
  { degreeName: 'B.Sc. Statistics Honours', degreeType: 'bachelor', postCodes: ['4', '7'] },
  { degreeName: 'B.A. Economics Honours', degreeType: 'bachelor', postCodes: ['4', '7'] },
  { degreeName: 'B.Sc. Physics Honours', degreeType: 'bachelor', postCodes: ['9'] },
  { degreeName: 'B.Sc. Chemistry Honours', degreeType: 'bachelor', postCodes: ['10'] },
  {
    degreeName: 'B.Sc. Chemistry Honours with Math (subsidiary or Extra)',
    degreeType: 'bachelor',
    postCodes: ['4', '10'],
  },
  {
    degreeName: 'B.Sc. Physics Honours with Math (subsidiary or Extra)',
    degreeType: 'bachelor',
    postCodes: ['4', '9'],
  },
  { degreeName: 'Bachelor of Fisheries Science', degreeType: 'bachelor', postCodes: ['6'] },
  { degreeName: 'B.Sc. Zoology Honours', degreeType: 'bachelor', postCodes: ['6'] },
  {
    degreeName: 'B.Sc. Zoology Honours with Math (subsidiary or Extra)',
    degreeType: 'bachelor',
    postCodes: ['4', '6'],
  },
  {
    degreeName: 'Graduation in Dairy Technology/Dairy Science or Equivalent Degree',
    degreeType: 'bachelor',
    postCodes: ['5'],
  },
];
export const seedDegrees = async (): Promise<{ inserted: string[]; skipped: string[] }> => {
  const db = getDb();
  console.log('🚀 Seeding degrees and post mappings...');

  console.log('🗑️ Deleting old degrees data...');
  await db.delete(degreePostMap);
  await db.delete(postMapping);
  await db.delete(degrees);

  const inserted: string[] = [];
  const skipped: string[] = [];

  for (const item of DEGREES_DATA) {
    // Check if the degree already exists by its unique degreeName
    const existing = await db
      .select()
      .from(degrees)
      .where(eq(degrees.degreeName, item.degreeName))
      .limit(1);

    let degreeId: number;

    if (existing.length === 0) {
      const insertedRows = await db
        .insert(degrees)
        .values({
          degreeName: item.degreeName,
          degreeType: item.degreeType,
        })
        .returning({ degreeId: degrees.degreeId });

      degreeId = insertedRows[0].degreeId;
      inserted.push(item.degreeName);
      console.log(`✅ Created degree: ${item.degreeName}`);
    } else {
      degreeId = existing[0].degreeId;
      skipped.push(item.degreeName);
      console.log(`⚠️ Degree already exists: ${item.degreeName}`);
    }

    // Now insert mappings for this degree
    for (const postCode of item.postCodes) {
      // Insert into degreePostMap
      const existingDegreePostMap = await db
        .select()
        .from(degreePostMap)
        .where(and(eq(degreePostMap.degreeId, degreeId), eq(degreePostMap.postCode, postCode)))
        .limit(1);

      if (existingDegreePostMap.length === 0) {
        await db.insert(degreePostMap).values({
          degreeId: degreeId,
          postCode: postCode,
          degreeType: item.degreeType,
        });
        console.log(`✅ Created degreePostMap for: ${item.degreeName} -> Post: ${postCode}`);
      }

      // Insert into postMapping
      const existingPostMapping = await db
        .select()
        .from(postMapping)
        .where(and(eq(postMapping.degreeId, degreeId), eq(postMapping.postCode, postCode)))
        .limit(1);

      if (existingPostMapping.length === 0) {
        await db.insert(postMapping).values({
          degreeId: degreeId,
          postCode: postCode,
        });
        console.log(`✅ Created postMapping for: ${item.degreeName} -> Post: ${postCode}`);
      }
    }
  }

  console.log(
    `📊 Degrees seeding complete (inserted: ${inserted.length}, skipped: ${skipped.length})`
  );
  return { inserted, skipped };
};

export default seedDegrees;
