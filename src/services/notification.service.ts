import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import config from '../config';

export interface RegistrationSuccessDetails {
  candidateName: string;
  examName?: string;
  applicationNo?: string;
  password?: string;
  loginUrl?: string;
  email?: string;
}

export interface SubmissionSuccessDetails {
  candidateName: string;
  examName?: string;
  applicationNo: string;
  transactionId: string;
  dateTime: string;
  amount: string;
  websiteUrl?: string;
}

export interface SubmissionSuccessSmsDetails {
  examName?: string;
  amount: string;
  applicationNo: string;
}

export class NotificationService {
  private defaultExamName = 'JTGLCCE-2026';
  private defaultLoginUrl = 'https://bssc-portal.gov.in/login';
  private defaultWebsiteUrl = 'https://bssc.nic.in';

  private getSesClient(): SESClient {
    const awsConfig: any = { region: config.AWS_REGION };
    if (!process.env.AWS_LAMBDA_FUNCTION_NAME && config.AWS_ACCESS_KEY_ID && config.AWS_ACCESS_KEY_ID !== 'mock-key') {
      awsConfig.credentials = {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY || '',
      };
    }
    return new SESClient(awsConfig);
  }

  private getSnsClient(): SNSClient {
    const awsConfig: any = { region: config.AWS_REGION };
    if (!process.env.AWS_LAMBDA_FUNCTION_NAME && config.AWS_ACCESS_KEY_ID && config.AWS_ACCESS_KEY_ID !== 'mock-key') {
      awsConfig.credentials = {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY || '',
      };
    }
    return new SNSClient(awsConfig);
  }

  // ── SMS Templates ─────────────────────────────────────────────

  renderMobileOtpSms(otp: string): string {
    return `Dear Candidate, your OTP for mobile number verification for the BSSC Examination is ${otp}. This OTP is valid for 10 minutes. Do not share this with anyone. - BSSC`;
  }

  renderEmailOtpSms(otp: string): string {
    return `Dear Candidate, your OTP for email address verification for the BSSC Examination portal is ${otp}. Please enter this to proceed with your registration. - BSSC`;
  }

  renderSubmissionSuccessSms(details: SubmissionSuccessSmsDetails): string {
    const examName = details.examName || this.defaultExamName;
    return `Dear Candidate, your application for BSSC ${examName} has been successfully submitted along with the payment of Rs. ${details.amount}. Application No: ${details.applicationNo}. - BSSC`;
  }

  // ── Email Templates ────────────────────────────────────────────

  renderEmailOtpEmail(otp: string, examName?: string): { subject: string; body: string } {
    const exam = examName || this.defaultExamName;
    const subject = 'Email Verification OTP for BSSC Examination Registration';
    const body = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email Verification OTP</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #f0ece4;
      font-family: 'Source Serif 4', Georgia, serif;
      color: #1a1a1a;
      padding: 40px 20px;
    }

    .email-wrapper {
      max-width: 640px;
      margin: 0 auto;
      background: #fffdf9;
      border: 1px solid #ddd5c8;
      border-radius: 2px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }

    /* ── Header ── */
    .header {
      background: #004638;
      padding: 32px 40px 28px;
      text-align: center;
      border-bottom: 4px solid #c8a84b;
    }

    .header .gov-label {
      font-family: 'Source Serif 4', serif;
      font-weight: 300;
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #c8a84b;
      margin-bottom: 10px;
    }

    .header h1 {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.3;
    }

    .header .exam-tag {
      display: inline-block;
      margin-top: 12px;
      background: rgba(200,168,75,0.18);
      border: 1px solid #c8a84b;
      color: #e8d090;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 4px 14px;
      border-radius: 2px;
    }

    /* ── Body ── */
    .body {
      padding: 36px 40px;
    }

    .greeting {
      font-size: 16px;
      color: #333;
      margin-bottom: 20px;
    }

    .intro {
      font-size: 15px;
      color: #444;
      line-height: 1.7;
      margin-bottom: 28px;
    }

