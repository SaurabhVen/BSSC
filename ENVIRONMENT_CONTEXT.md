# Environment & Project Context

## 1. System Configuration
- **Operating System:** Ubuntu
- **Shell:** bash
- **Package Manager:** npm
- **Default User:** awanish
- **Home Directory:** `/home/awanish`

## 2. Node.js & Tooling
- **Node Management:** NVM (Node Version Manager)
- **Default Version:** `v20.x`
- **Execution Rules:** 
  - Always run `nvm use 20` before executing Node.js commands if a fresh shell session requires it.
  - Do not change the active Node.js version without asking.
- **Common Commands:** `node -v`, `nvm --version`, `nvm ls`

## 3. Authentication & Security
- Credentials must be stored in environment variables or a Secret Manager.
- **NEVER** hardcode passwords, access keys, or secrets in any code or documentation.

## 4. Environment Variables (Credentials Keys)
*Values are securely stored externally, but the application expects these keys:*

```env
NODE_ENV
PORT
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
DB_SSL
DATABASE_URL
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID
COGNITO_CLIENT_SECRET
JWT_SECRET
S3_BUCKET
SECRETS_MANAGER_NAME
MOCK_COGNITO
MOCK_S3
MOCK_PAYMENT
MOCK_SMS_EMAIL
PAYMENT_MODE
ACTIVE_PAYMENT_GATEWAY
RAZORPAY_KEY_ID
RAZORPAY_SECRET
EASEBUZZ_KEY
EASEBUZZ_SALT
EASEBUZZ_ENV
```

## 5. Folder Structure
```text
├── create_postman.py
├── database_er_diagram.mmd
├── dist
│   ├── src
│   │   ├── config
│   │   ├── controllers
│   │   ├── database
│   │   ├── errors
│   │   ├── handlers
│   │   ├── helpers
│   │   ├── middleware
│   │   ├── repositories
│   │   ├── services
│   │   ├── types
│   │   ├── utils
│   │   └── validators
│   ├── tests
│   ├── tsconfig.tsbuildinfo
│   └── types
├── docs
│   ├── openapi.yaml
│   └── payment_integration.md
├── drizzle.config.js
├── drizzle.config.ts
├── eslint.config.js
├── generate-postman.js
├── get_token.js
├── jest.config.ts
├── jest-results.json
├── package.json
├── package-lock.json
├── README.md
├── scratch
│   ├── admin_login_awanish.js
│   ├── check-cognito-sub.ts
│   ├── test-db-and-jwt.ts
│   ├── test-payment.ts
│   └── ... (various scratch files)
├── scripts
├── serverless.yml
├── src
│   ├── config
│   ├── controllers
│   ├── database
│   │   ├── drizzle.ts
│   │   ├── migrations
│   │   ├── relations.ts
│   │   ├── schema.ts
│   │   └── seeders
│   ├── errors
│   ├── handlers
│   ├── helpers
│   ├── middleware
│   ├── repositories
│   ├── services
│   ├── types
│   ├── utils
│   └── validators
├── template.yaml
├── tests
│   ├── integration
│   └── unit
├── tsconfig.json
└── user_sql_request.sql
```
