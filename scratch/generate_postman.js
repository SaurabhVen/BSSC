const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const collectionPath = 'c:/Users/user/Desktop/bssc/postman_collection.json';
const originalCollection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// Helper: build path array from path string
const buildPath = (pathStr) => {
  return pathStr.replace(/^\//, '').split('/').map(part => {
    if (part.startsWith(':')) {
      return part;
    }
    return part;
  });
};

// Helper: build url object
const buildUrl = (pathStr) => {
  const path = buildPath(pathStr);
  const variables = path
    .filter(part => part.startsWith(':'))
    .map(part => ({
      key: part.replace(':', ''),
      value: `<${part.replace(':', '')}>`
    }));

  return {
    raw: `{{localUrl}}${pathStr}`,
    host: ['{{localUrl}}'],
    path: path,
    query: [],
    variable: variables
  };
};

// Helper: build header list
const buildHeaders = (needsAuth = false) => {
  const headers = [
    {
      key: 'Content-Type',
      value: 'application/json'
    },
    {
      key: 'Accept',
      value: 'application/json'
    }
  ];

  if (needsAuth) {
    headers.push({
      key: 'Authorization',
      value: 'Bearer {{authToken}}'
    });
  }

  return headers;
};

// Helper: build request object
const buildRequest = (name, method, pathStr, body = null, needsAuth = false) => {
  const req = {
    method: method,
    header: buildHeaders(needsAuth),
    url: buildUrl(pathStr)
  };

  if (body) {
    req.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: {
        raw: {
          language: 'json'
        }
      }
    };
  }

  return {
    name: name,
    request: req,
    response: []
  };
};

// ── Define items for the new collection ──

const authItem = {
  name: 'Auth',
  item: [
    buildRequest('Generate CAPTCHA', 'GET', '/auth/captcha'),
    buildRequest('User Login', 'POST', '/auth/login', {
      email: 'candidate@example.com',
      password: 'Candidate@12345',
      captchaId: '1e37042a-2900-47bf-a111-5cb651699549',
      captchaText: '1234'
    }),
    buildRequest('Register Candidate (Basic)', 'POST', '/auth/register', {
      email: 'candidate@example.com',
      password: 'Candidate@12345',
      confirmPassword: 'Candidate@12345',
      firstName: 'Test',
      lastName: 'Candidate',
      dateOfBirth: '2000-01-01',
      mobileNumber: '9876543210',
      captchaId: '1e37042a-2900-47bf-a111-5cb651699549',
      captchaText: '1234'
    }),
    buildRequest('Register Candidate (Full with OTP)', 'POST', '/auth/candidate/register', {
      fullName: 'Test Candidate',
      dateOfBirth: '2000-01-01',
      mobileNumber: '9876543210',
      email: 'candidate@example.com',
      password: 'Candidate@12345',
      confirmPassword: 'Candidate@12345',
      captchaId: '1e37042a-2900-47bf-a111-5cb651699549',
      captchaCode: '1234',
      mobileVerificationToken: 'mv_token_123',
      emailVerificationToken: 'ev_token_123'
    }),
    buildRequest('Seed Developer Dummy Data', 'POST', '/auth/seed-dummy', {}),
    buildRequest('Refresh Token', 'POST', '/auth/refresh-token', {
      email: 'candidate@example.com',
      refreshToken: '<token>'
    }),
    buildRequest('Forgot Password', 'POST', '/auth/forgot-password', {
      email: 'candidate@example.com',
      captchaId: '1e37042a-2900-47bf-a111-5cb651699549',
      captchaText: '1234'
    }),
    buildRequest('Reset Password', 'POST', '/auth/reset-password', {
      token: '<token_or_userId>',
      newPassword: 'NewPassword@123',
      confirmPassword: 'NewPassword@123'
    }),
    buildRequest('Change Password', 'POST', '/auth/change-password', {
      currentPassword: 'Candidate@12345',
      newPassword: 'NewPassword@123',
      confirmNewPassword: 'NewPassword@123'
    }, true),
    buildRequest('Logout User', 'POST', '/auth/logout', null, true),
    buildRequest('Get User Profile', 'GET', '/auth/profile', null, true)
  ]
};