    /* ── OTP Box ── */
    .otp-box {
      background: #f7f2ea;
      border: 1px solid #ddd5c8;
      border-top: 3px solid #c8a84b;
      border-radius: 3px;
      padding: 24px 28px;
      margin-bottom: 28px;
      text-align: center;
    }

    .otp-box .box-title {
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #7a6a50;
      margin-bottom: 20px;
      font-weight: 600;
    }

    .otp-value {
      display: inline-block;
      font-family: 'Courier New', monospace;
      font-size: 28px;
      font-weight: 700;
      color: #004638;
      background: #fff;
      border: 1px dashed #c8a84b;
      padding: 10px 24px;
      border-radius: 2px;
      letter-spacing: 4px;
    }

    .divider-line {
      border: none;
      border-top: 1px solid #e0d8cc;
      margin: 20px 0;
    }

    .validity-note {
      font-size: 13px;
      color: #5a4e3c;
      line-height: 1.7;
      font-style: italic;
    }

    /* ── Footer ── */
    .footer {
      background: #004638;
      padding: 24px 40px;
      border-top: 4px solid #c8a84b;
    }

    .footer .sign-off {
      font-size: 14px;
      color: #a8c4b8;
      margin-bottom: 4px;
    }

    .footer .org-name {
      font-family: 'Playfair Display', serif;
      font-size: 16px;
      color: #fff;
      margin-bottom: 16px;
    }

    .footer .auto-note {
      font-size: 11px;
      color: #6a9e88;
      font-style: italic;
      border-top: 1px solid #1a5a48;
      padding-top: 14px;
    }
  </style>
</head>
<body>

  <div class="email-wrapper">

    <!-- Header -->
    <div class="header">
      <div class="gov-label">Government of Jharkhand</div>
      <h1>Jharkhand Staff Selection Commission</h1>
      <div class="exam-tag">${exam}</div>
    </div>

    <!-- Body -->
    <div class="body">

      <p class="greeting">Dear Candidate,</p>

      <p class="intro">Your OTP for email address verification for the BSSC Examination portal for <strong>${exam}</strong> is provided below.</p>

      <!-- OTP Box -->
      <div class="otp-box">
        <div class="box-title">Verification OTP</div>
        <div class="otp-value">${otp}</div>
        <hr class="divider-line"/>
        <p class="validity-note">This OTP is valid for 10 minutes. Do not share this OTP with anyone.</p>
      </div>

    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="sign-off">Best Regards,</p>
      <p class="org-name">Jharkhand Staff Selection Commission (BSSC)</p>
      <p class="auto-note">This is an auto-generated email. Please do not reply.</p>
    </div>

