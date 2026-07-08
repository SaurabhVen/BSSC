import config from '../config';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  if (config.MOCK_SMS_EMAIL) {
    console.log(`[MOCK EMAIL] To: ${options.to}`);
    console.log(`[MOCK EMAIL] Subject: ${options.subject}`);
    // console.log(`[MOCK EMAIL] HTML: ${options.html}`);
    return;
  }

  // Integration with AWS SES or other email provider
  console.log(`[EMAIL] Would send email to: ${options.to} with subject: ${options.subject}`);
};

/**
 * Sends the Successful Payment and Final Application Submission Email.
 */
export const sendPaymentSuccessEmail = async (
  to: string,
  candidateName: string,
  examName: string,
  applicationNo: string,
  transactionId: string,
  amount: number | string
): Promise<void> => {
  const subject = `Application Submitted Successfully – BSSC ${examName}`;
  const html = `
    <p>Dear ${candidateName},</p>
    <p>We have successfully received your examination fee payment and your final application for the ${examName}.</p>
    <p><b>Payment Details:</b></p>
    <ul>
      <li><b>Application Number:</b> ${applicationNo}</li>
      <li><b>Transaction ID:</b> ${transactionId}</li>
      <li><b>Payment Date & Time:</b> ${new Date().toLocaleString('en-IN')}</li>
      <li><b>Amount Paid:</b> Rs. ${amount}</li>
      <li><b>Payment Status:</b> SUCCESS</li>
    </ul>
    <p>Your application process is now complete. We strongly advise you to log in to the portal and download a printed copy (PDF) of your final submitted application form and fee receipt for your future reference.</p>
    <p>You will be notified via SMS/Email when the Admit Cards are available for download. Keep visiting the official BSSC website (https://bssc.nic.in) for further updates regarding the examination schedule.</p>
    <p>Best Regards,<br/>Jharkhand Staff Selection Commission (BSSC)<br/>(This is an auto-generated email. Please do not reply.)</p>
  `;

  await sendEmail({ to, subject, html });
};
