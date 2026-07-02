import { sendMtsExamPortalOpenSms } from '../utils/sms';

const triggerSms = async () => {
  // Replace these with actual values or fetch from your database
  const mobileNumber = '9217605427'; // User's requested test number
  const fromDate = '27-Feb-2026';
  const toDate = '3-March-2026';

  try {
    console.log(`Sending MTS Portal Open SMS to ${mobileNumber}...`);
    const response = await sendMtsExamPortalOpenSms(mobileNumber, fromDate, toDate);
    console.log('SMS sent successfully. Response:', response);
  } catch (error) {
    console.error('Failed to send SMS:', error);
  }
};

triggerSms().then(() => {
  console.log('Script execution completed.');
  process.exit(0);
});
