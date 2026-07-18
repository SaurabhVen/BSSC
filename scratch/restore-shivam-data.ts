import { getDb, closeDb } from '../src/database/drizzle';
import { applicationStepData, documents, candidateQualifications, candidates } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  const candidateId = '40da5eb8-52c3-497b-989c-8e387cedb658';
  const applicationId = '03e303a2-5315-4592-99fb-e5d836862ce2';

  console.log('=== Fetching documents for Shivam ===');
  const docs = await db.select().from(documents).where(eq(documents.candidateId, candidateId));
  console.log('Documents:', JSON.stringify(docs, null, 2));

  // Find doc IDs by type
  const photoDoc = docs.find(d => d.documentType === 'photograph');
  const sigHindiDoc = docs.find(d => d.documentType === 'signature_hindi');
  const sigEnglishDoc = docs.find(d => d.documentType === 'signature_english');
  const livePhotoDoc = docs.find(d => d.documentType === 'live_photo');

  console.log('=== Restoring Step 3 (Educational Details) ===');
  // We use the exact values Shivam entered previously
  const step3Data = {
    tenth: {
      subject: "TENTH ",
      certNumber: "tyuiww",
      percentage: "0",
      totalMarks: "500",
      certIssueDate: "2010-10-16",
      obtainedMarks: "450",
      boardUniversity: "up board "
    },
    twelfth: {
      subject: "12th ",
      certNumber: "2rad",
      percentage: "0",
      totalMarks: "5000",
      certIssueDate: "2012-12-15",
      obtainedMarks: "548",
      boardUniversity: "up board  "
    },
    graduation: {
      subject: "ba",
      certNumber: "fsuis",
      percentage: "0",
      totalMarks: "600",
      certIssueDate: "2008-11-16",
      obtainedMarks: "457",
      boardUniversity: "uodartyevvd"
    }
  };

  await db.insert(applicationStepData).values({
    id: uuidv4(),
    applicationId,
    stepNumber: 3,
    data: step3Data
  });
  console.log('✅ Step 3 restored.');

  console.log('=== Restoring Step 4 (Documents) ===');
  const step4Data = {
    photograph: photoDoc?.id || '',
    signatureHindi: sigHindiDoc?.id || '',
    signatureEnglish: sigEnglishDoc?.id || ''
  };

  await db.insert(applicationStepData).values({
    id: uuidv4(),
    applicationId,
    stepNumber: 4,
    data: step4Data
  });
  console.log('✅ Step 4 restored.');

  console.log('=== Restoring Step 5 (Live Photo) ===');
  const step5Data = {
    livePhoto: livePhotoDoc?.id || ''
  };

  await db.insert(applicationStepData).values({
    id: uuidv4(),
    applicationId,
    stepNumber: 5,
    data: step5Data
  });
  console.log('✅ Step 5 restored.');

  console.log('=== SUCCESS: Shivam step data successfully recovered! ===');
}

main().catch(console.error).finally(closeDb);
