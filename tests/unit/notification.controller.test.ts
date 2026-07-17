import { describe, test, expect, jest, beforeEach } from '@jest/globals';
// Updated import paths to remove 'src/'
import { notificationController } from '../../controllers/notification.controller';
import { notificationService } from '../../services/notification.service';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// Updated mock paths to remove 'src/'
jest.mock('../../services/notification.service', () => {
  return {
    notificationService: {
      renderRegistrationSuccessEmail: jest.fn().mockReturnValue({ subject: 'Reg Sub', body: 'Reg Body' }),
      renderSubmissionSuccessEmail: jest.fn().mockReturnValue({ subject: 'Sub Sub', body: 'Sub Body' }),
      renderEmailOtpEmail: jest.fn().mockReturnValue({ subject: 'Otp Sub', body: 'Otp Body' }),
      sendEmail: jest.fn().mockImplementation(() => Promise.resolve()),
    },
  };
});

describe('NotificationController Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully sends registration success email notification', async () => {
    const event = {
      body: JSON.stringify({
        templateType: 'registrationSuccess',
        email: 'alok@example.com',
        details: {
          candidateName: 'Alok',
          password: 'Password123',
        },
      }),
    } as unknown as APIGatewayProxyEventV2;

    const res = await notificationController.sendEmail(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).message).toContain('sent to alok@example.com');
    expect(notificationService.renderRegistrationSuccessEmail).toHaveBeenCalled();
    expect(notificationService.sendEmail).toHaveBeenCalledWith('alok@example.com', 'Reg Sub', 'Reg Body');
  });

  test('successfully sends submission success email notification', async () => {
    const event = {
      body: JSON.stringify({
        templateType: 'submissionSuccess',
        email: 'alok@example.com',
        details: {
          candidateName: 'Alok',
          applicationNo: 'BSSC9900',
          transactionId: 'TXN1122',
          dateTime: '07/Jun/2026',
          amount: '100',
        },
      }),
    } as unknown as APIGatewayProxyEventV2;

    const res = await notificationController.sendEmail(event);
    expect(res.statusCode).toBe(200);
    expect(notificationService.renderSubmissionSuccessEmail).toHaveBeenCalled();
    expect(notificationService.sendEmail).toHaveBeenCalledWith('alok@example.com', 'Sub Sub', 'Sub Body');
  });

  test('successfully sends email otp notification', async () => {
    const event = {
      body: JSON.stringify({
        templateType: 'emailOtp',
        email: 'alok@example.com',
        details: {
          otp: '123456',
        },
      }),
    } as unknown as APIGatewayProxyEventV2;

    const res = await notificationController.sendEmail(event);
    expect(res.statusCode).toBe(200);
    expect(notificationService.renderEmailOtpEmail).toHaveBeenCalled();
    expect(notificationService.sendEmail).toHaveBeenCalledWith('alok@example.com', 'Otp Sub', 'Otp Body');
  });

  test('throws validation error when payload is invalid', async () => {
    const event = {
      body: JSON.stringify({
        templateType: 'invalidType',
      }),
    } as unknown as APIGatewayProxyEventV2;

    await expect(notificationController.sendEmail(event)).rejects.toThrow();
  });
});