  </div>

</body>
</html>`;
    return { subject, body };
  }

  renderRegistrationSuccessEmail(details: RegistrationSuccessDetails): {
    subject: string;
    body: string;
  } {
    const examName = details.examName || this.defaultExamName;
    const loginUrl = details.loginUrl || this.defaultLoginUrl;
    const subject = `Registration Successful – Login Credentials for BSSC ${examName}`;
    const body = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${examName} Registration Confirmation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #f0ece4;
      font-family: 'Source Serif 4', Georgia, serif;
      color: #1a1a1a;
      padding: 40px 20px;
    }

    .email-wrapper {
      max-width: 640px;
      margin: 0 auto;
      background: #fffdf9;
      border: 1px solid #ddd5c8;
      border-radius: 2px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }

    /* ── Header ── */
    .header {
      background:  #004638;
      padding: 32px 40px 28px;
      text-align: center;
      border-bottom: 4px solid #c8a84b;
    }

    .header .gov-label {
      font-family: 'Source Serif 4', serif;
      font-weight: 300;
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #c8a84b;
      margin-bottom: 10px;
    }

    .header h1 {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.3;
    }

    .header .exam-tag {
      display: inline-block;
      margin-top: 12px;
      background: rgba(200,168,75,0.18);
      border: 1px solid #c8a84b;
      color: #e8d090;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 4px 14px;
      border-radius: 2px;
    }

    /* ── Body ── */
    .body {
      padding: 36px 40px;
    }

    .greeting {
      font-size: 16px;
      color: #333;
      margin-bottom: 16px;
    }

    .intro {
      font-size: 15px;
      color: #444;
      line-height: 1.7;
      margin-bottom: 28px;
    }

    /* ── Congrats Banner ── */
    .congrats-banner {
      background: linear-gradient(135deg,  #004638);
      border-left: 5px solid #c8a84b;
      border-radius: 3px;
      padding: 18px 22px;
      margin-bottom: 28px;
    }

    .congrats-banner p {
      font-family: 'Playfair Display', serif;
      font-size: 17px;
      color: #fff;
      line-height: 1.5;
    }

    .congrats-banner span {
      color: #e8d090;
      font-style: italic;
    }

    /* ── Credentials Box ── */
    .credentials-box {
      background: #f7f2ea;
      border: 1px solid #ddd5c8;
      border-top: 3px solid #c8a84b;
      border-radius: 3px;
      padding: 24px 28px;
      margin-bottom: 28px;
    }

    .credentials-box .box-title {
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #7a6a50;
      margin-bottom: 20px;
      font-weight: 600;
    }

    .credential-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 18px;
    }

    .credential-row:last-child {
      margin-bottom: 0;
    }

    .credential-label {
      font-size: 12px;
      color: #7a6a50;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      min-width: 160px;
      padding-top: 3px;
      font-weight: 600;
    }

    .credential-value {
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: 700;
      color:  #004638;
      background: #fff;
      border: 1px dashed #c8a84b;
      padding: 6px 14px;
      border-radius: 2px;
      letter-spacing: 2px;
    }

    .divider-line {
      border: none;
      border-top: 1px solid #e0d8cc;
      margin: 8px 0 18px;
    }

    .safe-note {
      font-size: 13px;
      color: #5a4e3c;
      line-height: 1.7;
      font-style: italic;
    }

    /* ── Next Steps ── */
    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: 17px;
      color:  #004638;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0d8cc;
    }

    .steps-list {
      list-style: none;
      padding: 0;
      margin-bottom: 28px;
    }

    .steps-list li {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 14px;
      font-size: 15px;
      color: #333;
      line-height: 1.6;
    }

    .step-num {
      min-width: 28px;
      height: 28px;
      background:  #004638;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .step-link a {
      color:  #004638;
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    /* ── Warning Note ── */
    .warning-box {
      background: #fff8e6;
      border: 1px solid #f0c040;
      border-left: 5px solid #e6a800;
      border-radius: 3px;
      padding: 14px 18px;
      margin-bottom: 28px;
    }

    .warning-box p {
      font-size: 14px;
      color: #5a3e00;
      line-height: 1.6;
    }

    .warning-box strong {
      color: #c00;
      font-size: 15px;
    }

    /* ── Footer ── */
    .footer {
      background:  #004638;
      padding: 24px 40px;
      border-top: 4px solid #c8a84b;
    }

    .footer .sign-off {
      font-size: 14px;
      color: #a8c4dc;
      margin-bottom: 4px;
    }

    .footer .org-name {
      font-family: 'Playfair Display', serif;
      font-size: 16px;
      color: #fff;
      margin-bottom: 16px;
    }

    .footer .auto-note {
      font-size: 11px;
      color:  #004638;
      font-style: italic;
      border-top: 1px solid  #004638;
      padding-top: 14px;
    }
  </style>
</head>
<body>

  <div class="email-wrapper">

    <!-- Header -->
    <div class="header">
      <div class="gov-label">Government of Jharkhand</div>
      <h1>Jharkhand Staff Selection Commission</h1>
      <div class="exam-tag">${examName}</div>
    </div>

    <!-- Body -->
    <div class="body">

      <p class="greeting">Dear <strong>${details.candidateName}</strong>,</p>

      <!-- Congrats Banner -->
      <div class="congrats-banner">
        <p>🎉 <span>Congratulations!</span> You have successfully completed the primary registration for the <strong>${examName}</strong>.</p>
      </div>

      <p class="intro">Please find your login credentials below.</p>

      <!-- Credentials Box -->
      <div class="credentials-box">
        <div class="box-title">🔐 Your Login Credentials</div>

        ${
          details.email
            ? `
        <div class="credential-row">
          <div class="credential-label">Registered Email</div>
          <div class="credential-value" style="font-family: inherit; font-size: 15px; letter-spacing: normal; text-transform: none; font-weight: 600; padding: 6px 14px; border: 1px dashed #c8a84b; background: #fff; border-radius: 2px;">${details.email}</div>
        </div>
        `
            : ''
        }
        ${
          details.applicationNo
            ? `
        ${details.email ? '<hr class="divider-line"/>' : ''}
        <div class="credential-row">
          <div class="credential-label">Application Number</div>
          <div class="credential-value">${details.applicationNo}</div>
        </div>
        `
            : ''
        }
        ${
          details.password
            ? `
        ${details.email || details.applicationNo ? '<hr class="divider-line"/>' : ''}
        <div class="credential-row">
          <div class="credential-label">Password</div>
          <div class="credential-value">${details.password}</div>
        </div>
        `
            : ''
        }

        <hr class="divider-line"/>

        <p class="safe-note">Keep these details safe, as they will be required for all future logins, including completing your application form, downloading your admit card, and checking your results.</p>
      </div>

      <!-- Next Steps -->
      <div class="section-title">Next Steps</div>
      <ol class="steps-list">
        <li>
          <div style="width:28px;height:28px;background:#004638;color:#fff;
                  border-radius:50%;text-align:center;line-height:28px;
                  font-weight:bold;display:inline-block;margin-right:10px;">1</div>
          <div class="step-link" style="display:inline-block;vertical-align:middle;">
            Click here to login: <a href="${loginUrl}" target="_blank">${loginUrl}</a>
          </div>
        </li>
        <li style="margin-top:10px;">
          <div style="width:28px;height:28px;background:#004638;color:#fff;
                  border-radius:50%;text-align:center;line-height:28px;
                  font-weight:bold;display:inline-block;margin-right:10px;">2</div>
          <div style="display:inline-block;vertical-align:middle;">Fill in your educational and personal details.</div>
        </li>
        <li style="margin-top:10px;">
          <div style="width:28px;height:28px;background:#004638;color:#fff;
                  border-radius:50%;text-align:center;line-height:28px;
                  font-weight:bold;display:inline-block;margin-right:10px;">3</div>
          <div style="display:inline-block;vertical-align:middle;">Upload your photograph and signature.</div>
        </li>
        <li style="margin-top:10px;">
          <div style="width:28px;height:28px;background:#004638;color:#fff;
                  border-radius:50%;text-align:center;line-height:28px;
                  font-weight:bold;display:inline-block;margin-right:10px;">4</div>
          <div style="display:inline-block;vertical-align:middle;">Pay the required examination fee to finally submit your application.</div>
        </li>
      </ol>

      <!-- Warning Note -->
      <div class="warning-box" style="margin-top:20px;">
        <p><strong>Note:</strong> Your application is <strong>NOT complete</strong> until the payment is successfully made.</p>
      </div>

    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="sign-off">Best Regards,</p>
      <p class="org-name">Jharkhand Staff Selection Commission (BSSC)</p>
      <p class="auto-note">This is an auto-generated email. Please do not reply.</p>
    </div>

  </div>

</body>
</html>
`;

