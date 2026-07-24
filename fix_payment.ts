import { getDb } from './src/database/drizzle';
import { users, candidates, applications, payments } from './src/database/schema';
import { eq } from 'drizzle-orm';
import { paymentService } from './src/services/payment.service';
import { paymentRepository } from './src/repositories/common.repository';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  const db = getDb();
  
  console.log("Looking up user: krishna@yopmail.com");
  const userList = await db.select().from(users).where(eq(users.email, 'krishna@yopmail.com'));
  if (userList.length === 0) {
    console.error("User not found!");
    process.exit(1);
  }
  const user = userList[0];
  console.log("Found user:", user.id);

  const candidateList = await db.select().from(candidates).where(eq(candidates.userId, user.id));
  if (candidateList.length === 0) {
    console.error("Candidate not found for user!");
    process.exit(1);
  }
  const candidate = candidateList[0];
  console.log("Found candidate:", candidate.id);

  const applicationList = await db.select().from(applications).where(eq(applications.candidateId, candidate.id));
  if (applicationList.length === 0) {
    console.error("Application not found for candidate!");
    process.exit(1);
  }
  const application = applicationList[0];
  console.log("Found application:", application.id);

  const paymentList = await db.select().from(payments).where(eq(payments.applicationId, application.id));
  
  const completedPayment = paymentList.find((p: any) => p.status === 'completed');
  if (completedPayment) {
    console.log("Payment is already completed for this application.");
    process.exit(0);
  }

  const pendingPayment = paymentList.find((p: any) => p.status === 'pending');
  if (pendingPayment) {
    console.log("Updating existing pending payment to completed...");
    await db.update(payments).set({ status: 'completed' }).where(eq(payments.id, pendingPayment.id));
    console.log("Payment updated successfully.");
  } else {
    console.log("Creating new completed payment...");
    const paymentOrderId = `free_auto_${uuidv4().substring(0, 8).toUpperCase()}`;
    await paymentRepository.create({
      applicationId: application.id,
      paymentOrderId,
      amount: '0.00',
      currency: 'INR',
      status: 'pending',
      paymentMode: 'exempt',
    });
    await paymentService.completeFreePayment(paymentOrderId);
    console.log("Payment created and marked as completed successfully.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error running script:", err);
  process.exit(1);
});
