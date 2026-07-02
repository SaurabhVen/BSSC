import config from '../config';

export interface SmsOptions {
  mobile: string;
  message: string;
  templateId?: string;
}

/**
 * Sends an SMS using the AnalyticsMantra Bulk SMS gateway.
 * @param options Contains the mobile number, message, and optional templateId.
 */
export const sendSms = async (options: SmsOptions): Promise<unknown> => {
  const { mobile, message, templateId } = options;

  console.log(`[SMS DISABLED] Would send SMS to: ${mobile}, TemplateId: ${templateId || 'None'}`);
  console.log(`[SMS DISABLED] Message content: ${message}`);
  
  return { success: true, disabled: true };
};

/**
 * Sends the specific MTS Exam Notification SMS to a given mobile number.
 */
export const sendMtsExamNotificationSms = async (mobile: string): Promise<unknown> => {
  const message = `Dear Candidate,  
MTS Exam portal will be open from 27-Feb-2026 to 3-March-2026 (72 hrs).  
Log in with Email ID & DOB to select ONE district (Imphal/Churachandpur/Senapati).  
District selection is mandatory for MTS Exam .  
Cyberica(CNTPL)   )`;

  return sendSms({
    mobile,
    message,
    templateId: '1207177219762413053',
  });
};

/**
 * Sends the MTS Exam Portal Open Notification.
 */
export const sendMtsExamPortalOpenSms = async (
  mobile: string,
  fromDate: string,
  toDate: string
): Promise<unknown> => {
  const message = `Dear Candidate,  \nMTS Exam portal will be open from ${fromDate} to ${toDate} (72 hrs).  \nLog in with Email ID & DOB to select ONE district (Imphal/Churachandpur/Senapati).  \nDistrict selection is mandatory for MTS Exam.  \nRef No.: ES-SSC-101/1/2026-MSSC-MSSC\nCyberica(CNTPL)  ) `;

  return sendSms({
    mobile,
    message,
    templateId: '1207177202971426678',
  });
};

/**
 * Sends the Successful Payment SMS.
 */
export const sendPaymentSuccessSms = async (
  mobile: string,
  examName: string,
  amount: number | string,
  applicationNo: string
): Promise<unknown> => {
  const message = `Dear Candidate, your application for BSSC ${examName} has been successfully submitted along with the payment of Rs. ${amount}. Application No: ${applicationNo}. - BSSC`;

  return sendSms({
    mobile,
    message,
    // Note: TemplateId should be added here once approved by DLT
  });
};
