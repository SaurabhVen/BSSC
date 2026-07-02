import { adminService } from '../src/services/admin.service';
import { closeDb } from '../src/database/drizzle';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  try {
    const candidateId = '973a1f94-7737-4bce-8b04-bedcb30ae013';
    console.log(`Fetching detail for candidate: ${candidateId}...`);
    const detail = await adminService.getCandidateDetail(candidateId);
    console.log('Candidate Details:');
    console.log(`isVerified: ${detail?.isVerified}`);
    console.log(`mobileVerified: ${detail?.mobileVerified}`);
    console.log(`emailVerified: ${detail?.emailVerified}`);
    console.log(`Documents list counts:`, detail?.documents.map((d: any) => ({ type: d.documentType, isVerified: d.isVerified })));
  } catch (error) {
    console.error(error);
  } finally {
    await closeDb();
  }
}
main();
