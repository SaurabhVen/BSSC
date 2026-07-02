const fs = require('fs');
const path = require('path');

const userHtmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>BSSC Application Form | Official Government Document</title>
  <!-- Google Fonts: Public Sans (Institutional Grade) -->
  <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    /* ---------- DESIGN SYSTEM (DESIGN.md) ---------- */
    /* CSS Custom Properties – Tonal layers, spacing, shapes, elevation */
    :root {
      /* Surfaces & tonal layers */
      --surface: #f9f9fc;
      --surface-dim: #dadadc;
      --surface-bright: #f9f9fc;
      --surface-container-lowest: #ffffff;
      --surface-container-low: #f3f3f6;
      --surface-container: #eeeef0;
      --surface-container-high: #e8e8ea;
      --surface-container-highest: #e2e2e5;
      --on-surface: #1a1c1e;
      --on-surface-variant: #404945;
      --inverse-surface: #2f3133;
      --inverse-on-surface: #f0f0f3;
      --outline: #707975;
      --outline-variant: #bfc9c4;
      --surface-tint: #2b6958;

      /* Primary: dense government green (authority) */
      --primary: #003227;
      --on-primary: #ffffff;
      --primary-container: #004b3c;
      --on-primary-container: #7cbaa6;
      --inverse-primary: #95d3bf;

      /* Secondary: professional slate-blue grey */
      --secondary: #48626e;
      --on-secondary: #ffffff;
      --secondary-container: #cbe7f5;
      --on-secondary-container: #4e6874;

      /* Tertiary: muted mint-grey highlights */
      --tertiary: #232e26;
      --on-tertiary: #ffffff;
      --tertiary-container: #39443c;
      --on-tertiary-container: #a4b1a6;

      /* Error / alerts */
      --error: #ba1a1a;
      --on-error: #ffffff;
      --error-container: #ffdad6;
      --on-error-container: #93000a;

      /* Fixed & additional layers */
      --primary-fixed: #b0efda;
      --primary-fixed-dim: #95d3bf;
      --secondary-fixed: #cbe7f5;
      --tertiary-fixed: #d9e6da;
      --background: #f9f9fc;
      --on-background: #1a1c1e;
      --surface-variant: #e2e2e5;

      /* Shadows (elevation tonal system) */
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.05);
      --shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
      --shadow-lg: 0 8px 24px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.02);

      /* Spacing (4px baseline) */
      --space-xs: 4px;
      --space-sm: 8px;
      --space-md: 16px;
      --space-lg: 24px;
      --space-xl: 32px;
      --space-2xl: 48px;
      --space-3xl: 64px;
      --container-max: 1280px;
      --gutter: 24px;
      --margin-mobile: 16px;

      /* Shape radii (Soft level 1) */
      --radius-sm: 0.125rem;
      --radius-default: 0.25rem;
      --radius-md: 0.375rem;
      --radius-lg: 0.5rem;
      --radius-xl: 0.75rem;
      --radius-full: 9999px;

      /* Typography scale (Public Sans) */
      --font-sans: 'Public Sans', sans-serif;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-sans);
      background-color: var(--surface-dim);
      color: var(--on-surface);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      padding: var(--space-lg) var(--margin-mobile);
    }

    /* Container – max-width institutional centered layout */
    .a4-container {
      max-width: 1100px;
      width: 100%;
      margin: 0 auto;
      background-color: var(--surface-container-lowest);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--space-xl) var(--space-xl);
      transition: all 0.2s ease;
    }

    /* Typography system – based on DESIGN.md scale */
    .display-lg {
      font-family: var(--font-sans);
      font-size: 48px;
      font-weight: 700;
      line-height: 56px;
      letter-spacing: -0.02em;
    }
    .headline-lg {
      font-family: var(--font-sans);
      font-size: 32px;
      font-weight: 600;
      line-height: 40px;
    }
    .headline-md {
      font-family: var(--font-sans);
      font-size: 24px;
      font-weight: 600;
      line-height: 32px;
    }
    .body-lg {
      font-family: var(--font-sans);
      font-size: 18px;
      font-weight: 400;
      line-height: 28px;
    }
    .body-md {
      font-family: var(--font-sans);
      font-size: 16px;
      font-weight: 400;
      line-height: 24px;
    }
    .label-md {
      font-family: var(--font-sans);
      font-size: 14px;
      font-weight: 600;
      line-height: 20px;
      letter-spacing: 0.01em;
    }
    .caption {
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 400;
      line-height: 16px;
    }

    /* DATA TABLES – Structured, clean, 1px horizontal/vertical dividers */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      background-color: var(--surface-container-lowest);
      border-radius: var(--radius-md);
      overflow: hidden;
      margin-bottom: var(--space-lg);
    }
    .data-table th,
    .data-table td {
      border: 1px solid var(--outline-variant);
      padding: 12px var(--space-md);
      vertical-align: top;
      font-size: 0.875rem;
    }
    .data-table th {
      background-color: var(--surface-container-highest);
      font-weight: 600;
      font-family: var(--font-sans);
      letter-spacing: 0.01em;
      color: var(--on-surface);
    }
    .label-cell {
      background-color: var(--surface-container-low);
      font-weight: 500;
      width: 34%;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.3px;
    }
    .value-cell {
      font-weight: 500;
      background-color: var(--surface-container-lowest);
      text-transform: uppercase;
    }
    .value-cell.lowercase {
      text-transform: lowercase;
    }

    /* Nested tables inside address blocks */
    .nested-table {
      width: 100%;
      border-collapse: collapse;
    }
    .nested-table td {
      border: 1px solid var(--outline-variant);
      padding: 10px 12px;
      vertical-align: top;
      text-transform: uppercase;
    }

    /* Separators & vertical rhythm */
    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-left: 5px solid var(--primary);
      padding-left: var(--space-md);
      margin-bottom: var(--space-lg);
      color: var(--primary);
    }
    .subsection-heading {
      font-weight: 700;
      font-size: 1rem;
      text-transform: uppercase;
      background: var(--surface-container-high);
      display: inline-block;
      padding: 4px 12px;
      border-radius: var(--radius-sm);
      margin-bottom: var(--space-md);
      letter-spacing: 0.3px;
    }

    /* Signature section */
    .signature-box {
      border-top: 2px solid var(--primary);
      width: 260px;
      text-align: center;
      padding-top: var(--space-sm);
      margin-top: var(--space-xl);
    }
    footer {
      border-top: 1px solid var(--outline-variant);
      margin-top: var(--space-2xl);
      padding-top: var(--space-md);
      text-align: center;
      font-size: 11px;
      color: var(--on-surface-variant);
    }

    /* Photo container – tonal surface elevation */
    .photo-frame {
      background-color: var(--surface-container-low);
      border: 1px solid var(--outline-variant);
      border-radius: var(--radius-md);
      padding: var(--space-sm);
      text-align: center;
    }
    .photo-img {
      width: 100%;
      height: 160px;
      object-fit: cover;
      background: #eef2f0;
      border-radius: var(--radius-sm);
    }

    /* Checkbox styling for document table */
    .checkbox-tick {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background-color: var(--surface-container-lowest);
      border: 2px solid var(--primary);
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: bold;
      color: var(--primary);
      margin-right: 6px;
    }
    .checkbox-tick.checked {
      background-color: var(--primary);
      color: white;
    }
    .checkbox-cross {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background-color: var(--error-container);
      border: 2px solid var(--error);
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: bold;
      color: var(--error);
      margin-right: 6px;
    }
    .checkbox-cross span {
      font-size: 16px;
      font-weight: 800;
    }

    /* responsive (mobile refinement) */
    @media (max-width: 768px) {
      .a4-container {
        padding: var(--space-lg);
      }
      .data-table th, .data-table td {
        padding: 8px 10px;
        font-size: 0.75rem;
      }
      .headline-lg {
        font-size: 24px;
        line-height: 32px;
      }
    }

    /* Print styles for official document */
    @media print {
      body {
        background: white;
        padding: 0;
        margin: 0;
      }
      .a4-container {
        box-shadow: none;
        padding: 0.2in;
        max-width: 100%;
      }
      .data-table td, .data-table th {
        border-color: #aaa;
      }
    }
  </style>
