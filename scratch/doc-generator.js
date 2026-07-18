const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspaceRoot = '/home/saurabh-mishra/Downloads/jssc-production';
const srcDir = path.join(workspaceRoot, 'src');
const scratchDir = path.join(workspaceRoot, 'scratch');

// Ensure scratch directory exists
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir);
}

// 1. Recursive file finder
function getTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getTsFiles(fullPath));
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

// 2. Parse TypeScript file using AST
function parseTsFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(workspaceRoot, filePath);
  const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);

  const fileData = {
    path: relativePath,
    name: path.basename(filePath),
    dir: path.dirname(relativePath),
    topComment: '',
    classes: [],
    functions: [],
    variables: []
  };

  // Helper to extract comment
  function getCommentForNode(node) {
    const fullText = sourceFile.text;
    const ranges = ts.getLeadingCommentRanges(fullText, node.pos);
    if (ranges && ranges.length > 0) {
      return ranges.map(range => {
        let text = fullText.slice(range.pos, range.end);
        text = text.replace(/^\/\*\*?|\*\/$/g, '');
        text = text.replace(/^\s*\*\s?/gm, '');
        text = text.replace(/^\s*\/\/+/gm, '');
        return text.trim();
      }).filter(Boolean).join('\n');
    }
    return '';
  }

  // Find top level file comment (before first non-comment text)
  const leadingComments = ts.getLeadingCommentRanges(sourceFile.text, 0);
  if (leadingComments && leadingComments.length > 0) {
    fileData.topComment = leadingComments.map(range => {
      let text = sourceFile.text.slice(range.pos, range.end);
      text = text.replace(/^\/\*\*?|\*\/$/g, '');
      text = text.replace(/^\s*\*\s?/gm, '');
      text = text.replace(/^\s*\/\/+/gm, '');
      return text.trim();
    }).filter(Boolean).join('\n');
  }

  function visit(node) {
    // Classes
    if (ts.isClassDeclaration(node)) {
      const className = node.name ? node.name.text : 'AnonymousClass';
      const isExported = node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const classComment = getCommentForNode(node);
      const methods = [];

      node.members.forEach(member => {
        if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
          const isConstructor = ts.isConstructorDeclaration(member);
          const name = isConstructor ? 'constructor' : member.name.text;
          const isStatic = member.modifiers && member.modifiers.some(m => m.kind === ts.SyntaxKind.StaticKeyword);
          const isPrivate = member.modifiers && member.modifiers.some(m => m.kind === ts.SyntaxKind.PrivateKeyword);
          const isProtected = member.modifiers && member.modifiers.some(m => m.kind === ts.SyntaxKind.ProtectedKeyword);
          const accessibility = isPrivate ? 'private' : (isProtected ? 'protected' : 'public');

          const params = member.parameters.map(p => {
            const pName = p.name.text;
            const pType = p.type ? p.type.getText(sourceFile) : 'any';
            const isOptional = p.questionToken ? '?' : '';
            return `${pName}${isOptional}: ${pType}`;
          });

          const returnType = member.type ? member.type.getText(sourceFile) : 'any';
          const methodComment = getCommentForNode(member);

          methods.push({
            name,
            isStatic,
            accessibility,
            params,
            returnType,
            comment: methodComment
          });
        }
      });

      fileData.classes.push({
        name: className,
        isExported,
        comment: classComment,
        methods
      });
    }
    // Functions
    else if (ts.isFunctionDeclaration(node)) {
      const name = node.name ? node.name.text : 'anonymous';
      const isExported = node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const funcComment = getCommentForNode(node);

      const params = node.parameters.map(p => {
        const pName = p.name.text;
        const pType = p.type ? p.type.getText(sourceFile) : 'any';
        const isOptional = p.questionToken ? '?' : '';
        return `${pName}${isOptional}: ${pType}`;
      });

      const returnType = node.type ? node.type.getText(sourceFile) : 'any';

      fileData.functions.push({
        name,
        isExported,
        comment: funcComment,
        params,
        returnType
      });
    }
    // Exported variable statements
    else if (ts.isVariableStatement(node)) {
      const isExported = node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const comment = getCommentForNode(node);

      node.declarationList.declarations.forEach(decl => {
        const name = decl.name.text;
        const isFunction = decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
        
        if (isFunction) {
          const params = decl.initializer.parameters.map(p => {
            const pName = p.name.text;
            const pType = p.type ? p.type.getText(sourceFile) : 'any';
            const isOptional = p.questionToken ? '?' : '';
            return `${pName}${isOptional}: ${pType}`;
          });
          const returnType = decl.initializer.type ? decl.initializer.type.getText(sourceFile) : 'any';

          fileData.functions.push({
            name,
            isExported,
            comment: comment || getCommentForNode(decl),
            params,
            returnType,
            isArrow: true
          });
        } else if (isExported) {
          // Check for variable exports (schemas, tables, constants, configurations)
          let typeStr = 'any';
          try {
            typeStr = decl.type ? decl.type.getText(sourceFile) : 'any';
          } catch(e) {}
          fileData.variables.push({
            name,
            type: typeStr,
            comment: comment || getCommentForNode(decl)
          });
        }
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return fileData;
}

// Map subfolders to descriptive categories
const categoryDescriptions = {
  'src/config': 'System configurations and environment variables loading.',
  'src/controllers': 'Orchestrators that receive API request payloads, invoke validators, and route actions to business services.',
  'src/database': 'Database ORM schemas, migration setup, seed configurations, and relations defined using Drizzle ORM.',
  'src/database/seeders': 'Database seeder scripts that populate initial mock or lookup data.',
  'src/errors': 'Custom application error classes providing standard structure for error reporting.',
  'src/handlers': 'AWS Lambda Entrypoints and Lambda handlers (Cognito events, custom SMS, background actions).',
  'src/handlers/auth': 'AWS Lambda handlers specific to user, admin, and candidate authentication flow.',
  'src/handlers/admin': 'AWS Lambda handlers for admin actions (data export, validation, statistics).',
  'src/handlers/otp': 'AWS Lambda handlers for OTP creation, sending, and verification processes.',
  'src/helpers': 'Reusable utility functions for working with multipart payloads, HTTP requests, and standardized responses.',
  'src/middleware': 'HTTP intermediate logic processing (e.g., authentication verify, schema validations, error catching).',
  'src/repositories': 'Data Access Layer encapsulating direct database operations via Drizzle ORM.',
  'src/services': 'Business Logic Layer coordinating transactional workflows, third-party adapters (Razorpay, GetEPay, AWS SES/SNS).',
  'src/types': 'Common TypeScript definitions, models, and interface definitions.',
  'src/utils': 'General utilities including age calculation, captcha generation, AWS Cognito helper, email sending, SMS integration, and PDF helper.',
  'src/validators': 'Zod verification schemas for request body and query parameter validation.'
};

function getCategoryName(dir) {
  return dir.replace(/\\/g, '/'); // normalize backslashes
}

// Generate the HTML content
function generateHtmlReport(groupedData, counts) {
  let fileEntries = '';
  let tocItems = '';
  let index = 1;

  // Build Table of Contents and file cards
  for (const [folder, files] of Object.entries(groupedData)) {
    const sectionId = folder.replace(/\//g, '_');
    const folderDesc = categoryDescriptions[folder] || 'Submodule containing codebase files.';
    
    tocItems += `
      <div class="toc-section">
        <h3><a href="#section_${sectionId}">${folder}</a></h3>
        <p class="toc-desc">${folderDesc}</p>
        <ul class="toc-files-list">
    `;

    files.forEach(file => {
      tocItems += `
        <li>
          <a href="#file_${file.path.replace(/\//g, '_').replace(/\./g, '_')}">${file.name}</a>
          <span class="file-summary">${getFileShortSummary(file)}</span>
        </li>
      `;
    });

    tocItems += `</ul></div>`;

    fileEntries += `
      <div id="section_${sectionId}" class="category-divider">
        <h2>${folder.toUpperCase()}</h2>
        <p class="category-meta-desc">${folderDesc}</p>
      </div>
    `;

    files.forEach(file => {
      const fileId = `file_${file.path.replace(/\//g, '_').replace(/\./g, '_')}`;
      
      fileEntries += `
        <div id="${fileId}" class="file-card">
          <div class="file-header">
            <span class="file-path">${file.path}</span>
            <span class="file-badge">${folder.split('/').pop().toUpperCase()}</span>
          </div>
          
          ${file.topComment ? `<div class="file-description">${escapeHtml(file.topComment)}</div>` : `<div class="file-description italic">No description provided in file comments.</div>`}
          
          <!-- Classes -->
          ${file.classes.map(cls => `
            <div class="class-block">
              <div class="class-title">
                <span class="keyword">class</span> <span class="name">${cls.name}</span>
              </div>
              ${cls.comment ? `<div class="comment">${escapeHtml(cls.comment)}</div>` : ''}
              
              <table class="functions-table">
                <thead>
                  <tr>
                    <th style="width: 30%;">Method / Signature</th>
                    <th style="width: 70%;">Description & Parameters</th>
                  </tr>
                </thead>
                <tbody>
                  ${cls.methods.map(m => `
                    <tr>
                      <td class="function-signature">
                        <span class="access-mod">${m.accessibility}</span> 
                        ${m.isStatic ? '<span class="static-mod">static</span>' : ''} 
                        <strong>${m.name}</strong>(${m.params.map(p => p.split(':')[0]).join(', ')})
                      </td>
                      <td>
                        ${m.comment ? `<div class="comment">${escapeHtml(m.comment)}</div>` : '<div class="comment italic">No doc comment</div>'}
                        <div class="method-meta">
                          <strong>Params:</strong> <code>${m.params.length ? m.params.join(', ') : 'none'}</code><br>
                          <strong>Returns:</strong> <code>${m.returnType}</code>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}

          <!-- Standalone & Arrow Functions -->
          ${file.functions.length ? `
            <div class="functions-block">
              <h3>Functions</h3>
              <table class="functions-table">
                <thead>
                  <tr>
                    <th style="width: 30%;">Function / Signature</th>
                    <th style="width: 70%;">Description & Parameters</th>
                  </tr>
                </thead>
                <tbody>
                  ${file.functions.map(f => `
                    <tr>
                      <td class="function-signature">
                        ${f.isExported ? '<span class="access-mod">export</span>' : '<span class="static-mod">local</span>'}
                        <strong>${f.name}</strong>(${f.params.map(p => p.split(':')[0]).join(', ')})
                      </td>
                      <td>
                        ${f.comment ? `<div class="comment">${escapeHtml(f.comment)}</div>` : '<div class="comment italic">No doc comment</div>'}
                        <div class="method-meta">
                          <strong>Params:</strong> <code>${f.params.length ? f.params.join(', ') : 'none'}</code><br>
                          <strong>Returns:</strong> <code>${f.returnType}</code>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <!-- Exported Constants / Variables / Schemas -->
          ${file.variables.length ? `
            <div class="variables-block">
              <h3>Exported Variables & Schemas</h3>
              <table class="variables-table">
                <thead>
                  <tr>
                    <th style="width: 35%;">Variable Name</th>
                    <th style="width: 25%;">Type</th>
                    <th style="width: 40%;">Description</th>
                  </tr>
                </thead>
                <tbody>
                  ${file.variables.map(v => `
                    <tr>
                      <td class="variable-name"><code>${v.name}</code></td>
                      <td class="variable-type"><code>${v.type}</code></td>
                      <td class="comment">${v.comment ? escapeHtml(v.comment) : '<span class="italic">No description</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${(!file.classes.length && !file.functions.length && !file.variables.length) ? `
            <div class="no-exports">No classes, functions, or variables exported from this module.</div>
          ` : ''}
        </div>
      `;
    });
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BSSC Candidate Portal Codebase Reference</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0f172a;       /* Deep dark navy slate */
      --primary-light: #2563eb; /* Cobalt Blue */
      --secondary: #334155;     /* Muted Slate */
      --text-main: #1e293b;     /* Slate 800 */
      --text-muted: #64748b;    /* Slate 500 */
      --border: #cbd5e1;        /* Slate 300 */
      --border-light: #e2e8f0;  /* Slate 200 */
      --bg-light: #f8fafc;      /* Slate 50 */
      --code-bg: #f1f5f9;       /* Slate 100 */
      --tag-class: #0369a1;     /* Light Blue 700 */
      --tag-func: #047857;      /* Emerald 700 */
      --tag-var: #b45309;       /* Amber 700 */
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: var(--text-main);
      background-color: #ffffff;
      line-height: 1.6;
      font-size: 13px;
    }

    /* Print settings */
    @page {
      size: A4 portrait;
      margin: 18mm 15mm 18mm 15mm;
    }

    /* Helper styling */
    .page-break {
      page-break-after: always;
    }

    /* Cover Page */
    .cover-page {
      text-align: center;
      padding-top: 100px;
      padding-bottom: 50px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      page-break-after: always;
    }

    .cover-header {
      margin-bottom: 80px;
    }

    .cover-header .gov-title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 2px;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .cover-title {
      font-size: 42px;
      font-weight: 800;
      line-height: 1.2;
      color: var(--primary);
      margin-bottom: 24px;
      letter-spacing: -0.5px;
    }

    .cover-subtitle {
      font-size: 18px;
      font-weight: 400;
      color: var(--secondary);
      max-width: 600px;
      margin: 0 auto 40px;
      line-height: 1.5;
    }

    .cover-divider {
      width: 100px;
      height: 4px;
      background-color: var(--primary-light);
      margin: 0 auto;
      border-radius: 2px;
    }

    .cover-details {
      margin-top: 150px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      border-top: 1px solid var(--border-light);
      border-bottom: 1px solid var(--border-light);
      padding: 30px 0;
      max-width: 700px;
      margin-left: auto;
      margin-right: auto;
    }

    .detail-item h4 {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .detail-item p {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary);
    }

    .cover-footer {
      margin-top: 120px;
      font-size: 11px;
      color: var(--text-muted);
      letter-spacing: 0.5px;
    }

    /* Executive Summary */
    .section-title {
      font-size: 22px;
      font-weight: 800;
      color: var(--primary);
      border-bottom: 2px solid var(--primary);
      padding-bottom: 8px;
      margin-top: 30px;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-text {
      font-size: 13.5px;
      line-height: 1.7;
      color: var(--secondary);
      margin-bottom: 24px;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }

    .stat-card {
      background-color: var(--bg-light);
      border: 1px solid var(--border-light);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .stat-num {
      font-size: 28px;
      font-weight: 800;
      color: var(--primary-light);
      line-height: 1.1;
    }

    .stat-lbl {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 600;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }

    /* Table of Contents */
    .toc-section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .toc-section h3 {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary);
      border-bottom: 1px solid var(--border-light);
      padding-bottom: 4px;
      margin-bottom: 6px;
    }

    .toc-section h3 a {
      color: var(--primary);
      text-decoration: none;
    }

    .toc-desc {
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .toc-files-list {
      list-style-type: none;
      padding-left: 10px;
    }

    .toc-files-list li {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
      font-size: 12px;
    }

    .toc-files-list a {
      color: var(--primary-light);
      text-decoration: none;
      font-weight: 500;
      font-family: 'Fira Code', monospace;
      font-size: 11.5px;
    }

    .file-summary {
      color: var(--text-muted);
      font-size: 11px;
      text-align: right;
      max-width: 400px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Section Category Header */
    .category-divider {
      page-break-before: always;
      border-bottom: 3px solid var(--primary);
      padding-bottom: 10px;
      margin-bottom: 30px;
      margin-top: 40px;
    }

    .category-divider h2 {
      font-size: 24px;
      font-weight: 800;
      color: var(--primary);
      letter-spacing: 0.5px;
    }

    .category-meta-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* File Card */
    .file-card {
      background-color: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }

    /* Avoid break inside class blocks or functions block if possible */
    .class-block, .functions-block, .variables-block {
      margin-top: 20px;
    }

    /* Avoid breaking individual function/variable entries halfway across pages */
    .functions-table tr, .variables-table tr {
      page-break-inside: avoid;
    }

    .file-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-light);
      padding-bottom: 8px;
      margin-bottom: 12px;
    }

    .file-path {
      font-family: 'Fira Code', monospace;
      font-size: 13px;
      font-weight: 600;
      color: var(--primary);
    }

    .file-badge {
      background-color: var(--bg-light);
      border: 1px solid var(--border);
      color: var(--secondary);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .file-description {
      font-size: 12.5px;
      color: var(--secondary);
      line-height: 1.6;
      background-color: var(--bg-light);
      padding: 10px 14px;
      border-left: 3px solid var(--primary-light);
      border-radius: 0 4px 4px 0;
      margin-bottom: 15px;
      white-space: pre-line;
    }

    .italic {
      font-style: italic;
    }

    /* Classes block */
    .class-title {
      font-size: 15px;
      font-weight: 700;
      font-family: 'Fira Code', monospace;
      color: var(--tag-class);
      margin-bottom: 8px;
      background-color: #f0fdf4;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
    }

    .keyword {
      color: #be123c; /* Rose 700 */
      font-weight: 700;
    }

    .class-block .comment {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 12px;
      padding-left: 8px;
    }

    /* Functions Table */
    .functions-table, .variables-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 12px;
    }

    .functions-table th, .variables-table th {
      background-color: var(--bg-light);
      border: 1px solid var(--border-light);
      padding: 8px 12px;
      font-weight: 700;
      text-align: left;
      color: var(--secondary);
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .functions-table td, .variables-table td {
      border: 1px solid var(--border-light);
      padding: 10px 12px;
      vertical-align: top;
    }

    .function-signature {
      font-family: 'Fira Code', monospace;
      font-size: 11.5px;
      color: var(--primary);
    }

    .access-mod {
      color: #4338ca; /* Indigo 700 */
      font-weight: 600;
      margin-right: 4px;
    }

    .static-mod {
      color: #b45309; /* Amber 700 */
      font-weight: 600;
      margin-right: 4px;
    }

    .functions-table .comment, .variables-table .comment {
      font-size: 12px;
      color: var(--text-main);
      margin-bottom: 8px;
      line-height: 1.5;
      white-space: pre-line;
    }

    .method-meta {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.6;
    }

    .method-meta code {
      font-family: 'Fira Code', monospace;
      background-color: var(--code-bg);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 10px;
      color: #0f172a;
    }

    /* Variables Table */
    .variable-name {
      font-family: 'Fira Code', monospace;
      font-weight: 600;
      color: var(--tag-var);
      font-size: 11px;
    }

    .variable-type {
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      color: var(--secondary);
    }

    .no-exports {
      font-size: 12px;
      color: var(--text-muted);
      font-style: italic;
      margin-top: 10px;
    }

    .no-exports::before {
      content: 'ℹ ';
      font-style: normal;
    }

    /* Footer disclaimer at the bottom of pages */
    .footer-note {
      text-align: center;
      margin-top: 50px;
      font-size: 11px;
      color: var(--text-muted);
      border-top: 1px solid var(--border-light);
      padding-top: 15px;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="gov-title">BSSC Recruitment Candidate Portal</div>
      <div class="cover-divider"></div>
    </div>
    
    <div>
      <h1 class="cover-title">Codebase Architectural Reference & API Specifications</h1>
      <p class="cover-subtitle">A comprehensive generated reference cataloging every source file, class definition, helper module, database schema, controller orchestrator, and utility function.</p>
    </div>

    <div class="cover-details">
      <div class="detail-item">
        <h4>Total Files</h4>
        <p>${counts.totalFiles}</p>
      </div>
      <div class="detail-item">
        <h4>Total Classes</h4>
        <p>${counts.totalClasses}</p>
      </div>
      <div class="detail-item">
        <h4>Total Functions</h4>
        <p>${counts.totalFunctions}</p>
      </div>
    </div>

    <div class="cover-footer">
      Generated automatically on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | Platform Engine Version 1.0.0
    </div>
  </div>

  <!-- Executive Summary -->
  <div class="page-break">
    <h2 class="section-title">Architectural Overview</h2>
    <div class="summary-text">
      <p style="margin-bottom:12px;">This BSSC Candidate Portal Backend is built as an enterprise-grade Serverless Application utilizing TypeScript. It is designed to run efficiently on AWS Lambda using API Gateway triggers, maintaining a clean architectural decoupling of concerns. Below is a summary of the layout and flow of logic:</p>
      <ul style="margin-left: 20px; margin-bottom: 20px; line-height: 1.8;">
        <li><strong>Controller Layer:</strong> Encapsulates entry routing logic. Controllers receive events, invoke schema validations, execute business operations via services, and return normalized responses.</li>
        <li><strong>Service Layer:</strong> Contains the core business rules and manages workflows (e.g. registration steps, payment status inquiries, document validations). Handles external integrations such as Cognito, Razorpay, GetEPay, AWS SES, and SMS gateways.</li>
        <li><strong>Data Access Layer (Repositories):</strong> Executes database operations. Abstracts query creation using the Drizzle ORM and interfaces directly with the PostgreSQL connection pool.</li>
        <li><strong>Validation Layer (Validators):</strong> Enforces request and response constraints at the system boundaries using Zod validation schemas.</li>
        <li><strong>Database Layer:</strong> Definitively defines database tables, primary/foreign relationships, lookup seeders, and tracks SQL alterations via drizzle-kit migrations.</li>
      </ul>
    </div>

    <h2 class="section-title">Codebase Metrics</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-num">${counts.totalFiles}</div>
        <div class="stat-lbl">Source Files</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${counts.totalClasses}</div>
        <div class="stat-lbl">Classes</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${counts.totalFunctions}</div>
        <div class="stat-lbl">Functions</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${counts.totalVariables}</div>
        <div class="stat-lbl">Exported Variables</div>
      </div>
    </div>
  </div>

  <!-- Table of Contents -->
  <div class="page-break">
    <h2 class="section-title">Table of Contents</h2>
    <div class="toc-grid">
      ${tocItems}
    </div>
  </div>

  <!-- Detailed Reference -->
  <div>
    ${fileEntries}
  </div>

  <div class="footer-note">
    End of Documentation. Generated for Bihar Staff Selection Commission Candidate Portal backend.
  </div>

</body>
</html>
  `;
}

// Extract a clean 1-line description of the file for the TOC
function getFileShortSummary(file) {
  if (file.topComment) {
    const firstLine = file.topComment.split('\n')[0].trim();
    if (firstLine.length > 80) {
      return firstLine.substring(0, 77) + '...';
    }
    return firstLine;
  }
  
  if (file.classes.length) {
    return `Contains class ${file.classes.map(c => c.name).join(', ')}`;
  }
  
  if (file.functions.length) {
    return `Defines functions ${file.functions.slice(0, 3).map(f => f.name).join(', ')}${file.functions.length > 3 ? '...' : ''}`;
  }
  
  if (file.variables.length) {
    return `Exports variables ${file.variables.slice(0, 3).map(v => v.name).join(', ')}${file.variables.length > 3 ? '...' : ''}`;
  }
  
  return 'Utility or configuration script.';
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 3. Main execution flow
function main() {
  console.log('Finding all source files...');
  const files = getTsFiles(srcDir);
  console.log(`Found ${files.length} TypeScript files.`);

  const parsedFiles = files.map(file => {
    try {
      return parseTsFile(file);
    } catch (e) {
      console.error(`Error parsing file ${file}:`, e);
      return null;
    }
  }).filter(Boolean);

  // Group files by their relative containing folder inside src/
  const groupedData = {};
  const counts = {
    totalFiles: parsedFiles.length,
    totalClasses: 0,
    totalFunctions: 0,
    totalVariables: 0
  };

  parsedFiles.forEach(file => {
    counts.totalClasses += file.classes.length;
    counts.totalFunctions += file.functions.length;
    counts.totalVariables += file.variables.length;

    // Categorize
    const category = getCategoryName(file.dir);
    if (!groupedData[category]) {
      groupedData[category] = [];
    }
    groupedData[category].push(file);
  });

  // Sort groups alphabetically and sort files inside groups
  const sortedGroupedData = {};
  Object.keys(groupedData).sort().forEach(key => {
    sortedGroupedData[key] = groupedData[key].sort((a, b) => a.name.localeCompare(b.name));
  });

  console.log('Generating HTML report content...');
  const htmlContent = generateHtmlReport(sortedGroupedData, counts);
  const htmlPath = path.join(scratchDir, 'code_documentation.html');
  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`Saved HTML report to ${htmlPath}`);

  console.log('Converting HTML report to PDF using headless Chrome...');
  const pdfPath = path.join(workspaceRoot, 'BSSC_Codebase_Documentation.pdf');
  
  try {
    // Run google-chrome in headless mode to render the PDF
    const cmd = `google-chrome --headless --disable-gpu --no-sandbox --print-to-pdf="${pdfPath}" "file://${htmlPath}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log(`Successfully generated PDF! Saved to ${pdfPath}`);
  } catch (error) {
    console.error('Error generating PDF with google-chrome:', error);
    process.exit(1);
  }
}

main();
