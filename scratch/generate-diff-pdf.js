const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({ margin: 50, autoFirstPage: true });
const outputFilePath = path.join(__dirname, 'diff_report.pdf');
doc.pipe(fs.createWriteStream(outputFilePath));

// --- 1. TITLE & OVERVIEW PAGE ---
doc.fillColor('#1A365D')
   .fontSize(22)
   .text('TRANSITION REPORT: AWS COGNITO TO DATABASE JWT', { align: 'center' });
doc.moveDown(0.3);

doc.fillColor('#4A5568')
   .fontSize(11)
   .text('Project: BSSC Backend Portal (Cloned from bssc Production)', { align: 'center' });
doc.text('Date: June 30, 2026', { align: 'center' });
doc.moveDown(1);

// Line separator
doc.strokeColor('#CBD5E0').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
doc.moveDown(1.5);

doc.fillColor('#2B6CB0')
   .fontSize(14)
   .text('1. Overview of Transition', { underline: true });
doc.moveDown(0.3);

doc.fillColor('#2D3748')
   .fontSize(10)
   .text('The BSSC Backend Project has been decoupled from AWS Cognito. All identity lookup, validation, password hashing, and session management are now handled locally within the PostgreSQL database and locally-signed JSON Web Tokens (JWT). This eliminates dependencies on AWS Cognito SDKs, JWKS URL verification, and external trigger setups.', { align: 'justify', lineGap: 2 });
doc.moveDown(1.5);

doc.fillColor('#2B6CB0')
   .fontSize(14)
   .text('2. Summary of Changes', { underline: true });
doc.moveDown(0.3);

const changesSummary = [
  { item: 'src/utils/jwt.ts (Added)', desc: 'New local JWT utility file. Uses bcryptjs for password hashing and jsonwebtoken for token operations.' },
  { item: 'src/middleware/auth.ts (Modified)', desc: 'Refactored auth middleware to decode local JWT and query users by ID from local PostgreSQL.' },
  { item: 'src/services/auth.service.ts (Modified)', desc: 'Refactored login, register, candidateRegister, token refresh, forgot/reset password, and logout methods.' },
  { item: 'src/database/schema.ts (Modified)', desc: 'Simplified users table schema by removing Cognito Sub ID columns and unique indexes.' },
  { item: 'src/utils/cognito.ts (Removed)', desc: 'Deleted legacy AWS Cognito provider integration helper.' },
  { item: 'Cognito Trigger functions (Removed)', desc: 'Removed customMessage and customSmsSender trigger handlers and serverless trigger mappings.' }
];

changesSummary.forEach(ch => {
  doc.fillColor('#2D3748')
     .fontSize(10)
     .text(`•  ${ch.item}: `, { bold: true, continued: true })
     .fillColor('#4A5568')
     .text(ch.desc);
  doc.moveDown(0.3);
});

// Helper for adding code pages (reads from bssc directory by default, or absolute path)
function addCodeSection(title, filePath, startLine, endLine, isOldProject = false) {
  doc.addPage();
  
  const sectionTitle = isOldProject ? `${title} (REMOVED)` : title;
  const headerColor = isOldProject ? '#C53030' : '#1A365D'; // Red for removed, Blue/Navy for added/modified
  
  doc.font('Helvetica-Bold').fontSize(14).fillColor(headerColor).text(sectionTitle);
  doc.moveDown(0.5);

  const baseDir = isOldProject 
    ? '/home/saurabh-mishra/Downloads/bssc-production'
    : '/home/saurabh-mishra/Downloads/bssc';
    
  const absolutePath = path.resolve(baseDir, filePath);
  let fileContent = '';
  
  try {
    fileContent = fs.readFileSync(absolutePath, 'utf-8');
    if (startLine && endLine) {
      const lines = fileContent.split('\n');
      fileContent = lines.slice(startLine - 1, endLine).join('\n');
    }
  } catch (err) {
    fileContent = `// File not found or read error: ${filePath}`;
  }

  doc.font('Courier').fontSize(8.5).fillColor('#2D3748').text(fileContent, { lineGap: 1.2 });
}

// --- 2. CODE APPENDIX PAGES (ADDED / MODIFIED) ---
addCodeSection('A. Local JWT Utility (src/utils/jwt.ts)', 'src/utils/jwt.ts');
addCodeSection('B. Auth Middleware (src/middleware/auth.ts)', 'src/middleware/auth.ts');
addCodeSection('C. Simplified User DB Schema (src/database/schema.ts)', 'src/database/schema.ts', 31, 75);
addCodeSection('D. Refactored public.controller.ts (getCognitoSubId)', 'src/controllers/public.controller.ts', 84, 125);
addCodeSection('E. Refactored Auth Service - Login (src/services/auth.service.ts)', 'src/services/auth.service.ts', 96, 153);
addCodeSection('F. Refactored Auth Service - Register (src/services/auth.service.ts)', 'src/services/auth.service.ts', 154, 235);
addCodeSection('G. Refactored Auth Service - Candidate flows (src/services/auth.service.ts)', 'src/services/auth.service.ts', 236, 329);

// --- 3. CODE APPENDIX PAGES (REMOVED FROM bssc) ---
addCodeSection('H. Legacy Cognito - Login & SignUp Commands', 'src/utils/cognito.ts', 83, 218, true);
addCodeSection('I. Legacy Cognito Trigger - Custom SMS Sender handler', 'src/handlers/customSMSSender.ts', 1, 60, true);
addCodeSection('J. Legacy Users DB Schema with Cognito field', 'src/database/schema.ts', 32, 70, true);

doc.end();
console.log('PDF report with all added & removed code generated successfully at:', outputFilePath);
