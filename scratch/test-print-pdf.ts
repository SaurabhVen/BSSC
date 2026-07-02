import { getDb, closeDb } from '../src/database/drizzle';
import { applications } from '../src/database/schema';
import { applicationService } from '../src/services/application.service';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('Connecting to database...');
  const db = getDb();

  console.log('Fetching a submitted application from DB...');
  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.isSubmitted, true))
    .limit(1);

  if (!app) {
    console.error('No submitted applications found in the DB. Please run seeders or insert dummy candidates first.');
    process.exit(1);
  }

  console.log(`Found application: ID=${app.id}, CandidateID=${app.candidateId}`);

  console.log('Generating PDF using Puppeteer...');
  const start = Date.now();
  const pdfBuffer = await applicationService.generatePdf(app.id, app.candidateId);
  const duration = Date.now() - start;

  const outputPath = path.resolve(__dirname, 'output.pdf');
  fs.writeFileSync(outputPath, pdfBuffer);

  console.log(`Successfully generated PDF in ${duration}ms! Saved to ${outputPath}`);
}

main()
  .catch((err) => {
    console.error('Error during testing PDF generation:', err);
    process.exit(1);
  })
  .finally(closeDb);
