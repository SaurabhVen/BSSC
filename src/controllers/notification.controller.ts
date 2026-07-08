import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { notificationService } from '../services/notification.service';
import { sendEmailNotificationSchema } from '../validators/notification';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { validate } from '../middleware/validate';
import type { LambdaResponse } from '../types';

export class NotificationController {
  async sendEmail(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);
    const input = validate(sendEmailNotificationSchema, body);

    let subject = '';
    let emailBody = '';

    switch (input.templateType) {
      case 'registrationSuccess':
        const reg = notificationService.renderRegistrationSuccessEmail(input.details);
        subject = reg.subject;
        emailBody = reg.body;
        break;

      case 'submissionSuccess':
        const sub = notificationService.renderSubmissionSuccessEmail(input.details);
        subject = sub.subject;
        emailBody = sub.body;
        break;

      case 'emailOtp':
        const otp = notificationService.renderEmailOtpEmail(
          input.details.otp,
          input.details.examName
        );
        subject = otp.subject;
        emailBody = otp.body;
        break;
    }

    await notificationService.sendEmail(input.email, subject, emailBody);

    return response.success(200, {
      message: `Notification email sent to ${input.email}`,
    });
  }
}

export const notificationController = new NotificationController();
export default notificationController;
