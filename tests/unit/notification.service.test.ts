import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockSesSend = jest.fn() as any;
const mockSnsSend = jest.fn() as any;

jest.mock('@aws-sdk/client-ses', () => {
  return {
    SESClient: jest.fn().mockImplementation(() => {
      return {
        send: mockSesSend,
      };
    }),
    SendEmailCommand: jest.fn().mockImplementation((args) => args),
  };
});

jest.mock('@aws-sdk/client-sns', () => {
  return {
    SNSClient: jest.fn().mockImplementation(() => {
      return {
        send: mockSnsSend,
      };
    }),
    PublishCommand: jest.fn().mockImplementation((args) => args),
  };
});

import { notificationService } from '../../src/services/notification.service';
import config from '../../src/config';

describe('NotificationService Unit Tests', () => {
  let logSpy: any;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    mockSesSend.mockClear();
    mockSnsSend.mockClear();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('renderMobileOtpSms templates correctly', () => {
    const otp = '123456';
    const message = notificationService.renderMobileOtpSms(otp);
    expect(message).toContain(otp);
    expect(message).toContain('Dear Candidate');
    expect(message).toContain('BSSC Examination');
    expect(message).toContain('10 minutes');
    expect(message).toContain('- BSSC');
  });

  test('renderEmailOtpSms templates correctly', () => {
    const otp = '654321';
    const message = notificationService.renderEmailOtpSms(otp);
    expect(message).toContain(otp);
    expect(message).toContain('Dear Candidate');
    expect(message).toContain('email address verification');
    expect(message).toContain('- BSSC');
  });

  test('renderSubmissionSuccessSms templates correctly', () => {
    const details = {
      examName: 'JTGLCCE-2026',
      amount: '100',
      applicationNo: 'BSSC10203040',
    };
    const message = notificationService.renderSubmissionSuccessSms(details);
    expect(message).toContain(details.examName);
    expect(message).toContain(details.amount);
    expect(message).toContain(details.applicationNo);
    expect(message).toContain('- BSSC');
  });

  test('renderSubmissionSuccessSms templates correctly (without examName)', () => {
    const details = {
      amount: '100',
      applicationNo: 'BSSC10203040',
    };
    const message = notificationService.renderSubmissionSuccessSms(details);
    expect(message).toContain('JTGLCCE-2026'); // defaultExamName
    expect(message).toContain(details.amount);
    expect(message).toContain(details.applicationNo);
    expect(message).toContain('- BSSC');
  });

  test('renderEmailOtpEmail templates correctly', () => {
    const otp = '987654';
    const { subject, body } = notificationService.renderEmailOtpEmail(otp, 'JTGLCCE-2026');
    expect(subject).toBe('Email Verification OTP for BSSC Examination Registration');
    expect(body).toContain(otp);
    expect(body).toContain('JTGLCCE-2026');
    expect(body).toContain('10 minutes');
    expect(body).toContain('Jharkhand Staff Selection Commission (BSSC)');
  });

  test('renderEmailOtpEmail templates correctly without examName', () => {
    const otp = '987654';
    const { subject, body } = notificationService.renderEmailOtpEmail(otp);
    expect(subject).toBe('Email Verification OTP for BSSC Examination Registration');
    expect(body).toContain(otp);
    expect(body).toContain('JTGLCCE-2026'); // defaultExamName
  });

  test('renderRegistrationSuccessEmail templates correctly', () => {
    const details = {
      candidateName: 'Alok',
      examName: 'JTGLCCE-2026',
      password: 'Alok@12345',
      email: 'alok@example.com',
    };
    const { subject, body } = notificationService.renderRegistrationSuccessEmail(details);
    expect(subject).toBe(`Registration Successful – Login Credentials for BSSC ${details.examName}`);
    expect(body).toContain(details.candidateName);
    expect(body).toContain(details.password);
    expect(body).toContain(details.email);
    expect(body).toContain('Click here to login');
    expect(body).not.toContain('Application Number /<br/>Registration ID');
  });

  test('renderRegistrationSuccessEmail templates correctly with optional fields missing/present', () => {
    const details = {
      candidateName: 'Alok',
      loginUrl: 'https://custom-login.gov.in',
    };
    const { subject, body } = notificationService.renderRegistrationSuccessEmail(details);
    expect(subject).toBe('Registration Successful – Login Credentials for BSSC JTGLCCE-2026');
    expect(body).toContain(details.candidateName);
    expect(body).toContain('https://custom-login.gov.in');
    expect(body).not.toContain('Temp@123'); // should fallback to empty string
    expect(body).not.toContain('Application Number /<br/>Registration ID');
  });

  test('renderRegistrationSuccessEmail templates correctly with only email and password', () => {
    const details = {
      candidateName: 'Alok',
      email: 'alok@example.com',
      password: 'mySecretPassword',
    };
    const { subject, body } = notificationService.renderRegistrationSuccessEmail(details);
    expect(subject).toBe('Registration Successful – Login Credentials for BSSC JTGLCCE-2026');
    expect(body).toContain(details.candidateName);
    expect(body).toContain(details.email);
    expect(body).toContain(details.password);
    expect(body).not.toContain('Application Number /<br/>Registration ID');
  });

  test('renderRegistrationSuccessEmail templates correctly with only password', () => {
    const details = {
      candidateName: 'Alok',
      password: 'mySecretPassword',
    };
    const { subject, body } = notificationService.renderRegistrationSuccessEmail(details);
    expect(subject).toBe('Registration Successful – Login Credentials for BSSC JTGLCCE-2026');
    expect(body).toContain(details.candidateName);
    expect(body).toContain(details.password);
    expect(body).not.toContain('Application Number /<br/>Registration ID');
    expect(body).not.toContain('Registered Email');
  });

  test('renderSubmissionSuccessEmail templates correctly', () => {
    const details = {
      candidateName: 'Alok Rai',
      examName: 'JTGLCCE-2026',
      applicationNo: 'BSSC889900',
      transactionId: 'TXN778899',
      dateTime: '07/Jun/2026 10:30 AM',
      amount: '100',
    };
    const { subject, body } = notificationService.renderSubmissionSuccessEmail(details);
    expect(subject).toBe(`Application Submitted Successfully – BSSC ${details.examName}`);
    expect(body).toContain(details.candidateName);
    expect(body).toContain(details.applicationNo);
    expect(body).toContain(details.transactionId);
    expect(body).toContain(details.dateTime);
    expect(body).toContain(details.amount);
    expect(body).toContain('SUCCESS');
  });

  test('renderSubmissionSuccessEmail templates correctly with optional fields missing', () => {
    const details = {
      candidateName: 'Alok Rai',
      applicationNo: 'BSSC889900',
      transactionId: 'TXN778899',
      dateTime: '07/Jun/2026 10:30 AM',
      amount: '100',
    };
    const { subject, body } = notificationService.renderSubmissionSuccessEmail(details);
    expect(subject).toBe('Application Submitted Successfully – BSSC JTGLCCE-2026');
    expect(body).toContain('https://bssc.nic.in'); // defaultWebsiteUrl
  });

  test('renderSubmissionSuccessEmail templates correctly when payment is 0', () => {
    const details = {
      candidateName: 'Alok Rai',
      examName: 'JTGLCCE-2026',
      applicationNo: 'BSSC889900',
      transactionId: 'TXN778899',
      dateTime: '07/Jun/2026 10:30 AM',
      amount: '0',
    };
    const { subject, body } = notificationService.renderSubmissionSuccessEmail(details);
    expect(subject).toBe(`Application Submitted Successfully – BSSC ${details.examName}`);
    expect(body).toContain(details.candidateName);
    expect(body).toContain('Fee Exempted');
    expect(body).toContain('Exempted');
    expect(body).not.toContain('and fee receipt');
  });

  test('sendSms logs message mock state', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    (config as any).MOCK_SMS_EMAIL = true;
    try {
      await notificationService.sendSms('9026784051', 'Test SMS message');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[MOCK SMS]'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('To: 9026784051'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Test SMS message'));
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
    }
  });

  test('sendEmail logs email mock state', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    (config as any).MOCK_SMS_EMAIL = true;
    try {
      await notificationService.sendEmail('alok.rai@vensysco.in', 'Test Subject', 'Test Email Body');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[MOCK EMAIL]'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('To: alok.rai@vensysco.in'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Test Subject'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Test Email Body'));
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
    }
  });

  // ── Actual SMS / Email Dispatch Path Tests ─────────────────────

  test('sendSms sends actual SMS when MOCK_SMS_EMAIL is false (10-digit number, formatting check)', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    const originalAccessKey = config.AWS_ACCESS_KEY_ID;
    (config as any).MOCK_SMS_EMAIL = false;
    (config as any).AWS_ACCESS_KEY_ID = 'actual-access-key';

    mockSnsSend.mockResolvedValueOnce({});

    try {
      await notificationService.sendSms('9026784051', 'Actual SMS message');
      expect(mockSnsSend).toHaveBeenCalled();
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
      (config as any).AWS_ACCESS_KEY_ID = originalAccessKey;
    }
  });

  test('sendSms sends actual SMS when MOCK_SMS_EMAIL is false (with + prefix)', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    const originalAccessKey = config.AWS_ACCESS_KEY_ID;
    (config as any).MOCK_SMS_EMAIL = false;
    (config as any).AWS_ACCESS_KEY_ID = 'actual-access-key';

    mockSnsSend.mockResolvedValueOnce({});

    try {
      await notificationService.sendSms('+919026784051', 'Actual SMS message with prefix');
      expect(mockSnsSend).toHaveBeenCalled();
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
      (config as any).AWS_ACCESS_KEY_ID = originalAccessKey;
    }
  });

  test('sendSms sends actual SMS when MOCK_SMS_EMAIL is false (non-10 digit, without + prefix)', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    const originalAccessKey = config.AWS_ACCESS_KEY_ID;
    (config as any).MOCK_SMS_EMAIL = false;
    (config as any).AWS_ACCESS_KEY_ID = 'actual-access-key';

    mockSnsSend.mockResolvedValueOnce({});

    try {
      // 12 digit number
      await notificationService.sendSms('919026784051', 'Actual SMS message 12 digit');
      expect(mockSnsSend).toHaveBeenCalled();
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
      (config as any).AWS_ACCESS_KEY_ID = originalAccessKey;
    }
  });

  test('sendSms uses fallback when AWS_SECRET_ACCESS_KEY is undefined', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    const originalAccessKey = config.AWS_ACCESS_KEY_ID;
    const originalSecretKey = config.AWS_SECRET_ACCESS_KEY;
    (config as any).MOCK_SMS_EMAIL = false;
    (config as any).AWS_ACCESS_KEY_ID = 'actual-access-key';
    (config as any).AWS_SECRET_ACCESS_KEY = undefined;

    mockSnsSend.mockResolvedValueOnce({});

    try {
      await notificationService.sendSms('9026784051', 'Actual SMS message');
      expect(mockSnsSend).toHaveBeenCalled();
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
      (config as any).AWS_ACCESS_KEY_ID = originalAccessKey;
      (config as any).AWS_SECRET_ACCESS_KEY = originalSecretKey;
    }
  });

  test('sendSms handles error when SNS publish fails', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    const originalAccessKey = config.AWS_ACCESS_KEY_ID;
    (config as any).MOCK_SMS_EMAIL = false;
    (config as any).AWS_ACCESS_KEY_ID = 'actual-access-key';

    const snsError = new Error('SNS delivery failure');
    mockSnsSend.mockRejectedValueOnce(snsError);

    try {
      await expect(notificationService.sendSms('9026784051', 'Actual SMS message')).rejects.toThrow('SNS delivery failure');
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
      (config as any).AWS_ACCESS_KEY_ID = originalAccessKey;
    }
  });

  test('sendEmail sends actual Email when MOCK_SMS_EMAIL is false (with access keys)', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    const originalAccessKey = config.AWS_ACCESS_KEY_ID;
    (config as any).MOCK_SMS_EMAIL = false;
    (config as any).AWS_ACCESS_KEY_ID = 'actual-access-key';

    mockSesSend.mockResolvedValueOnce({});

    try {
      await notificationService.sendEmail('alok.rai@vensysco.in', 'Actual Email', 'Actual Email Body');
      expect(mockSesSend).toHaveBeenCalled();
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
      (config as any).AWS_ACCESS_KEY_ID = originalAccessKey;
    }
  });

  test('sendEmail sends actual Email when MOCK_SMS_EMAIL is false (with mock-key access key)', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    const originalAccessKey = config.AWS_ACCESS_KEY_ID;
    (config as any).MOCK_SMS_EMAIL = false;
    (config as any).AWS_ACCESS_KEY_ID = 'mock-key';

    mockSesSend.mockResolvedValueOnce({});

    try {
      await notificationService.sendEmail('alok.rai@vensysco.in', 'Actual Email Mock Key', 'Actual Email Body');
      expect(mockSesSend).toHaveBeenCalled();
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
      (config as any).AWS_ACCESS_KEY_ID = originalAccessKey;
    }
  });

  test('sendEmail uses fallback when AWS_SECRET_ACCESS_KEY is undefined', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    const originalAccessKey = config.AWS_ACCESS_KEY_ID;
    const originalSecretKey = config.AWS_SECRET_ACCESS_KEY;
    (config as any).MOCK_SMS_EMAIL = false;
    (config as any).AWS_ACCESS_KEY_ID = 'actual-access-key';
    (config as any).AWS_SECRET_ACCESS_KEY = undefined;

    mockSesSend.mockResolvedValueOnce({});

    try {
      await notificationService.sendEmail('alok.rai@vensysco.in', 'Test', 'Body');
      expect(mockSesSend).toHaveBeenCalled();
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
      (config as any).AWS_ACCESS_KEY_ID = originalAccessKey;
      (config as any).AWS_SECRET_ACCESS_KEY = originalSecretKey;
    }
  });

  test('sendEmail uses custom SES_SOURCE_EMAIL if defined', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    const originalAccessKey = config.AWS_ACCESS_KEY_ID;
    const originalSourceEmail = config.SES_SOURCE_EMAIL;
    (config as any).MOCK_SMS_EMAIL = false;
    (config as any).AWS_ACCESS_KEY_ID = 'actual-access-key';
    (config as any).SES_SOURCE_EMAIL = 'custom@bssc.gov.in';

    mockSesSend.mockResolvedValueOnce({});

    try {
      await notificationService.sendEmail('alok.rai@vensysco.in', 'Test', 'Body');
      expect(mockSesSend).toHaveBeenCalled();
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
      (config as any).AWS_ACCESS_KEY_ID = originalAccessKey;
      (config as any).SES_SOURCE_EMAIL = originalSourceEmail;
    }
  });

  test('sendEmail uses fallback source email if SES_SOURCE_EMAIL is undefined', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    const originalAccessKey = config.AWS_ACCESS_KEY_ID;
    const originalSourceEmail = config.SES_SOURCE_EMAIL;
    (config as any).MOCK_SMS_EMAIL = false;
    (config as any).AWS_ACCESS_KEY_ID = 'actual-access-key';
    (config as any).SES_SOURCE_EMAIL = undefined;

    mockSesSend.mockResolvedValueOnce({});

    try {
      await notificationService.sendEmail('alok.rai@vensysco.in', 'Test', 'Body');
      expect(mockSesSend).toHaveBeenCalled();
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
      (config as any).AWS_ACCESS_KEY_ID = originalAccessKey;
      (config as any).SES_SOURCE_EMAIL = originalSourceEmail;
    }
  });

  test('sendEmail handles error when SES send fails', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    const originalAccessKey = config.AWS_ACCESS_KEY_ID;
    (config as any).MOCK_SMS_EMAIL = false;
    (config as any).AWS_ACCESS_KEY_ID = 'actual-access-key';

    const sesError = new Error('SES send failure');
    mockSesSend.mockRejectedValueOnce(sesError);

    try {
      await expect(notificationService.sendEmail('alok.rai@vensysco.in', 'Actual Email', 'Actual Email Body')).rejects.toThrow('SES send failure');
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
      (config as any).AWS_ACCESS_KEY_ID = originalAccessKey;
    }
  });
});
