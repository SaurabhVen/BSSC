import { CustomSMSSenderTriggerEvent, Context } from 'aws-lambda';
import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';
import { sendSms } from '../../utils/sms';
import config from '../../config';

const kmsClient = new KMSClient({ region: config.AWS_REGION });

export const handler = async (
  event: CustomSMSSenderTriggerEvent,
  _context: Context
): Promise<CustomSMSSenderTriggerEvent> => {
  const { triggerSource, request } = event;
  console.log('Custom SMS Sender Trigger Source:', triggerSource);

  // Cognito formats the recipient's phone number in E.164 (e.g. +919876543210)
  const phoneNumber = request.userAttributes?.phone_number;
  const encryptedCode = request.code;

  if (!phoneNumber) {
    console.error('No phone number found in event userAttributes');
    throw new Error('Phone number is missing');
  }

  if (!encryptedCode) {
    console.error('No encrypted code found in event request');
    throw new Error('Encrypted code is missing');
  }

  // 1. Decrypt the code using AWS KMS
  let code = '';
  try {
    if (config.MOCK_COGNITO || config.MOCK_SMS_EMAIL) {
      console.log('[CustomSMSSender] Running in mock/development mode. Simulating decryption.');
      try {
        code = Buffer.from(encryptedCode, 'base64').toString('utf-8');
        // If it's a binary ciphertext rather than encoded plaintext, check for non-printable chars
        if (/[\x00-\x09\x0E-\x1F\x7F]/.test(code)) {
          code = '123456';
        }
      } catch {
        code = '123456';
      }
    } else {
      try {
        const encryptedBuffer = Buffer.from(encryptedCode, 'base64');
        const command = new DecryptCommand({
          CiphertextBlob: encryptedBuffer,
        });
        const response = await kmsClient.send(command);
        if (!response.Plaintext) {
          throw new Error('Plaintext from KMS decrypt is undefined');
        }
        code = Buffer.from(response.Plaintext).toString('utf-8');
      } catch (kmsError) {
        if (config.NODE_ENV !== 'production') {
          console.warn('[CustomSMSSender] KMS Decrypt failed under development environment. Falling back to base64 decoding.', (kmsError as Error).message);
          try {
            code = Buffer.from(encryptedCode, 'base64').toString('utf-8');
            if (/[\x00-\x09\x0E-\x1F\x7F]/.test(code)) {
              code = '556677';
            }
          } catch {
            code = '556677';
          }
        } else {
          throw kmsError;
        }
      }
    }
  } catch (error) {
    console.error('KMS Decrypt failed:', error);
    throw error;
  }

  // 2. Format message and determine TemplateId depending on the triggerSource
  let message = '';
  let templateId: string | undefined = undefined;

  // Stripping leading + prefix if the provider expects standard digits without a plus
  let formattedMobile = phoneNumber;
  if (formattedMobile.startsWith('+')) {
    formattedMobile = formattedMobile.slice(1);
  }

  const name = request.userAttributes?.name || request.userAttributes?.given_name || 'Candidate';

  switch (triggerSource as string) {
    case 'CustomSMSSender_SignUp':
    case 'CustomSMSSender_ResendCode':
      message = `Dear ${name} ,\nYour One-Time Password OTP  for verification is: ${code} \nPlease do not share it with anyone.-Team BSSC\nJTGLCC\nCyberica (CNTPL)`;
      templateId = '1207178152978600853';
      break;

    case 'CustomSMSSender_ForgotPassword':
      message = `Dear ${name} ,\nYour One-Time Password OTP  for verification is: ${code} \nPlease do not share it with anyone.-Team BSSC\nJTGLCC\nCyberica (CNTPL)`;
      templateId = '1207178152978600853';
      break;

    case 'CustomSMSSender_Authentication':
      message = `Dear ${name} ,\nYour One-Time Password OTP  for verification is: ${code} \nPlease do not share it with anyone.-Team BSSC\nJTGLCC\nCyberica (CNTPL)`;
      templateId = '1207178152978600853';
      break;

    case 'CustomSMSSender_UpdateUserAttribute':
    case 'CustomSMSSender_VerifyUserAttribute':
      message = `Dear ${name} ,\nYour One-Time Password OTP  for verification is: ${code} \nPlease do not share it with anyone.-Team BSSC\nJTGLCC\nCyberica (CNTPL)`;
      templateId = '1207178152978600853';
      break;

    default:
      console.warn(`Unhandled CustomSMSSender triggerSource: ${triggerSource}`);
      message = `Dear ${name} ,\nYour One-Time Password OTP  for verification is: ${code} \nPlease do not share it with anyone.-Team BSSC\nJTGLCC\nCyberica (CNTPL)`;
      templateId = '1207178152978600853';
  }

  // 3. Dispatch SMS using AnalyticsMantra gateway
  console.log(`[CustomSMSSender] Sending SMS to: ${formattedMobile}`);
  await sendSms({
    mobile: formattedMobile,
    message,
    templateId,
  });

  return event;
};
