import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { sendSms, sendMtsExamPortalOpenSms } from '../../src/utils/sms';
import config from '../../src/config';

describe('SMS Utility Unit Tests', () => {
  let logSpy: any;
  let fetchSpy: any;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => 
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('Mock Success Response'),
      } as any)
    );
  });

  afterEach(() => {
    logSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  test('sendSms in mock mode', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    (config as any).MOCK_SMS_EMAIL = true;

    try {
      const result = await sendSms({
        mobile: '9305274251',
        message: 'Test message',
      });
      expect(result).toEqual({ success: true, mock: true });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[MOCK SMS]'));
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
    }
  });

  test('sendSms in real mode (success)', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    (config as any).MOCK_SMS_EMAIL = false;

    try {
      const result = await sendSms({
        mobile: '9305274251',
        message: 'Test message',
        templateId: '1207178152978600853',
      });
      expect(result).toBe('Mock Success Response');
      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('bulksms.analyticsmantra.com');
      expect(calledUrl).toContain('mobile=9305274251');
      expect(calledUrl).toContain('sender=JTGLCC');
      expect(calledUrl).toContain('HeaderId=1205178136119729018');
      expect(calledUrl).toContain('templateId=1207178152978600853');
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
    }
  });

  test('sendMtsExamPortalOpenSms constructs correct DLT template message', async () => {
    const originalMockValue = config.MOCK_SMS_EMAIL;
    (config as any).MOCK_SMS_EMAIL = true;

    try {
      await sendMtsExamPortalOpenSms('9305274251', '27-Feb-2026', '3-March-2026');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dear Candidate,  \nMTS Exam portal will be open from 27-Feb-2026 to 3-March-2026 (72 hrs).  \nLog in with Email ID & DOB to select ONE district (Imphal/Churachandpur/Senapati).  \nDistrict selection is mandatory for MTS Exam.  \nRef No.: ES-SSC-101/1/2026-MSSC-MSSC\nCyberica(CNTPL)  ) ')
      );
    } finally {
      (config as any).MOCK_SMS_EMAIL = originalMockValue;
    }
  });
});
