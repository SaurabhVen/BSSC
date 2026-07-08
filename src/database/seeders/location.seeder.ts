import { getDb } from '../drizzle';
import { countries, states, districts } from '../schema';
import { eq, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

export const seedLocations = async (): Promise<void> => {
  const db = getDb();
  console.log(' Seeding countries, states, and districts...');

  // 1. Seed Countries (India)
  const countryData = {
    countryName: 'Indian',
    countryCode: 'IN',
    isActive: true,
  };

  let countryId: number;
  const existingCountry = await db
    .select()
    .from(countries)
    .where(eq(countries.countryCode, countryData.countryCode))
    .limit(1);

  if (existingCountry.length === 0) {
    const inserted = await db.insert(countries).values(countryData).returning();
    countryId = inserted[0].countryId;
    console.log(` Created country: ${countryData.countryName}`);
  } else {
    countryId = existingCountry[0].countryId;
    console.log(` Country already exists: ${countryData.countryName}`);
  }

  // 2. Load States and Districts from JSON
  const jsonPath = path.join(__dirname, 'states-and-districts.json');
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const { states: statesList } = JSON.parse(rawData) as {
    states: { state: string; districts: string[]; gstCode?: string }[];
  };

  console.log(` Loaded ${statesList.length} states/UTs from JSON file.`);

  for (const s of statesList) {
    const stateName = s.state;
    let stateCode = s.gstCode || '';
    if (!stateCode) {
      const words = stateName.split(' ');
      if (words.length >= 2) {
        stateCode = (words[0][0] + words[1][0]).toUpperCase();
      } else {
        stateCode = stateName.substring(0, 2).toUpperCase();
      }
    }

    let stateId: number;
    const existingState = await db
      .select()
      .from(states)
      .where(eq(states.stateName, stateName))
      .limit(1);

    if (existingState.length === 0) {
      const inserted = await db
        .insert(states)
        .values({
          stateName,
          stateCode,
          countryId,
          isActive: true,
        })
        .returning();
      stateId = inserted[0].stateId;
      console.log(` Created state: ${stateName} (${stateCode})`);
    } else {
      stateId = existingState[0].stateId;
      if (existingState[0].stateCode !== stateCode) {
        await db.update(states).set({ stateCode }).where(eq(states.stateId, stateId));
        console.log(` Updated state: ${stateName} (${stateCode})`);
      }
    }

    // Insert Districts for this state
    for (const districtName of s.districts) {
      const existingDistrict = await db
        .select()
        .from(districts)
        .where(and(eq(districts.districtName, districtName), eq(districts.stateId, stateId)))
        .limit(1);

      if (existingDistrict.length === 0) {
        await db.insert(districts).values({
          stateId,
          districtName,
          isActive: true,
        });
      }
    }
  }

  console.log(' Locations seeding complete for all Indian states and districts.');
};

export default seedLocations;

if (require.main === module) {
  seedLocations()
    .catch((err) => {
      console.error(' Seeder failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      const { closeDb } = await import('../drizzle');
      await closeDb();
    });
}