    return { subject, body };
  }

  // ── Email Templates ────────────────────────────────────────────

  renderSubmissionSuccessEmail(details: SubmissionSuccessDetails): {
    subject: string;
    body: string;
  } {
    const examName = details.examName || this.defaultExamName;
    const websiteUrl = details.websiteUrl || this.defaultWebsiteUrl;
    const isFeeExempted = parseFloat(details.amount) === 0;
    const subject = `Application Submitted Successfully – BSSC ${examName}`;
    const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>JTGLCCE-2026 Payment Confirmation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #f0ece4;
      font-family: 'Source Serif 4', Georgia, serif;
      color: #1a1a1a;
      padding: 40px 20px;
    }

    .email-wrapper {
      max-width: 640px;
      margin: 0 auto;
      background: #fffdf9;
      border: 1px solid #ddd5c8;
      border-radius: 2px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }

    /* ── Header ── */
    .header {
      background: #004638;
      padding: 32px 40px 28px;
      text-align: center;
      border-bottom: 4px solid #c8a84b;
    }

    .header .gov-label {
      font-family: 'Source Serif 4', serif;
      font-weight: 300;
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #c8a84b;
      margin-bottom: 10px;
    }

    .header h1 {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.3;
    }

    .header .exam-tag {
      display: inline-block;
      margin-top: 12px;
      background: rgba(200,168,75,0.18);
      border: 1px solid #c8a84b;
      color: #e8d090;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 4px 14px;
      border-radius: 2px;
    }

    /* ── Body ── */
    .body {
      padding: 36px 40px;
    }

    .greeting {
      font-size: 16px;
      color: #333;
      margin-bottom: 20px;
    }

    .intro {
      font-size: 15px;
      color: #444;
      line-height: 1.7;
      margin-bottom: 28px;
    }

    /* ── Success Banner ── */
    .success-banner {
      background: linear-gradient(135deg, #004638, #005a48);
      border-left: 5px solid #c8a84b;
      border-radius: 3px;
      padding: 18px 22px;
      margin-bottom: 28px;
    }

    .success-banner p {
      font-family: 'Playfair Display', serif;
      font-size: 17px;
      color: #fff;
      line-height: 1.5;
    }

    .success-banner span {
      color: #e8d090;
      font-style: italic;
    }

    /* ── Payment Details Box ── */
    .payment-box {
      background: #f7f2ea;
      border: 1px solid #ddd5c8;
      border-top: 3px solid #c8a84b;
      border-radius: 3px;
      padding: 24px 28px;
      margin-bottom: 28px;
    }

    .payment-box .box-title {
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #7a6a50;
      margin-bottom: 20px;
      font-weight: 600;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      font-size: 12px;
      color: #7a6a50;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      min-width: 180px;
      padding-top: 3px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .detail-value {
      font-family: 'Courier New', monospace;
      font-size: 15px;
      font-weight: 700;
      color: #004638;
      background: #fff;
      border: 1px dashed #c8a84b;
      padding: 5px 12px;
      border-radius: 2px;
      letter-spacing: 1.5px;
    }

    .detail-value.status-success {
      color: #1a6e35;
      border-color: #4caf77;
      background: #edfaf3;
      letter-spacing: 2px;
    }

    .divider-line {
      border: none;
      border-top: 1px solid #e0d8cc;
      margin: 14px 0;
    }

    /* ── Info Section ── */
    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: 17px;
      color: #004638;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0d8cc;
    }

    .info-text {
      font-size: 15px;
      color: #333;
      line-height: 1.75;
      margin-bottom: 28px;
    }

    .info-text a {
      color: #004638;
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    /* ── Notice Box ── */
    .notice-box {
      background: #eef4f0;
      border: 1px solid #a3c9b2;
      border-left: 5px solid #004638;
      border-radius: 3px;
      padding: 14px 18px;
      margin-bottom: 28px;
    }

    .notice-box p {
      font-size: 14px;
      color: #1a3a2a;
      line-height: 1.65;
    }

    .notice-box strong {
      color: #004638;
    }

    /* ── Footer ── */
    .footer {
      background: #004638;
      padding: 24px 40px;
      border-top: 4px solid #c8a84b;
    }

    .footer .sign-off {
      font-size: 14px;
      color: #a8c4b8;
      margin-bottom: 4px;
    }

    .footer .org-name {
      font-family: 'Playfair Display', serif;
      font-size: 16px;
      color: #fff;
      margin-bottom: 16px;
    }

    .footer .auto-note {
      font-size: 11px;
      color: #6a9e88;
      font-style: italic;
      border-top: 1px solid #1a5a48;
      padding-top: 14px;
    }
  </style>
</head>
<body>

  <div class="email-wrapper">

    <!-- Header -->
    <div class="header">
      <div class="gov-label">Government of Jharkhand</div>
      <h1>Jharkhand Staff Selection Commission</h1>
      <div class="exam-tag">JTGLCCE-2026</div>
    </div>

    <!-- Body -->
    <div class="body">

      <p class="greeting">Dear <strong>${details.candidateName}</strong>,</p>

      <!-- Success Banner -->
      <div class="success-banner">
        ${
          isFeeExempted
            ? `<p>✅ We have <span>successfully received</span> your final application for the <strong>${examName}</strong> (Fee Exempted).</p>`
            : `<p>✅ We have <span>successfully received</span> your examination fee payment and your final application for the <strong>${examName}</strong>.</p>`
        }
      </div>

      <!-- Payment Details Box -->
      <div class="payment-box">
        <div class="box-title">🧾 Payment Details</div>

        <div class="detail-row">
          <div class="detail-label">Application Number</div>
          <div class="detail-value">${details.applicationNo}</div>
        </div>

        <hr class="divider-line"/>

        <div class="detail-row">
          <div class="detail-label">Transaction ID</div>
          <div class="detail-value">${details.transactionId}</div>
        </div>

        <hr class="divider-line"/>

        <div class="detail-row">
          <div class="detail-label">Payment Date &amp; Time</div>
          <div class="detail-value">${details.dateTime}</div>
        </div>

        <hr class="divider-line"/>

        <div class="detail-row">
          <div class="detail-label">Amount Paid</div>
          <div class="detail-value">${isFeeExempted ? 'Rs. 0 (Exempted)' : `Rs. ${details.amount}`}</div>
        </div>

        <hr class="divider-line"/>

        <div class="detail-row">
          <div class="detail-label">Payment Status</div>
          <div class="detail-value status-success">✔ SUCCESS</div>
        </div>
      </div>

      <!-- Advisory -->
      <div class="notice-box">
        <p>Your application process is now <strong>complete</strong>. We strongly advise you to log in to the portal and download a printed copy (PDF) of your final submitted application form ${
          isFeeExempted ? '' : 'and fee receipt'
        } for your future reference.</p>
      </div>

      <!-- Further Updates -->
      <div class="section-title">Stay Updated</div>
      <p class="info-text">
        You will be notified via <strong>SMS/Email</strong> when the Admit Cards are available for download. Keep visiting the official BSSC website
        (<a href="${websiteUrl}" target="_blank">${websiteUrl}</a>) for further updates regarding the examination schedule.
      </p>

    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="sign-off">Best Regards,</p>
      <p class="org-name">Jharkhand Staff Selection Commission (BSSC)</p>
      <p class="auto-note">This is an auto-generated email. Please do not reply.</p>
    </div>

  </div>

</body>
</html>`;

    return { subject, body };
  }

  // ── Dispatch Methods ───────────────────────────────────────────

  async sendSms(mobileNumber: string, message: string): Promise<void> {
    console.log(`\n================== [SMS DISABLED] ==================`);
    console.log(`To: ${mobileNumber}`);
    console.log(`Message:\n${message}`);
    console.log(`================================================\n`);
  }

  async sendEmail(email: string, subject: string, body: string): Promise<void> {
    if (config.MOCK_SMS_EMAIL) {
      console.log(`\n================== [MOCK EMAIL] ==================`);
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body:\n${body}`);
      console.log(`==================================================\n`);
    } else {
      console.log(`[Email] Sending actual Email to ${email} | Subject: "${subject}"`);
      try {
        const client = this.getSesClient();
        const sourceEmail = config.SES_SOURCE_EMAIL || 'noreply@bssc-portal.gov.in';
        await client.send(
          new SendEmailCommand({
            Source: sourceEmail,
            Destination: {
              ToAddresses: [email],
            },
            Message: {
              Subject: { Data: subject },
              Body: {
                Html: {
                  Data: body,
                },
              },
            },
          })
        );
        console.log(`[Email] Successfully sent email to ${email}`);
      } catch (error) {
        console.error(`[Email] Error sending email to ${email}:`, error);
        throw error;
      }
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
