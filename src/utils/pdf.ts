import * as fs from 'fs';
import * as path from 'path';

export interface PdfGenerationData {
  applicationReferenceNumber: string;
  isSubmitted: boolean;
  status: string;
  submissionDate?: Date | string;
  candidateDetails: {
    registrationNumber: string;
  };
  steps: {
    step0?: any; // personalInfo
    step1?: any; // reservationCategory / address
    step2?: any; // education
    step3?: any; // postPreference
    step4?: any; // languageSelection
    step5?: any; // centerSelection
    step6?: any; // documents
    step7?: any; // feePayment
    step8?: any; // review
  };
}

export async function generateApplicationHtml(data: PdfGenerationData): Promise<string> {
  const personalInfo = data.steps.step0 || {};
  const reservationCategory = data.steps.step1 || {};
  const education = data.steps.step2 || {};
  const postPreference = data.steps.step3 || {};
  const languageSelection = data.steps.step4 || {};
  const centerSelection = data.steps.step5 || {};
  const documents = data.steps.step6 || {};
  const feePayment = data.steps.step7 || {};

  const refNum = data.applicationReferenceNumber || 'N/A';

  const fullName = [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName]
    .filter(Boolean)
    .join(' ')
    .toUpperCase() || 'N/A';

  const fatherName = (personalInfo.fatherName || '').toUpperCase() || 'N/A';
  const motherName = (personalInfo.motherName || '').toUpperCase() || 'N/A';

  let dob = 'N/A';
  if (personalInfo.dateOfBirth) {
    dob = personalInfo.dateOfBirth.split('-').reverse().join('-');
  }

  const gender = personalInfo.gender ? personalInfo.gender.toUpperCase() : 'N/A';
  const category = reservationCategory.mainCategoryName || 'UR';
  const maritalStatus = personalInfo.maritalStatus ? personalInfo.maritalStatus.toUpperCase() : 'N/A';
  const spouseName = personalInfo.spouseName ? personalInfo.spouseName.toUpperCase() : 'N/A';
  const domicile = reservationCategory.isBiharDomicile ? 'YES' : 'NO';
  const mobileNumber = personalInfo.mobileNumber || 'N/A';
  const emailAddress = personalInfo.emailId ? personalInfo.emailId.toLowerCase() : 'N/A';
  const aadharNumber = personalInfo.aadharNumber || personalInfo.identityNumber || 'N/A';
  const identificationMark1 = personalInfo.identificationMark1 ? personalInfo.identificationMark1.toUpperCase() : 'N/A';
  const identificationMark2 = personalInfo.identificationMark2 ? personalInfo.identificationMark2.toUpperCase() : 'N/A';
  const feeAmount = feePayment.amount ? Number(feePayment.amount).toFixed(2) : 'N/A';

  const defaultPhotoUrl =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB59TWZjVVIVH4YUjHn34mQ6xnic5Vt6oSWQQBgVEAnGY32rmVbjSIO9DsL4y8-LGdyW8cyHZxQCqadN8xK8RaHDbOaVrfgh7s-ijvUyqSOquMUwzMSwdS31Sge5fYn52SiEMop0DeNlCEiZ6pPECPp4mBXgkAfrwW6-6krorRpB_y_1T2wivNuKVTFixkQZ4tXu-FoEWOZyMGIW6qWu8PhTi7NsWA1_2WtPdF0u5r3M2J_nKcEwBH07e34LdfMpB1HARtnKWBy5bs';
  const defaultSignatureUrl =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBPNtVbeplrN6qfoUKOWqdyAsYWc8pJ9ldkLsLPHa3wv6P38whQAd3wMtJCfBiuBQ0JNkMwDZW6H9_1_ZKa9ypa5zTF2QuUojgT1Nn-GUCaArzuiROxZBuuI1NFy5fz0n5cIzdj2l_Sp0nVjP9vgSttvEU0vkXn6PMJ7yIkLRdVZFWW1N_2B3vOVQejzGOjjJTwtFRDIuEeILyX2A0GSyxuAPwOARu9ABrUHljD94jBf6tO3Mpnvcx7OfZYiuAWVGio0c98QT2I2Cg';

  let photoUrl = documents.photo || defaultPhotoUrl;
  if (
    photoUrl.startsWith('https://mock-s3.local') ||
    photoUrl.startsWith('s3://') ||
    photoUrl === 'null' ||
    !photoUrl
  ) {
    photoUrl = defaultPhotoUrl;
  }
  let signatureUrl = documents.signature || defaultSignatureUrl;
  if (
    signatureUrl.startsWith('https://mock-s3.local') ||
    signatureUrl.startsWith('s3://') ||
    signatureUrl === 'null' ||
    !signatureUrl
  ) {
    signatureUrl = defaultSignatureUrl;
  }

  // Personal Info Rows Builder
  const postRankings = postPreference.postRankings || postPreference.preferredPosts || [];
  let personalInfoRows = `
    <tr><td class="label">APPLICATION NO.</td><td class="value">${refNum}</td></tr>
    <tr><td class="label">MOBILE NUMBER</td><td class="value">${mobileNumber}</td></tr>
    <tr><td class="label">EMAIL ID</td><td class="value">${emailAddress}</td></tr>
    <tr><td class="label">DATE OF BIRTH</td><td class="value">${dob}</td></tr>
    <tr><td class="label">FULL NAME</td><td class="value">${fullName}</td></tr>
    <tr><td class="label">FATHER/GUARDIAN NAME</td><td class="value">${fatherName}</td></tr>
    <tr><td class="label">MOTHER NAME</td><td class="value">${motherName}</td></tr>
    <tr><td class="label">ARE YOU AN INDIAN CITIZEN ?</td><td class="value">YES</td></tr>
    <tr><td class="label">LOCAL RESIDENT OF JHARKHAND ?</td><td class="value">${domicile}</td></tr>
  `;

  if (domicile === 'YES') {
    personalInfoRows += `
      <tr><td class="label">DOMICILE/RESIDENTIAL CERTIFICATE NO.</td><td class="value">${reservationCategory.domicileCertificateNumber || 'N/A'}</td></tr>
      <tr><td class="label">ISSUED AUTHORITY</td><td class="value">${reservationCategory.domicileCertificateAuthorityName || reservationCategory.domicileCertificateAuthority || 'N/A'}</td></tr>
      <tr><td class="label">CERTIFICATE DATE</td><td class="value">${reservationCategory.domicileCertificateIssueDate || 'N/A'}</td></tr>
      <tr><td class="label">DISTRICT OF LOCAL RESIDENCE</td><td class="value">${(reservationCategory.localDistrictName || 'N/A').toUpperCase()}</td></tr>
    `;
  }

  personalInfoRows += `
    <tr><td class="label">GENDER</td><td class="value">${gender}</td></tr>
  `;

  if (postRankings && postRankings.length > 0) {
    const pApplied = postRankings.map((pr: any) => pr.postTitle || pr.postName || `POST ID: ${pr.postCode || pr.postId}`).join(', ');
    personalInfoRows += `<tr><td class="label">POST APPLIED FOR</td><td class="value">${pApplied.toUpperCase()}</td></tr>`;
  }

  personalInfoRows += `
    <tr><td class="label">PAPER II LANGUAGE</td><td class="value">${(languageSelection.paperTwoLanguage || languageSelection.paperTwo || 'N/A').toUpperCase()}</td></tr>
    <tr><td class="label">PAPER III SUBJECT(IF APPLICABLE)</td><td class="value">${(languageSelection.paperThreeSubject || languageSelection.paperThreeLanguage || languageSelection.paperThree || 'N/A').toUpperCase()}</td></tr>
    <tr><td class="label">MARITAL STATUS</td><td class="value">${maritalStatus}</td></tr>
    ${spouseName !== 'N/A' ? `<tr><td class="label">SPOUSE NAME</td><td class="value">${spouseName}</td></tr>` : ''}
    <tr><td class="label">RESERVATION CATEGORY</td><td class="value">${category.toUpperCase()}</td></tr>
  `;

  if (category !== 'UR') {
    personalInfoRows += `
      <tr><td class="label">CASTE CERTIFICATE NO.</td><td class="value">${reservationCategory.categoryCertificateNumber || 'N/A'}</td></tr>
      <tr><td class="label">ISSUING AUTHORITY</td><td class="value">${reservationCategory.categoryCertificateAuthorityName || reservationCategory.categoryCertificateAuthority || 'N/A'}</td></tr>
      <tr><td class="label">CERTIFICATE DATE</td><td class="value">${reservationCategory.categoryCertificateIssueDate || 'N/A'}</td></tr>
    `;
  }

  personalInfoRows += `
    <tr><td class="label">FEES AMOUNT</td><td class="value">${feeAmount}</td></tr>
    <tr><td class="label">AADHAR NUMBER</td><td class="value">${aadharNumber}</td></tr>
    <tr><td class="label">IDENTIFICATION MARK 1</td><td class="value">${identificationMark1}</td></tr>
    <tr><td class="label">IDENTIFICATION MARK 2</td><td class="value">${identificationMark2}</td></tr>
  `;

  // Address Formatting
  const perm = personalInfo.address?.permanent || {};
  const corr = personalInfo.address?.correspondence || {};

  const permAddressStr = [perm.street, perm.post ? `PO-${perm.post}` : null].filter(Boolean).join(', ');
  const corrAddressStr = corr.sameAsPermanent || !corr.street ? permAddressStr : [corr.street, corr.post ? `PO-${corr.post}` : null].filter(Boolean).join(', ');

  // Qualifications Rows
  const levelMap: Record<string, string> = {
    matriculation: '10TH / MATRIC / EQUIVALENT',
    intermediate: '12TH / INTERMEDIATE / EQUIVALENT',
    graduation: "GRADUATION / BACHELOR'S DEGREE",
    post_graduation: 'POST GRADUATION',
    diploma: 'DIPLOMA',
    certificate: 'CERTIFICATE',
  };

  const qualificationsArray = education.qualifications || [];
  let qualificationsRows = '';
  qualificationsArray.forEach((q: any) => {
    const levelName = levelMap[q.level] || (q.level || '').toUpperCase();
    qualificationsRows += `
      <tr>
        <td>${levelName}</td>
        <td>${q.yearOfPassing || 'N/A'}</td>
        <td>${q.boardUniversity || 'N/A'}</td>
        <td>${q.totalMarks || 'N/A'}</td>
        <td>${q.marksObtained || 'N/A'}</td>
        <td>${q.percentage ? parseFloat(q.percentage).toFixed(2) + '%' : 'N/A'}</td>
        <td>${q.certificateNumber || q.rollNumber || q.grade || 'N/A'}</td>
      </tr>
    `;
  });
  if (!qualificationsRows) {
    qualificationsRows = `<tr><td colspan="7">No qualifications found</td></tr>`;
  }

  // Post Preferences
  let postPreferencesRows = '';
  postRankings.sort((a: any, b: any) => a.priority - b.priority).forEach((pr: any) => {
    const title = pr.postTitle || pr.postName || `POST ID: ${pr.postId}`;
    postPreferencesRows += `
      <tr>
        <td style="text-align:center; font-weight:bold;">${pr.priority}</td>
        <td style="text-transform:uppercase;">${title}</td>
      </tr>
    `;
  });
  if (!postPreferencesRows) {
    postPreferencesRows = `<tr><td colspan="2">No preferences</td></tr>`;
  }

  // Documents
  const expectedDocs = [
    { key: 'tenthMarksheet', label: 'HIGH SCHOOL (10TH) CERTIFICATE & MARK SHEET' },
    { key: 'twelfthMarksheet', label: 'INTERMEDIATE (12TH) CERTIFICATE & MARK SHEET' },
    { key: 'graduationMarksheet', label: 'GRADUATION DEGREE CERTIFICATE & MARKSHEETS' },
  ];
  if (category !== 'UR') {
    expectedDocs.push({ key: 'castCertificate', label: 'CASTE CERTIFICATE (SC/ST/OBC/EWS)' });
  }
  if (domicile === 'YES') {
    expectedDocs.push({ key: 'domicileCertificate', label: 'DOMICILE / RESIDENTIAL CERTIFICATE' });
  }
  expectedDocs.push({ key: 'aadharCard', label: 'AADHAR CARD / ID PROOF' });
  if (category === 'EWS') {
    expectedDocs.push({ key: 'ewsCertificate', label: 'INCOME / ASSET CERTIFICATE (IF APPLICABLE)' });
  }

  let documentsRows = '';
  expectedDocs.forEach((doc) => {
    const isSubmitted = documents && documents[doc.key];
    if (isSubmitted) {
      documentsRows += `
        <tr>
          <td>${doc.label}</td>
          <td class="doc-status"><span class="status-icon ok">&#10003;</span><span class="status-text ok">Submitted</span></td>
        </tr>
      `;
    } else {
      documentsRows += `
        <tr>
          <td>${doc.label}</td>
          <td class="doc-status"><span class="status-icon no">&#10007;</span><span class="status-text no">Not Submitted</span></td>
        </tr>
      `;
    }
  });
  // Add photo & signature which is generally always uploaded if we reached here
  documentsRows += `
    <tr>
      <td>PHOTOGRAPH & SIGNATURE (SCANNED)</td>
      <td class="doc-status"><span class="status-icon ok">&#10003;</span><span class="status-text ok">Uploaded</span></td>
    </tr>
  `;

  if (category !== 'EWS') {
    documentsRows += `
    <tr>
      <td>INCOME / ASSET CERTIFICATE (IF APPLICABLE)</td>
      <td class="doc-status"><span class="status-icon empty"></span><span class="status-text empty">Not Required</span></td>
    </tr>
    `;
  }

  const unsubmittedDocNames = expectedDocs.filter(doc => !(documents && documents[doc.key])).map(d => d.label);
  let docNote = '';
  if (unsubmittedDocNames.length > 0) {
    docNote = `<p class="doc-note">
      <b>Note:</b> ${unsubmittedDocNames.join(', ')} ${unsubmittedDocNames.length > 1 ? 'are' : 'is'} marked as <span class="hl">Not Submitted (Red Cross)</span>. All other mandatory documents have been submitted as per checklist.
    </p>`;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BSSC Application Form</title>
<style>
  :root {
    --accent: #1a9b8a;
    --ink: #1f2933;
    --muted: #5c6b73;
    --border: #c8d0d4;
    --bg: #ffffff;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: #e9edef;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
  }

  .page {
    width: 820px;
    max-width: 100%;
    margin: 24px auto;
    background: var(--bg);
    padding: 40px 48px;
  }

  /* ---------- Top contact bar ---------- */
  .contact-bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 28px;
    font-size: 13px;
    color: var(--muted);
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }
  .contact-bar span { display: inline-flex; align-items: center; gap: 8px; }
  .contact-bar svg { width: 15px; height: 15px; stroke: var(--accent); fill: none; }

  /* ---------- Masthead ---------- */
  .masthead {
    display: flex;
    align-items: center;
    gap: 22px;
    padding: 22px 0;
    border-bottom: 3px solid var(--ink);
  }
  .emblem {
    width: 78px; height: 78px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex: 0 0 auto;
    overflow: hidden;
  }
  .emblem img { width: 100%; height: 100%; object-fit: cover; }
  .masthead .gov { font-size: 13px; color: var(--muted); margin: 0; }
  .masthead h1 { font-size: 30px; margin: 2px 0 2px; letter-spacing: .3px; }
  .masthead .hindi { font-size: 16px; margin: 0; color: var(--ink); }

  /* ---------- Section labels ---------- */
  .form-title {
    display: flex; align-items: center; gap: 12px;
    font-size: 20px; font-weight: 700; letter-spacing: 1px;
    margin: 32px 0 22px;
  }
  .form-title::before {
    content: ""; width: 5px; height: 24px; background: var(--accent);
    border-radius: 2px;
  }

  .section-head {
    font-size: 26px; font-weight: 700; letter-spacing: .5px;
    margin: 0 0 26px;
    padding-bottom: 8px;
    display: inline-block;
    border-bottom: 3px solid var(--accent);
  }

  /* ---------- Body layout: table + photo ---------- */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 40px;
    align-items: start;
  }

  table.info {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  table.info td {
    border: 1px solid var(--border);
    padding: 11px 14px;
    vertical-align: middle;
  }
  table.info td.label {
    width: 42%;
    color: var(--muted);
    font-weight: 500;
  }
  table.info td.value { font-weight: 600; }

  .photo-block { text-align: center; }
  .photo-frame {
    width: 100%;
    aspect-ratio: 1 / 1;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: #f1f4f5;
    display: flex; align-items: center; justify-content: center;
    color: var(--muted);
    font-size: 13px;
    overflow: hidden;
  }
  .photo-frame img { width: 100%; height: 100%; display: block; object-fit: cover; object-position: top center; }
  .photo-caption { margin-top: 12px; }
  .photo-caption .cap-main { font-size: 16px; font-weight: 600; letter-spacing: .4px; }
  .photo-caption .cap-sub { font-size: 13px; color: var(--muted); }

  /* ---------- Generic section tables ---------- */
  table.section-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    margin-bottom: 8px;
  }
  table.section-table th,
  table.section-table td {
    border: 1px solid var(--border);
    padding: 11px 14px;
    text-align: left;
    vertical-align: middle;
  }
  table.section-table th {
    font-weight: 700;
    background: #f1f4f5;
    font-size: 13px;
  }

  /* Address details */
  table.address td.addr-type {
    width: 18%;
    font-weight: 700;
    text-align: center;
    background: #f1f4f5;
  }
  table.address td.label {
    width: 22%;
    color: var(--muted);
    font-weight: 500;
  }
  table.address td.value { font-weight: 600; }

  /* Education details */
  table.education th,
  table.education td { text-align: center; }
  table.education th:first-child,
  table.education td:first-child { text-align: left; }

  /* Documents verification status */
  table.documents th:last-child,
  table.documents td.doc-status { text-align: center; }
  .status-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px; height: 18px;
    border: 2px solid currentColor;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    margin-right: 8px;
    vertical-align: middle;
  }
  .status-icon.ok { color: #1a9b6a; }
  .status-icon.no { color: #d9362e; }
  .status-icon.empty { color: var(--muted); }
  .status-text { vertical-align: middle; }
  .status-text.ok { color: #1a9b6a; font-weight: 600; }
  .status-text.no { color: #d9362e; font-weight: 700; }
  .status-text.empty { color: var(--muted); font-weight: 500; }

  .doc-note {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.7;
    margin: 14px 0 30px;
  }
  .doc-note b { color: var(--ink); }
  .doc-note .hl { color: #d9362e; font-weight: 700; }

  /* Declaration */
  .declaration-box {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 20px 24px;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.8;
    background: #f9fafb;
  }

  /* ---------- Signature / footer ---------- */
  .sign-row {
    display: flex; justify-content: flex-end;
    margin-top: 80px;
  }
  .sign-block { text-align: center; width: 220px; }
  .sign-frame {
    height: 78px;
    border-top: 2px solid var(--ink);
    display: flex;
    justify-content: center;
  }
  .sign-frame img {
    max-height: 64px;
    max-width: 180px;
    object-fit: contain;
  }
  .sign-block .sign-name { font-size: 17px; font-weight: 700; margin-top: 6px; }
  .sign-block .sign-sub { font-size: 14px; color: var(--ink); }

  .disclaimer {
    text-align: center;
    font-size: 13px;
    color: var(--muted);
    line-height: 1.7;
    border-top: 1px solid var(--border);
    margin-top: 40px;
    padding-top: 24px;
  }
  .disclaimer .copyright { margin-top: 6px; }

  /* ---------- Print ---------- */
  @media print {
    body { background: #fff; }
    .page { margin: 0; padding: 24px; width: 100%; }
  }

  @media (max-width: 640px) {
    .page { padding: 24px 18px; }
    .info-grid { grid-template-columns: 1fr; }
    .masthead h1 { font-size: 22px; }
    .section-head { font-size: 20px; }
    table.section-table { font-size: 12px; }
    table.section-table th, table.section-table td { padding: 7px 8px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Top contact bar -->
  <div class="contact-bar">
    <span>
      <svg viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
      9330251588, 7355759501, 6393905801
    </span>
    <span>
      <svg viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
      jkce2026helpdesk@gmail.com
    </span>
    <span>
      <svg viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Mon-Sat 09:00 AM - 06:00 PM
    </span>
  </div>

  <!-- Masthead -->
  <div class="masthead">
    <div class="emblem">
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Jharkhand_Rajakiya_Chihna.jpg/600px-Jharkhand_Rajakiya_Chihna.jpg" alt="Government of Jharkhand Emblem">
    </div>
    <div>
      <p class="gov">Government of Jharkhand</p>
      <h1>Jharkhand Staff Selection Commission</h1>
      <p class="hindi">झारखण्ड कर्मचारी चयन आयोग</p>
    </div>
  </div>

  <!-- Form title -->
  <div class="form-title">APPLICATION FORM</div>

  <!-- Personal information -->
  <h2 class="section-head">PERSONAL INFORMATION</h2>

  <div class="info-grid">
    <table class="info">
      ${personalInfoRows}
    </table>

    <div class="photo-block">
      <div class="photo-frame">
        <img src="${photoUrl}" alt="Candidate Photo">
      </div>
      <div class="photo-caption">
        <div class="cap-main">PHOTOGRAPH</div>
      </div>
    </div>
  </div>

  <section style="margin-bottom: var(--space-xl);">
    <h3 class="subsection-heading" style="margin-bottom: var(--space-md);">ADDRESS DETAILS</h3>
    <table class="data-table">
      <tbody>
        <tr><td class="label-cell" style="width: 28%; vertical-align: middle;">PERMANENT ADDRESS</td>
          <td class="p-0" style="padding:0;">
            <table class="nested-table">
              <tr><td style="font-weight:600; width:30%">ADDRESS</td><td>${permAddressStr}</td></tr>
              <tr><td style="font-weight:600">STATE/U.T.</td><td>${perm.state || 'N/A'}</td></tr>
              <tr><td style="font-weight:600">DISTRICT</td><td>${perm.district || 'N/A'}</td></tr>
              <tr><td style="font-weight:600">CITY</td><td>${perm.city || perm.cityOrVillage || 'N/A'}</td></tr>
              <tr><td style="font-weight:600">PINCODE</td><td>${perm.pincode || 'N/A'}</td></tr>
            </table>
          </td>
        </tr>
        <tr><td class="label-cell" style="vertical-align: middle;">CURRENT ADDRESS</td>
          <td class="p-0">
            <table class="nested-table">
              <tr><td style="font-weight:600; width:30%">ADDRESS</td><td>${corrAddressStr}</td></tr>
              <tr><td style="font-weight:600">STATE/U.T.</td><td>${corr.sameAsPermanent ? perm.state : corr.state || 'N/A'}</td></tr>
              <tr><td style="font-weight:600">DISTRICT</td><td>${corr.sameAsPermanent ? perm.district : corr.district || 'N/A'}</td></tr>
              <tr><td style="font-weight:600">CITY</td><td>${corr.sameAsPermanent ? (perm.city || perm.cityOrVillage) : (corr.city || corr.cityOrVillage) || 'N/A'}</td></tr>
              <tr><td style="font-weight:600">PINCODE</td><td>${corr.sameAsPermanent ? perm.pincode : corr.pincode || 'N/A'}</td></tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <section style="margin-bottom: var(--space-xl);">
    <h3 class="subsection-heading">EDUCATION DETAILS</h3>
    <table class="data-table" style="text-align: center;">
      <thead>
        <tr><th>EXAMINATION</th><th>PASSING YEAR</th><th>BOARD/UNIVERSITY</th><th>MAX. MARKS</th><th>MARKS OBTAINED</th><th>PERCENTAGE</th><th>CERTIFICATE NO.</th></tr>
      </thead>
      <tbody>
        ${qualificationsRows}
      </tbody>
    </table>
  </section>

  <section style="margin-bottom: var(--space-xl);">
    <h3 class="subsection-heading">POST PREFERENCES</h3>
    <table class="data-table">
      <thead>
        <tr><th style="width: 10%;">PRIORITY</th><th>POST NAME</th></tr>
      </thead>
      <tbody>
        ${postPreferencesRows}
      </tbody>
    </table>
  </section>

  <section style="margin-bottom: var(--space-xl);">
    <h3 class="subsection-heading">DOCUMENTS UPLOADED / VERIFICATION STATUS</h3>
    <table class="data-table">
      <thead>
        <tr><th style="width: 60%;">DOCUMENT NAME</th><th style="width: 40%;">STATUS (SUBMISSION)</th></tr>
      </thead>
      <tbody>
        ${documentsRows}
      </tbody>
    </table>
  </section>

  <section style="margin-top: var(--space-2xl);">
    <div class="subsection-heading" style="background: var(--surface-container-high);">DECLARATION</div>
    <div style="border: 1px solid var(--outline-variant); border-radius: var(--radius-md); background: var(--surface-container-low); padding: var(--space-lg); margin-top: var(--space-sm); margin-bottom: var(--space-xl);">
      <p class="body-md" style="font-weight: 500;">I HAVE READ ALL THE PROVISIONS OF NOTICE/ADVERTISEMENT CAREFULLY AND I HEREBY DECLARE THAT THE INFORMATION SUBMITTED BY ME IS CORRECT AND TRUE TO THE BEST OF MY KNOWLEDGE. I SHALL BE LIABLE FOR ANY DISCIPLINARY/PUNITIVE ACTION IN CASE ANY OF THE DETAILS ARE FOUND TO BE INCORRECT.</p>
    </div>
  </div>

  <!-- Footer disclaimer -->
  <div class="disclaimer">
    This is a computer generated application form and does not require a physical seal of the Commission.<br>
    Verification shall be done at the time of document scrutiny as per BSSC norms.
    <div class="copyright">© Jharkhand Staff Selection Commission | झारखण्ड कर्मचारी चयन आयोग</div>
  </div>

</div>
</body>
</html>`;

  return htmlContent;
}