</head>
<body>
<div class="a4-container" data-purpose="application-document">
 
  <!-- HEADER: Government of Jharkhand + BSSC + official logos (right-side emblem removed) -->
  <header style="margin-bottom: var(--space-xl);">
    <!-- top contact info row: phone & email (institutional) -->
    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-sm); border-bottom: 1px solid var(--outline-variant); padding-bottom: var(--space-sm); margin-bottom: var(--space-md); font-size: 12px; color: var(--on-surface-variant);">
      <div style="display: flex; gap: var(--space-sm);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
        <span>9330251588, 7355759501, 6393905801</span>
      </div>
      <div style="display: flex; gap: var(--space-sm);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        <span>jkce2026helpdesk@gmail.com</span>
      </div>
      <div style="display: flex; gap: var(--space-sm);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>Mon-Sat 09:00 AM - 06:00 PM</span></div>
    </div>
   
    <!-- Brand area: Government of Jharkhand Logo only (right emblem removed) -->
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-md); border-bottom: 2px solid var(--primary); padding-bottom: var(--space-md);">
      <div style="display: flex; align-items: center; gap: var(--space-md);">
        <!-- Government of Jharkhand Official Logo -->
        <div style="width: 85px; height: 85px; background: #ffffff; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm);">
          <svg width="75" height="75" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" stroke="#003227" stroke-width="2.5" fill="#F9F9FC"/>
            <circle cx="50" cy="50" r="38" stroke="#003227" stroke-width="1.8" fill="none"/>
            <path d="M50 15 L53 35 L65 28 L58 42 L75 45 L60 55 L68 70 L50 60 L32 70 L40 55 L25 45 L42 42 L35 28 L47 35 L50 15Z" fill="#003227" opacity="0.9"/>
            <circle cx="50" cy="50" r="6" fill="#003227"/>
            <path d="M50 20 L50 30 M50 70 L50 80 M20 50 L30 50 M70 50 L80 50" stroke="#003227" stroke-width="1.5"/>
          </svg>
        </div>
        <div>
          <p class="caption" style="font-weight: 600; color: var(--on-surface-variant); letter-spacing: 0.5px;">Government of Jharkhand</p>
          <h1 style="font-size: 1.65rem; font-weight: 800; color: var(--primary); letter-spacing: -0.3px; line-height: 1.2;">Jharkhand Staff Selection Commission</h1>
          <p class="body-md" style="font-weight: 500; letter-spacing: 0.3px;">झारखंड कर्मचारी चयन आयोग</p>
        </div>
      </div>
    </div>
  </header>

  <!-- FORM TITLE: PERSONAL INFORMATION -->
  <section style="margin-bottom: var(--space-lg);">
    <div class="section-title">APPLICATION FORM</div>
    <h2 class="headline-md" style="color: var(--primary); border-bottom: 2px solid var(--primary-fixed-dim); display: inline-block; padding-bottom: 4px;">PERSONAL INFORMATION</h2>
  </section>

  <!-- Personal Information Table (with photo integration) -->
  <div style="display: flex; flex-wrap: wrap; gap: var(--space-lg); margin-bottom: var(--space-xl);">
    <table class="data-table" style="flex: 2; min-width: 240px;">
      <tbody>
        \${personalInfoRows}
      </tbody>
    </table>
    <!-- Candidate Photo container -->
    <div class="photo-frame" style="flex: 1; min-width: 160px; height: fit-content;">
      <div style="background: var(--surface-container-highest); border-radius: var(--radius-default); overflow: hidden; margin-bottom: var(--space-sm);">
        <img src="\${photoUrl}" alt="Candidate Photograph" class="photo-img" style="width:100%; height:auto; min-height:160px; object-fit:cover;">
      </div>
      <p class="label-md" style="color: var(--on-surface-variant);">CANDIDATE PHOTO</p>
      <p class="caption">(attested as per guidelines)</p>
    </div>
  </div>

  <!-- ADDRESS SECTION: PERMANENT & CURRENT -->
  <section style="margin-bottom: var(--space-xl);">
    <h3 class="subsection-heading" style="margin-bottom: var(--space-md);">ADDRESS DETAILS</h3>
    <table class="data-table">
      <tbody>
        <tr><td class="label-cell" style="width: 28%; vertical-align: middle;">PERMANENT ADDRESS</td>
          <td class="p-0" style="padding:0;">
            <table class="nested-table">
              <tr><td style="font-weight:600; width:30%">ADDRESS</td><td>\${permAddressStr}</td></tr>
              <tr><td style="font-weight:600">STATE/U.T.</td><td>\${permState}</td></tr>
              <tr><td style="font-weight:600">DISTRICT</td><td>\${permDistrict}</td></tr>
              <tr><td style="font-weight:600">CITY</td><td>\${permCity}</td></tr>
              <tr><td style="font-weight:600">PINCODE</td><td>\${permPincode}</td></tr>
            </table>
          </td>
        </tr>
        <tr><td class="label-cell" style="vertical-align: middle;">CURRENT ADDRESS</td>
          <td class="p-0">
            <table class="nested-table">
              <tr><td style="font-weight:600; width:30%">ADDRESS</td><td>\${corrAddressStr}</td></tr>
              <tr><td style="font-weight:600">STATE/U.T.</td><td>\${corrState}</td></tr>
              <tr><td style="font-weight:600">DISTRICT</td><td>\${corrDistrict}</td></tr>
              <tr><td style="font-weight:600">CITY</td><td>\${corrCity}</td></tr>
              <tr><td style="font-weight:600">PINCODE</td><td>\${corrPincode}</td></tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- EDUCATION DETAILS (expanded: 10th, 12th, Graduation) -->
  <section style="margin-bottom: var(--space-xl);">
    <h3 class="subsection-heading">EDUCATION DETAILS</h3>
    <table class="data-table" style="text-align: center;">
      <thead>
        <tr><th>EXAMINATION</th><th>PASSING YEAR</th><th>BOARD/UNIVERSITY</th><th>MAX. MARKS</th><th>MARKS OBTAINED</th><th>PERCENTAGE</th><th>CERTIFICATE NO.</th></tr>
      </thead>
      <tbody>
        \${qualificationsRows}
      </tbody>
    </table>
  </section>

  <!-- POST PREFERENCES -->
  <section style="margin-bottom: var(--space-xl);">
    <h3 class="subsection-heading">POST PREFERENCES</h3>
    <table class="data-table">
      <thead>
        <tr><th style="width: 10%;">PRIORITY</th><th>POST NAME</th></tr>
      </thead>
      <tbody>
        \${postPreferencesRows}
      </tbody>
    </table>
  </section>

  <!-- DOCUMENTS TABLE: Document name and tick/cross option -->
  <section style="margin-bottom: var(--space-xl);">
    <h3 class="subsection-heading">DOCUMENTS UPLOADED / VERIFICATION STATUS</h3>
    <table class="data-table">
      <thead>
        <tr><th style="width: 60%;">DOCUMENT NAME</th><th style="width: 40%;">STATUS (SUBMISSION)</th></tr>
      </thead>
      <tbody>
        \${documentsRows}
      </tbody>
    </table>
  </section>

  <!-- DECLARATION + SIGNATURE section -->
  <section style="margin-top: var(--space-2xl);">
    <div class="subsection-heading" style="background: var(--surface-container-high);">DECLARATION</div>
    <div style="border: 1px solid var(--outline-variant); border-radius: var(--radius-md); background: var(--surface-container-low); padding: var(--space-lg); margin-top: var(--space-sm); margin-bottom: var(--space-xl);">
      <p class="body-md" style="font-weight: 500;">I HAVE READ ALL THE PROVISIONS OF NOTICE/ADVERTISEMENT CAREFULLY AND I HEREBY DECLARE THAT THE INFORMATION SUBMITTED BY ME IS CORRECT AND TRUE TO THE BEST OF MY KNOWLEDGE. I SHALL BE LIABLE FOR ANY DISCIPLINARY/PUNITIVE ACTION IN CASE ANY OF THE DETAILS ARE FOUND TO BE INCORRECT.</p>
    </div>
    <!-- Signature area aligned right -->
    <div style="display: flex; justify-content: flex-end; margin-top: var(--space-xl);">
      <div class="signature-box">
        <div style="margin-bottom: var(--space-xs); display: flex; justify-content: center;">
          <img src="\${signatureUrl}" alt="Candidate Signature" style="height: 54px; opacity: 0.85; mix-blend-multiply; object-fit: contain;">
        </div>
        <p class="label-md">Candidate Signature</p>
        <p class="caption">(\${fullName})</p>
      </div>
    </div>
  </section>

  <!-- FOOTER institutional disclaimer -->
  <footer>
    <p>This is a computer generated application form and does not require a physical seal of the Commission. <br>
    Verification shall be done at the time of document scrutiny as per BSSC norms.</p>
    <p style="margin-top: var(--space-xs);">© Jharkhand Staff Selection Commission | झारखंड कर्मचारी चयन आयोग</p>
  </footer>
</div>

</body>
</html>\`;
`;

fs.writeFileSync('scratch-pdf-mapper.js', codeContent);
