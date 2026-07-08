import { CustomMessageTriggerEvent, Context } from 'aws-lambda';

export const handler = async (
  event: CustomMessageTriggerEvent,
  _context: Context
): Promise<CustomMessageTriggerEvent> => {
  const { triggerSource, request } = event;
  console.log('Trigger Source:', triggerSource);
  console.log('Request:', JSON.stringify(request, null, 2));

  const code = request.codeParameter || '';
  const name = request.userAttributes?.name || request.userAttributes?.given_name || 'User';

  const email = request.userAttributes?.email || '';
  const applicationNo = request.userAttributes?.['custom:applicationNo'] || 'N/A';

  let subject = '';
  let htmlBody = '';
  let smsMessage = '';

  switch (triggerSource as string) {
    case 'CustomMessage_SignUp':
    case 'CustomMessage_ResendCode':
      subject = 'Verify your BSSC account';
      htmlBody = getOtpTemplate(name, code, 'Please verify your email address');
      smsMessage = `Dear Candidate, your OTP for mobile number verification for the JTGLCCE-2026 is ${code}. This OTP is valid for 10 minutes. Do not share this with anyone. - BSSC`;
      break;

    case 'CustomMessage_ForgotPassword':
      subject = 'Reset your password – BSSC';
      htmlBody = getForgotPasswordTemplate(name, code);
      smsMessage = `Dear Candidate, your OTP to reset your password for the JTGLCCE-2026 is ${code}. Do not share this with anyone. - BSSC`;
      break;

    case 'CustomMessage_Authentication':
      subject = 'Your BSSC login OTP';
      htmlBody = getOtpTemplate(name, code, 'Use this code to sign in');
      smsMessage = `Dear Candidate, your authentication OTP for the JTGLCCE-2026 portal is ${code}. Do not share this with anyone. - BSSC`;
      break;

    case 'CustomMessage_AdminCreateUser':
      subject = 'Welcome to BSSC';
      // In AdminCreateUser, the temporary password is passed in codeParameter (code)
      htmlBody = getloginPasswordTemplate(name, email, code);
      smsMessage = `Dear Candidate, you have successfully registered for the JTGLCCE-2026. Application No: ${applicationNo}. Please check your email for login credentials. - BSSC`;
      break;

    case 'CustomMessage_VerifyUserAttribute':
    case 'CustomMessage_UpdateUserAttribute':
      subject = 'Verify your Attribute for JTGLCCE-2026';
      htmlBody = getOtpTemplate(name, code, 'To verify this attribute for your account');
      smsMessage = `Dear Candidate, your OTP for verification for the JTGLCCE-2026 is ${code}. Do not share this with anyone. - BSSC`;
      break;

    case 'CustomMessage_MFA':
      subject = 'MFA OTP for JTGLCCE-2026 Login';
      htmlBody = getOtpTemplate(name, code, 'To securely log in to the portal');
      smsMessage = `Dear Candidate, your MFA OTP to login to the JTGLCCE-2026 portal is ${code}. Do not share this with anyone. - BSSC`;
      break;

    default:
      return event;
  }

  console.log('Email Subject:', subject);

  event.response.emailSubject = subject;
  event.response.emailMessage = htmlBody;
  event.response.smsMessage = smsMessage;

  return event;
};

function getOtpTemplate(name: string, code: string, message: string): string {
  return `<p>Dear ${name},</p>

<p>
Thank you for initiating the registration process for the
<b>JTGLCCE-2026</b> under the <b>Jharkhand Staff Selection Commission (BSSC)</b>.
</p>

<p>
${message}, please use the following One-Time Password (OTP):
</p>

<div>
OTP: <span style="font-size:20px;font-weight:bold;margin:15px 0;">${code}</span>
</div>

<p>This OTP is valid for <b>10 minutes</b>.</p>

<p>
Please do not share this OTP with anyone. If you did not initiate
this request, please ignore this email.
</p>

<p>
Best Regards,<br/>
Jharkhand Staff Selection Commission (BSSC)<br/>
<em>(This is an auto-generated email. Please do not reply.)</em>
</p>
`;
}

function getloginPasswordTemplate(name: string, email: string, temporaryPassword?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>JTGLCCE-2026 Registration</title>
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
      background: #1b3a5c;
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
      background: linear-gradient(135deg, #1b3a5c 0%, #24527d 100%);
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
      color: #1b3a5c;
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
      color: #1b3a5c;
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
      background: #1b3a5c;
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
      color: #1b3a5c;
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
      background: #1b3a5c;
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
      color: #6a8fa8;
      font-style: italic;
      border-top: 1px solid #2e5070;
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
      <p class="greeting">Dear <strong>${name}</strong>,</p>

      <!-- Congrats Banner -->
      <div class="congrats-banner">
        <p>🎉 <span>Congratulations!</span> You have successfully completed the primary registration for the <strong>JTGLCCE-2026</strong>.</p>
      </div>

      <p class="intro">Please find your login credentials below.</p>

      <!-- Credentials Box -->
      <div class="credentials-box">
        <div class="box-title">🔐 Your Login Credentials</div>

        <div class="credential-row">
          <div class="credential-label">Email Id</div>
          <div class="credential-value">${email}</div>
        </div>

        <hr class="divider-line"/>

        <div class="credential-row">
          <div class="credential-label">Password</div>
          <div class="credential-value">${temporaryPassword || 'xxxxx'}</div>
        </div>

        <hr class="divider-line"/>

        <p class="safe-note">Keep these details safe, as they will be required for all future logins, including completing your application form, downloading your admit card, and checking your results.</p>
      </div>

      <!-- Next Steps -->
      <div class="section-title">Next Steps</div>
      <ol class="steps-list">
        <li>
          <div class="step-num">1</div>
          <div class="step-link">
            Click here to login: <a href="https://bssc-portal.gov.in/login" target="_blank">https://bssc-portal.gov.in/login</a>
          </div>
        </li>
        <li>
          <div class="step-num">2</div>
          <div>Fill in your educational and personal details.</div>
        </li>
        <li>
          <div class="step-num">3</div>
          <div>Upload your photograph and signature.</div>
        </li>
        <li>
          <div class="step-num">4</div>
          <div>Pay the required examination fee to finally submit your application.</div>
        </li>
      </ol>

      <!-- Warning Note -->
      <div class="warning-box">
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
}

function getForgotPasswordTemplate(name: string, code: string): string {
  return `
  <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
      <h2>Jharkhand Staff Selection Commission (BSSC)</h2>

      <p>Dear <strong>${name}</strong>,</p>

      <p>
          We received a request to reset the password for your BSSC account.
      </p>

      <p>
          Please use the following One-Time Password (OTP) to reset your password:
      </p>

      <div style="
          background:#f4f4f4;
          border:1px solid #ddd;
          padding:20px;
          text-align:center;
          font-size:28px;
          font-weight:bold;
          letter-spacing:5px;
          margin:20px 0;
      ">
          ${code}
      </div>

      <p>
          This OTP is valid for <strong>10 minutes</strong>.
      </p>

      <p>
          If you did not request a password reset, please ignore this email.
      </p>

      <br>

      <p>
          Best Regards,<br>
          Jharkhand Staff Selection Commission (BSSC)
      </p>

      <p style="font-size:12px;color:#777;">
          This is an auto-generated email. Please do not reply.
      </p>
  </div>
  `;
}
