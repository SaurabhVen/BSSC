import { getDb, closeDb } from '../src/database/drizzle';
import { payments } from '../src/database/schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Fetching payments from database...');
  try {
    const list = await db.select().from(payments);
    console.log(`\n=== Total Payments: ${list.length} ===`);
    list.forEach((p) => {
      console.log(`ID: ${p.id} | App ID: ${p.applicationId} | Order ID: ${p.paymentOrderId} | Amount: ${p.amount} | Status: ${p.status}`);
    });
  } catch (err: any) {
    console.error('Error fetching payments:', err.message);
  }
}

main().catch(console.error).finally(closeDb);