const otpItem = {
  name: 'OTP',
  item: [
    buildRequest('Send Mobile OTP', 'POST', '/otp/mobile/send', {
      mobileNumber: '9876543210',
      purpose: 'registration'
    }),
    buildRequest('Verify Mobile OTP', 'POST', '/otp/mobile/verify', {
      otpRequestId: 'otp-req-id-123',
      otp: '123456'
    }),
    buildRequest('Send Email OTP', 'POST', '/otp/email/send', {
      email: 'candidate@example.com',
      purpose: 'registration'
    }),
    buildRequest('Verify Email OTP', 'POST', '/otp/email/verify', {
      otpRequestId: 'otp-req-id-123',
      otp: '123456'
    }),
    buildRequest('Resend OTP', 'POST', '/otp/resend', {
      otpRequestId: 'otp-req-id-123'
    })
  ]
};

const applicationItem = {
  name: 'Application',
  item: [
    buildRequest('Get or Create Draft Application', 'GET', '/application', null, true),
    buildRequest('Get Application Details', 'GET', '/application/:applicationId', null, true),
    buildRequest('Get Application Step Data', 'GET', '/application/:applicationId/step/:stepNumber', null, true),
    buildRequest('Save Application Step Data', 'POST', '/application/:applicationId/step/:stepNumber', {
      step: 0,
      data: {
        title: 'Mr',
        firstName: 'Test',
        lastName: 'Candidate',
        fatherName: 'Father Name',
        motherName: 'Mother Name',
        dateOfBirth: '2000-01-01',
        gender: 'male',
        nationality: 'Indian',
        identityType: 'aadhaar',
        identityNumber: '123456789012',
        address: {
          permanent: {
            line1: '123 Permanent St',
            city: 'Ranchi',
            state: 'Jharkhand',
            pincode: '834001',
            country: 'India'
          }
        }
      },
      action: 'save_draft'
    }, true),
    buildRequest('Submit Application', 'POST', '/application/:applicationId/submit', null, true),
    buildRequest('Get Print Preview', 'GET', '/application/:applicationId/print', null, true)
  ]
};

const documentsItem = {
  name: 'Documents',
  item: [
    buildRequest('Upload Document (Mock)', 'POST', '/documents/upload', {
      documentType: 'photograph',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      fileSize: 50000
    }, true),
    buildRequest('List Candidate Documents', 'GET', '/documents', null, true),
    buildRequest('Get Document Download URL', 'GET', '/documents/:documentId/download', null, true),
    buildRequest('Delete Document', 'DELETE', '/documents/:documentId', null, true)
  ]
};

const paymentsItem = {
  name: 'Payments',
  item: [
    buildRequest('Initiate Payment', 'POST', '/payment/initiate', {
      applicationId: 'app-uuid-123'
    }, true),
    buildRequest('Verify Payment', 'POST', '/payment/verify', {
      paymentOrderId: 'order-uuid-123',
      transactionId: 'txn-uuid-123',
      status: 'success'
    }, true),
    buildRequest('Get Payment Status', 'GET', '/payment/:applicationId/status', null, true),
    buildRequest('Get Fee Structure', 'GET', '/payment/fee-structure', null, true)
  ]
};

const dashboardItem = {
  name: 'Dashboard',
  item: [
    buildRequest('Get Candidate Dashboard Stats', 'GET', '/dashboard', null, true),
    buildRequest('Get Notifications', 'GET', '/dashboard/notifications', null, true),
    buildRequest('Get Admit Card', 'GET', '/dashboard/admit-card', null, true),
    buildRequest('Get Exam Result', 'GET', '/dashboard/result', null, true)
  ]
};

// Replace items list in the collection
originalCollection.item = [
  authItem,
  otpItem,
  applicationItem,
  documentsItem,
  paymentsItem,
  dashboardItem
];

// Write back updated collection file
fs.writeFileSync(collectionPath, JSON.stringify(originalCollection, null, 4), 'utf8');

console.log('✅ Postman collection regenerated successfully according to current code!');
