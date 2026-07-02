import { seedRoles } from './roles.seeder';
import { seedUsers } from './users.seeder';
import { seedPostsRelatedData } from './posts.seeder';
import { seedSubjects } from './subjects.seeder';
import { seedDegrees } from './degrees.seeder';
import { seedCategories } from './categories.seeder';
import { seedLocations } from './location.seeder';
import { seedJobQualifications } from './jobQualifications.seeder';
import { seedDisabilities } from './disabilities.seeder';
import { closeDb } from '../drizzle';

const runSeeders = async (): Promise<void> => {
  console.log(' Starting database seeders...\n');
  await seedRoles();
  console.log('');
  await seedUsers();
  console.log('');
  await seedPostsRelatedData();
  console.log('');
  await seedSubjects();
  console.log('');
  await seedDegrees();
  console.log('');
  await seedCategories();
  console.log('');
  await seedLocations();
  console.log('');
  await seedJobQualifications();
  console.log('');
  await seedDisabilities();
  console.log('\n All seeders completed successfully');
};

runSeeders()
  .catch((err: Error) => {
    console.error(' Seeder failed:', err.message, err.stack);
    process.exit(1);
  })
  .finally(closeDb);
