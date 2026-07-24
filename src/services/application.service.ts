import { applicationRepository } from '../repositories/application.repository';
import { userRepository } from '../repositories/user.repository';
import { getDb } from '../database/drizzle';
import { calculateBSSCAge, getBSSCAgeLimits, checkBSSCEligibility } from '../utils/age';
import { eq, and, inArray } from 'drizzle-orm';
import { generateApplicationHtml } from '../utils/pdf';
import { cognitoAdminGetUser } from '../utils/cognito';
import {
  candidateQualifications,
  candidatePostPreferences,
  candidateLanguages,
  documents,
  candidates,
  applications,
  posts,
  categories,
  districts,
  finalSubmissions,
  users,
  typeOfExOfficers,
} from '../database/schema';
import { documentRepository } from '../repositories/common.repository';
import { documentService } from './document.service';
import { AppError, NotFoundError, ForbiddenError } from '../errors/AppError';
import { STEP_SCHEMAS, type StepNumber } from '../validators/application';
import { validate } from '../middleware/validate';
import { generateRandomToken } from '../utils/crypto';
import type { ApplicationDraft, ApplicationStepData } from '../types';
import type { Application, ApplicationStepDatum } from '../database/schema';

const parseServiceDate = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(dateStr);
      } else {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
  }
  return null;
};

const formatToDDMMYYYY = (dateInput: any): any => {
  if (dateInput === null || dateInput === undefined) return null;

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}-${month}-${year}`;
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;

    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    const matchYMD = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchYMD) {
      return `${matchYMD[3]}-${matchYMD[2]}-${matchYMD[1]}`;
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}-${month}-${year}`;
    }
  }

  return dateInput;
};

const normalizeStepDataDates = (data: any): void => {
  if (!data || typeof data !== 'object') return;

  const dateKeys = [
    'dateOfBirth', 'dob',
    'domicileCertificateIssueDate', 'domicileIssueDate',
    'categoryCertificateIssueDate', 'categoryIssueDate',
    'pwdCertificateIssueDate', 'disabilityIssueDate',
    'sportsCertificateIssueDate', 'sportsIssueDate',
    'serviceFromDate', 'serviceToDate',
    'contractualFromDate', 'contractualToDate',
    'debarredFromDate', 'debarredToDate',
    'certIssueDate'
  ];

  for (const key of Object.keys(data)) {
    if (dateKeys.includes(key)) {
      if (typeof data[key] === 'string' || data[key] instanceof Date) {
        data[key] = formatToDDMMYYYY(data[key]);
      }
    } else if (data[key] && typeof data[key] === 'object') {
      normalizeStepDataDates(data[key]);
    }
  }
};

const COGNITO_KEYS = new Set([
  'fullName', 'emailId', 'mobileNumber', 'mobileNo', 'dateOfBirth', 'dob', 'gender', 'age',
  'domicileOfBihar', 'isBiharDomicile',
  'mainCategory', 'categoryId', 'category',
  'subCategory', 'casteId', 'caste',
  'isPwd', 'disability', 'pwdType', 'natureOfDisability', 'pwdPercentage', 'disabilityPercent', 'pwd40Percent', 'isMin40PercentPwD', 'isScribeRequired',
  'isExServiceman', 'exServiceman', 'exServicemanYears', 'officerType', 'typeOfExOfficer', 'servicePeriod',
  'biharGovtEmployee', 'biharGovtEmp', 'numberOfAttempts', 'bsscAttempts', 'contractualEmployee', 'contractualEmp', 'organizationName', 'hasPostExperience', 'nameOfPost', 'postName', 'agreementCircular', 'hasAgreement', 'contractualPeriod', 'disTypePersist', 'natureOfDisabilityType',
  'nonCreamyLayer', 'isNonCreamyLayer',
  'registrationNumber', 'previouslyRegistered', 'governmentIdNumber', 'oldRegistrationNumber'
]);

export class ApplicationService {
  // ── Get or Create Draft ───────────────────────────────────────

  async getOrCreateDraft(candidateId: string): Promise<ApplicationDraft> {
    let application = await applicationRepository.findDraftByCandidateId(candidateId);

    if (!application) {
      application = await applicationRepository.create({
        candidateId,
        status: 'draft',
        currentStep: 0,
        completedSteps: [],
        isSubmitted: false,
      });
    }

    const stepDataRows = await applicationRepository.getAllStepData(application.id);
    const stepDataMap: Record<number, Record<string, unknown>> = {};
    for (const row of stepDataRows) {
      stepDataMap[row.stepNumber] = row.data;
    }
    await this.enrichStepData(stepDataMap, candidateId);
    return this.buildDraftResponse(application, stepDataMap);
  }

  private buildDraftResponse(
    application: Application,
    stepDataMap: Record<number, Record<string, unknown>>
  ): ApplicationDraft {
    return {
      applicationId: application.id,
      candidateId: application.candidateId,
      status: application.status as 'draft' | 'submitted' | 'locked',
      currentStep: application.currentStep,
      completedSteps: application.completedSteps,
      isSubmitted: application.isSubmitted,
      application: {
        step0: stepDataMap[0] ?? null,
        step1: stepDataMap[1] ?? null,
        step2: stepDataMap[2] ?? null,
        step3: stepDataMap[3] ?? null,
        step4: stepDataMap[4] ?? null,
        step5: stepDataMap[5] ?? null,
        // step6: stepDataMap[6] ?? null,
        // step7: stepDataMap[7] ?? null,
        // step8: stepDataMap[8] ?? null,
      },
    };
  }

  // ── Save Step ─────────────────────────────────────────────────

  async saveStep(
    applicationId: string,
    candidateId: string,
    stepNumber: number,
    data: Record<string, unknown>
  ): Promise<ApplicationStepData> {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw new NotFoundError('Application not found');
    if (application.candidateId !== candidateId)
      throw new ForbiddenError('Application does not belong to this candidate');
    if (application.isSubmitted)
      throw new AppError(
        'Your application has already been successfully submitted and can no longer be modified.',
        409
      );

    // Validate step data against schema
    if (stepNumber === 0 && data && typeof data === 'object') {
      if (data.dateOfBirth) {
        const dobStr = data.dateOfBirth as string;
        const dobDate = new Date(
          dobStr.includes('-') && dobStr.split('-')[0].length === 2
            ? dobStr.split('-').reverse().join('-')
            : dobStr
        );
        if (!isNaN(dobDate.getTime())) {
          const calculatedAge = calculateBSSCAge(dobDate);
          if (data.age === undefined || data.age === null || data.age === 0) {
            data.age = calculatedAge;
          }
        }
      }
    }

    // Support BSSC flat educational details format by normalizing to JSSC qualifications array
    if ((stepNumber === 2 || stepNumber === 3) && data && typeof data === 'object' && !Array.isArray(data.qualifications)) {
      const qualifications: any[] = [];
      const levels = ['tenth', 'twelfth', 'graduation' /*, 'postGraduation'*/] as const;
      for (const lvl of levels) {
        if (data[lvl] && typeof data[lvl] === 'object') {
          const q = data[lvl] as any;
          let dbLevel = 'unknown';
          let degree = '';
          if (lvl === 'tenth') {
            dbLevel = 'matriculation';
            degree = '10th';
          } else if (lvl === 'twelfth') {
            dbLevel = 'intermediate';
            degree = '12th';
          } else if (lvl === 'graduation') {
            dbLevel = 'graduation';
            degree = q.subject || 'Graduation';
          }

          const obtained = q.obtainedMarks || q.marksObtained;
          const total = q.totalMarks;
          const percentageVal = (obtained && total && Number(total) > 0)
            ? String(((Number(obtained) / Number(total)) * 100).toFixed(2))
            : (q.percentage ? String(q.percentage) : '0');

          //   qualifications.push({
          //     level: dbLevel,
          //     degree: degree,
          //     boardUniversity: q.boardUniversity || 'N/A',
          //     totalMarks: total ? String(total) : '0',
          //     obtainedMarks: obtained || '0',
          //     marksObtained: obtained || '0',
          //     percentage: percentageVal,
          //     specialization: q.subject || null,
          //     passingYear: q.certIssueDate ? String(q.certIssueDate).split('-')[0] : null,
          //     certNumber: q.certNumber || '',
          //     certIssueDate: q.certIssueDate || null,
          //   });
        }
      }
      // if (qualifications.length > 0) {
      //   (data as any).qualifications = qualifications;
      // }
    }

    const schema = STEP_SCHEMAS[stepNumber as StepNumber];
    if (schema) {
      validate(schema as any, data);
    }

    // Sanitize data before database write to clean up step0 / step1 duplication (Cognito partitioning)
    let dbData = data;
    if (stepNumber === 0) {
      dbData = {};
      for (const [key, val] of Object.entries(data)) {
        if (COGNITO_KEYS.has(key)) {
          dbData[key] = val;
        }
      }
      // Also extract Cognito keys from nested reservationCategory object if present
      if (data.reservationCategory && typeof data.reservationCategory === 'object') {
        const rc = data.reservationCategory as any;
        for (const [key, val] of Object.entries(rc)) {
          if (COGNITO_KEYS.has(key)) {
            dbData[key] = val;
          }
        }
      }
    } else if (stepNumber === 1) {
      dbData = { ...data };
      for (const key of COGNITO_KEYS) {
        delete dbData[key];
      }
      // Also remove Cognito keys from nested reservationCategory object if present
      if (dbData.reservationCategory && typeof dbData.reservationCategory === 'object') {
        const rc = { ...dbData.reservationCategory } as any;
        for (const key of COGNITO_KEYS) {
          delete rc[key];
        }
        dbData.reservationCategory = rc;
      }
    }

    await applicationRepository.upsertStepData(applicationId, stepNumber, dbData);

    if (
      (stepNumber === 0 || stepNumber === 1) &&
      ('oldRegistrationNumber' in data || 'previouslyRegistered' in data || 'governmentIdNumber' in data)
    ) {
      await userRepository.updateCandidate(candidateId, {
        ...('oldRegistrationNumber' in data ? { oldRegistrationNumber: data.oldRegistrationNumber ? String(data.oldRegistrationNumber) : null } : {}),
        ...('previouslyRegistered' in data ? { previouslyRegistered: data.previouslyRegistered ? String(data.previouslyRegistered) : null } : {}),
        ...('governmentIdNumber' in data ? { governmentIdNumber: data.governmentIdNumber ? String(data.governmentIdNumber) : null } : {}),
      });
    }

    const completedSteps = Array.from(new Set([...application.completedSteps, stepNumber]));
    const nextStep = Math.max(application.currentStep, stepNumber + 1);
    await applicationRepository.updateCurrentStep(applicationId, nextStep, completedSteps);

    return {
      applicationId,
      savedStep: stepNumber,
      currentStep: nextStep,
      status: application.status,
      updatedAt: new Date(),
    };
  }

  // ── Get Step Data ─────────────────────────────────────────────

  async getStepData(
    applicationId: string,
    candidateId: string,
    stepNumber: number
  ): Promise<Record<string, unknown> | null> {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw new NotFoundError('Application not found');
    if (application.candidateId !== candidateId)
      throw new ForbiddenError('Application does not belong to this candidate');

    const stepDataRows = await applicationRepository.getAllStepData(applicationId);
    const stepDataMap: Record<number, Record<string, unknown>> = {};
    for (const row of stepDataRows) {
      stepDataMap[row.stepNumber] = row.data;
    }
    await this.enrichStepData(stepDataMap, candidateId);
    return stepDataMap[stepNumber] ?? null;
  }

  // ── Submit Application ────────────────────────────────────────

  async submitApplication(applicationId: string, candidateId: string): Promise<Application> {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw new NotFoundError('Application not found');
    if (application.candidateId !== candidateId)
      throw new ForbiddenError('Application does not belong to this candidate');
    if (application.isSubmitted)
      throw new AppError(
        'Your application has already been successfully submitted and can no longer be modified.',
        409
      );

    const requiredSteps = [0, 1, 2, 3, 4, 5];
    let missingSteps = requiredSteps.filter((step) => !application.completedSteps.includes(step));

    // Allow submission if payment is already completed (for 0 amount bypass or successful payments)
    if (missingSteps.includes(2) && application.status === 'payment_completed') {
      missingSteps = missingSteps.filter((step) => step !== 2);
    }

    if (missingSteps.length > 0) {
      throw new AppError(
        `Cannot submit: incomplete steps: ${missingSteps.map((s) => `Step ${s}`).join(', ')}`,
        422
      );
    }

    await this.unifiedFinalSubmit(applicationId, candidateId);
    const updated = await applicationRepository.findById(applicationId);
    if (!updated) throw new NotFoundError('Application not found after submission');
    return updated;
  }

  // ── Get Application Status ────────────────────────────────────

  async getApplicationStatus(applicationId: string, candidateId: string): Promise<Application> {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw new NotFoundError('Application not found');
    if (application.candidateId !== candidateId)
      throw new ForbiddenError('Application does not belong to this candidate');
    return application;
  }

  // ── Print Preview ─────────────────────────────────────────────

  async getPrintPreview(
    applicationId: string,
    candidateId: string
  ): Promise<Record<string, unknown>> {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw new NotFoundError('Application not found');
    if (application.candidateId !== candidateId)
      throw new ForbiddenError('Application does not belong to this candidate');
    if (!application.isSubmitted)
      throw new AppError(
        'You can only view or print the application preview after it has been fully submitted.',
        422
      );

    const stepDataRows = await applicationRepository.getAllStepData(applicationId);
    const candidate = await userRepository.findCandidateById(candidateId);

    const stepData = stepDataRows.reduce<Record<string, unknown>>((acc, row) => {
      acc[`step_${row.stepNumber}`] = row.data;
      return acc;
    }, {});
    normalizeStepDataDates(stepData);

    return {
      applicationReferenceNumber: application.applicationReferenceNumber,
      submissionDate: application.submissionDate,
      candidateDetails: candidate,
      stepData,
    };
  }

  async getAllStepsData(
    candidateId: string,
    applicationId?: string
  ): Promise<Record<string, unknown>> {
    let application;
    if (applicationId) {
      application = await applicationRepository.findById(applicationId);
      if (!application) throw new NotFoundError('Application not found');
      if (application.candidateId !== candidateId)
        throw new ForbiddenError('Application does not belong to this candidate');
    } else {
      const apps = await applicationRepository.findByCandidateId(candidateId);
      if (apps.length === 0) {
        throw new NotFoundError('Application not found');
      }
      application = apps[0];
    }

    const stepDataRows = await applicationRepository.getAllStepData(application.id);
    const candidate = await userRepository.findCandidateById(candidateId);

    const stepDataMap: Record<number, Record<string, unknown>> = {};
    for (const row of stepDataRows) {
      stepDataMap[row.stepNumber] = row.data;
    }

    // Fetch all candidate docs once — used for step4, step5, and step6 URL resolution
    const candidateDocs = await documentRepository.findByCandidateId(candidateId);
    const docMap = new Map(candidateDocs.map((d) => [d.id, d]));

    // Resolve step4 document UUIDs (photograph, signatureHindi, signatureEnglish) to presigned URLs
    if (stepDataMap[4]) {
      const step4 = { ...stepDataMap[4] };
      for (const field of ['photograph', 'signatureHindi', 'signatureEnglish']) {
        const uuid = step4[field];
        if (typeof uuid === 'string' && uuid.trim() !== '') {
          const doc = docMap.get(uuid);
          if (doc) {
            const signedUrl = await documentService.getPresignedUrl(doc.fileUrl);
            step4[field] = signedUrl ?? uuid;
          }
        }
      }
      stepDataMap[4] = step4;
    }

    // Resolve step5 document UUID (livePhoto) to presigned URL
    if (stepDataMap[5]) {
      const step5 = { ...stepDataMap[5] };
      const uuid = step5['livePhoto'];
      if (typeof uuid === 'string' && uuid.trim() !== '') {
        const doc = docMap.get(uuid);
        if (doc) {
          const signedUrl = await documentService.getPresignedUrl(doc.fileUrl);
          step5['livePhoto'] = signedUrl ?? uuid;
        }
      }
      stepDataMap[5] = step5;
    }

    // if (stepDataMap[6]) {
    //   const docsStep = { ...stepDataMap[6] };

    //   for (const [key, value] of Object.entries(docsStep)) {
    //     if (typeof value === 'string' && value.trim() !== '') {
    //       const doc = docMap.get(value);
    //       if (doc) {
    //         const signedUrl = await documentService.getPresignedUrl(doc.fileUrl);
    //         // signedUrl is null when the stored fileUrl is a corrupted s3:// placeholder
    //         docsStep[key] = signedUrl ?? null;
    //       }
    //     }
    //   }
    //   stepDataMap[6] = docsStep;
    // }

    await this.enrichStepData(stepDataMap, candidateId);

    return {
      applicationId: application.id,
      candidateId: application.candidateId,
      status: application.status,
      currentStep: application.currentStep,
      completedSteps: application.completedSteps,
      isSubmitted: application.isSubmitted,
      applicationReferenceNumber: application.applicationReferenceNumber,
      submissionDate: application.submissionDate,
      candidateDetails: candidate,
      steps: {
        step0: stepDataMap[0] ?? null,
        step1: stepDataMap[1] ?? null,
        step2: stepDataMap[2] ?? null,
        step3: stepDataMap[3] ?? null,
        step4: stepDataMap[4] ?? null,
        step5: stepDataMap[5] ?? null,
        // step6: stepDataMap[6] ?? null,  // Documents — abhi save nahi ho raha
        // step7: stepDataMap[7] ?? null,  // Payment step=7 — ab step=2 pe shift ho gaya
        // step8: stepDataMap[8] ?? null,  // Final declaration — use nahi ho raha
      },
    };
  }

  private async enrichStepData(
    stepDataMap: Record<number, Record<string, unknown>>,
    candidateId?: string
  ): Promise<void> {
    const db = getDb();
    if (!db || typeof db.select !== 'function') {
      return;
    }

    let candidateRecord: any = null;
    if (candidateId) {
      candidateRecord = await userRepository.findCandidateById(candidateId);
    }

    // Fetch candidate and user details from DB to build/merge step0 dynamically from Cognito data
    if (candidateId && candidateRecord) {
      try {
        const candidate = candidateRecord;

        if (candidate) {
          const dbUserRows = await db
            .select()
            .from(users)
            .where(eq(users.id, candidate.userId))
            .limit(1);
          const dbUser = dbUserRows[0];

          // Fetch category list to map string-based categories/castes to database bigserial catIds
          const categoriesList = await db
            .select({
              catId: categories.catId,
              catValue: categories.catValue,
            })
            .from(categories);
          const catValueToIdMap = new Map(
            categoriesList
              .filter((c) => c.catValue)
              .map((c) => [c.catValue!.toLowerCase().trim(), c.catId])
          );

          const catVal = candidate.category ? candidate.category.toLowerCase().trim() : '';
          const parsedCat = parseInt(catVal, 10);
          const mainCategory = !isNaN(parsedCat) ? parsedCat : (catValueToIdMap.get(catVal) || null);

          const casteVal = candidate.caste ? candidate.caste.toLowerCase().trim() : '';
          const parsedCaste = parseInt(casteVal, 10);
          const subCategory = !isNaN(parsedCaste) ? parsedCaste : (catValueToIdMap.get(casteVal) || null);

          const dobFormatted = candidate.dateOfBirth
            ? new Date(candidate.dateOfBirth).toISOString().split('T')[0].split('-').reverse().join('-')
            : '';

          // If any of the newly added custom keys are null in DB, try to fetch them dynamically from Cognito as auto-healing fallback
          let shouldUpdateDB = false;
          let fetchedServiceFromDate = candidate.serviceFromDate;
          let fetchedServiceToDate = candidate.serviceToDate;
          let fetchedContractualFromDate = candidate.contractualFromDate;
          let fetchedContractualToDate = candidate.contractualToDate;
          let fetchedIsOwnScribe = candidate.isOwnScribe;
          let fetchedTypeOfExOfficer = candidate.typeOfExOfficer;

          // Only call Cognito if one of these fields is null AND dbUser.email is available
          if (
            (fetchedServiceFromDate === null || fetchedServiceToDate === null ||
              fetchedContractualFromDate === null || fetchedContractualToDate === null ||
              fetchedTypeOfExOfficer === null) &&
            dbUser?.email
          ) {
            try {
              const cognitoUser = await cognitoAdminGetUser(dbUser.email);
              if (cognitoUser && Array.isArray(cognitoUser.UserAttributes)) {
                const attrs: Record<string, string> = {};
                for (const attr of cognitoUser.UserAttributes as any[]) {
                  if (attr.Name && attr.Value) {
                    attrs[attr.Name] = attr.Value;
                  }
                }

                if (fetchedServiceFromDate === null && attrs['custom:serviceFromDate']) {
                  fetchedServiceFromDate = new Date(attrs['custom:serviceFromDate']);
                  shouldUpdateDB = true;
                }
                if (fetchedServiceToDate === null && attrs['custom:serviceToDate']) {
                  fetchedServiceToDate = new Date(attrs['custom:serviceToDate']);
                  shouldUpdateDB = true;
                }
                if (fetchedContractualFromDate === null && attrs['custom:contractualFromDate']) {
                  fetchedContractualFromDate = new Date(attrs['custom:contractualFromDate']);
                  shouldUpdateDB = true;
                }
                if (fetchedContractualToDate === null && attrs['custom:contractualToDate']) {
                  fetchedContractualToDate = new Date(attrs['custom:contractualToDate']);
                  shouldUpdateDB = true;
                }
                if (fetchedTypeOfExOfficer === null && attrs['custom:officer_type']) {
                  const oType = attrs['custom:officer_type'].trim();
                  const parsedInt = parseInt(oType, 10);
                  if (!isNaN(parsedInt)) {
                    fetchedTypeOfExOfficer = parsedInt;
                    shouldUpdateDB = true;
                  } else {
                    const exOfficerList = await db
                      .select()
                      .from(typeOfExOfficers)
                      .where(eq(typeOfExOfficers.name, oType))
                      .limit(1);
                    if (exOfficerList.length > 0) {
                      fetchedTypeOfExOfficer = exOfficerList[0].id;
                      shouldUpdateDB = true;
                    }
                  }
                }
                if (attrs['custom:isownscribe'] !== undefined) {
                  const val = attrs['custom:isownscribe'] === 'YES' || attrs['custom:isownscribe'] === 'true';
                  if (fetchedIsOwnScribe !== val) {
                    fetchedIsOwnScribe = val;
                    shouldUpdateDB = true;
                  }
                }
              }
            } catch (cognitoErr) {
              console.error('Auto-healing: failed to retrieve user from Cognito:', dbUser.email, cognitoErr);
            }
          }

          if (shouldUpdateDB) {
            console.log(`Auto-healing candidate metadata for candidate: ${candidate.id}`);
            await userRepository.updateCandidate(candidate.id, {
              serviceFromDate: fetchedServiceFromDate,
              serviceToDate: fetchedServiceToDate,
              contractualFromDate: fetchedContractualFromDate,
              contractualToDate: fetchedContractualToDate,
              isOwnScribe: fetchedIsOwnScribe,
              typeOfExOfficer: fetchedTypeOfExOfficer,
            });
          }

          const cognitoData = {
            fullName: dbUser?.fullName || '',
            emailId: dbUser?.email || '',
            mobileNumber: candidate.mobileNumber || '',
            dateOfBirth: dobFormatted,
            gender: candidate.gender || 'MALE',
            identityType: 'aadhaar',
            identityNumber: '',

            isBiharDomicile: candidate.biharDomicile === true,
            domicileCertificateNumber: candidate.domicileCertificateNumber,
            domicileCertificateAuthority: candidate.domicileCertificateAuthority,
            domicileCertificateIssueDate: candidate.domicileCertificateIssueDate ? new Date(candidate.domicileCertificateIssueDate).toISOString().split('T')[0] : null,

            mainCategory: mainCategory,
            subCategory: subCategory,
            categoryCertificateNumber: candidate.categoryCertificateNumber,
            categoryCertificateAuthority: candidate.categoryCertificateAuthority,
            categoryCertificateIssueDate: candidate.categoryCertificateIssueDate ? new Date(candidate.categoryCertificateIssueDate).toISOString().split('T')[0] : null,

            isPwd: candidate.isPwd === true,
            pwdType: candidate.disabilityType,
            pwd40Percent: candidate.pwd40Percent === true ? 'YES' : 'NO',
            pwdCertificateNumber: candidate.pwdCertificateNumber,
            pwdCertificateAuthority: candidate.pwdCertificateAuthority,
            pwdCertificateIssueDate: candidate.pwdCertificateIssueDate ? new Date(candidate.pwdCertificateIssueDate).toISOString().split('T')[0] : null,

            isExServiceman: candidate.isExServiceman === true,
            exServicemanYears: 0,
            typeOfExOfficer: fetchedTypeOfExOfficer,
            officerType: fetchedTypeOfExOfficer ? String(fetchedTypeOfExOfficer) : '',
            servicePeriod: candidate.servicePeriod || '',
            biharGovtEmp: candidate.isBiharGovtEmp === true ? 'YES' : 'NO',
            bsscAttempts: candidate.bsscAttempts ? String(candidate.bsscAttempts) : '0',
            contractualEmp: candidate.isContractualEmp === true ? 'YES' : 'NO',
            postName: candidate.postName || '',
            hasAgreement: candidate.hasAgreement === true ? 'YES' : 'NO',
            contractualPeriod: candidate.contractualPeriod || '',
            organizationName: candidate.organizationName || '',
            hasPostExperience: candidate.hasPostExperience === true ? 'YES' : 'NO',
            disTypePersist: candidate.disTypePersist || '',
            isScribeRequired: candidate.isScribeRequired === true ? 'YES' : 'NO',
            nonCreamyLayer: candidate.nonCreamyLayer === true ? 'YES' : 'NO',
            serviceFromDate: fetchedServiceFromDate ? new Date(fetchedServiceFromDate).toISOString().split('T')[0] : null,
            serviceToDate: fetchedServiceToDate ? new Date(fetchedServiceToDate).toISOString().split('T')[0] : null,
            contractualFromDate: fetchedContractualFromDate ? new Date(fetchedContractualFromDate).toISOString().split('T')[0] : null,
            contractualToDate: fetchedContractualToDate ? new Date(fetchedContractualToDate).toISOString().split('T')[0] : null,
            isownscribe: fetchedIsOwnScribe === true ? 'YES' : 'NO',
            sportsLevel: null,
            sportsAchievement: null,
            sportsCertificateNumber: null,
            sportsCertificateAuthority: null,
            sportsCertificateIssueDate: null,
            isSportsQuota: false,
            previouslyRegistered: candidate.previouslyRegistered || 'NO',
            governmentIdNumber: candidate.governmentIdNumber || null,
            oldRegistrationNumber: candidate.oldRegistrationNumber || null
          };

          stepDataMap[0] = {
            ...(stepDataMap[0] || {}),
            ...cognitoData
          };
        }
      } catch (err) {
        console.error('Failed to dynamically build step0 from candidate details in enrichStepData:', err);
      }
    }

    // Reconstruct stepDataMap[1] from stepDataMap[0] and stepDataMap[1] to ensure all expected flat BSSC fields are present
    if (stepDataMap[0]) {
      const s0 = stepDataMap[0] as any;
      const s1 = stepDataMap[1] as any || {};

      const hasAadhar = s0.identityType === 'aadhaar' || s0.hasAadharCard === 'YES' || s0.hasAadharCard === true || s0.aadharCardNumber || s0.identityNumber || s1.hasAadharCard === 'YES' || s1.aadharCardNumber ? true : false;

      const perm = s1.address?.permanent || s0.address?.permanent || {};
      const corr = s1.address?.correspondence || s0.address?.correspondence || {};

      let ageOk = true;
      let ageMsg = 'Age is within eligible limits';
      let maxAgeVal = 37;
      const dobStr = s0.dateOfBirth || s0.dob || s1.dateOfBirth || s1.dob || (s0.personalInfo && s0.personalInfo.dob) || (s1.personalInfo && s1.personalInfo.dob);
      if (dobStr) {
        let dobDate: Date | null = null;
        if (typeof dobStr === 'string' && dobStr.includes('-')) {
          const parts = dobStr.split('-');
          if (parts[0].length === 2) {
            dobDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            dobDate = new Date(dobStr);
          }
        } else {
          dobDate = new Date(dobStr);
        }

        if (dobDate && !isNaN(dobDate.getTime())) {
          const rawCat = s1.mainCategory || s1.category || s1.categoryId || s0.mainCategory || s0.category || s0.categoryId || (s1.reservationCategory && s1.reservationCategory.mainCategory ? String(s1.reservationCategory.mainCategory) : 'unreserved');
          let catValue = 'unreserved';
          if (rawCat) {
            const cleanCat = String(rawCat).trim();
            if (isNaN(Number(cleanCat))) {
              catValue = cleanCat;
            } else {
              const catRecord = await db
                .select()
                .from(categories)
                .where(eq(categories.catId, Number(cleanCat)))
                .limit(1);
              if (catRecord.length > 0) {
                catValue = catRecord[0].catValue || 'unreserved';
              }
            }
          }

          const gender = s0.gender || s1.gender || (s0.personalInfo && s0.personalInfo.gender) || (s1.personalInfo && s1.personalInfo.gender) || 'male';
          const isPwd = s1.isPwd === 'YES' || s1.isPwd === true || s1.disability === 'YES' || s1.disability === true || s0.isPwd === 'YES' || s0.isPwd === true || s0.disability === 'YES' || s0.disability === true;
          const isExServiceman = s1.isExServiceman === 'YES' || s1.isExServiceman === true || s1.exServiceman === 'YES' || s1.exServiceman === true || s0.isExServiceman === 'YES' || s0.isExServiceman === true || s0.exServiceman === 'YES' || s0.exServiceman === true;
          const exServicemanYears = s1.exServicemanYears ? Number(s1.exServicemanYears) : (s0.exServicemanYears ? Number(s0.exServicemanYears) : 0);
          const isGovtServant = s1.biharGovtEmp === 'YES' || s1.biharGovtEmp === true || s1.isBiharGovt === 'YES' || s1.isBiharGovt === true || s1.biharGovtEmployee === 'YES' || s1.biharGovtEmployee === true || s0.biharGovtEmp === 'YES' || s0.biharGovtEmp === true || s0.isBiharGovt === 'YES' || s0.isBiharGovt === true || s0.biharGovtEmployee === 'YES' || s0.biharGovtEmployee === true;

          const limits = getBSSCAgeLimits(catValue, gender, isPwd, isExServiceman, exServicemanYears, isGovtServant);
          maxAgeVal = limits.maxAge;

          // Check if candidate qualified on or before 2022-08-01 for carry-forward check
          let qualifiedPre2022 = false;
          const step2 = stepDataMap[2] as any;
          if (step2) {
            if (Array.isArray(step2.qualifications)) {
              const grad = step2.qualifications.find((q: any) => q.level === 'graduation');
              if (grad && grad.passingYear) {
                qualifiedPre2022 = Number(grad.passingYear) <= 2022;
              }
            } else if (step2.graduation && step2.graduation.passingYear) {
              qualifiedPre2022 = Number(step2.graduation.passingYear) <= 2022;
            }
          }

          // Reference date for ex-serviceman check is time of application (submissionDate or current date)
          let refDateForMax = new Date('2025-08-01');
          if (isExServiceman) {
            refDateForMax = new Date();
            if (candidateId) {
              const appsList = await db
                .select({ submissionDate: applications.submissionDate })
                .from(applications)
                .where(eq(applications.candidateId, candidateId))
                .limit(1);
              if (appsList.length > 0 && appsList[0].submissionDate) {
                refDateForMax = new Date(appsList[0].submissionDate);
              }
            }
          }

          const isMinAgeEligible = checkBSSCEligibility(dobDate, limits.minAge, 150, '2025-08-01');
          const isMaxAgeEligibleBase = checkBSSCEligibility(dobDate, 0, limits.maxAge, refDateForMax);
          const isMaxAgeEligibleCarryForward = checkBSSCEligibility(dobDate, 0, limits.maxAge, '2022-08-01') && qualifiedPre2022;

          const ok = isMinAgeEligible && (isMaxAgeEligibleBase || isMaxAgeEligibleCarryForward);
          if (!ok) {
            ageOk = false;
            if (!isMinAgeEligible) {
              ageMsg = `Candidate must be at least ${limits.minAge} years old as of 01-08-2025.`;
            } else {
              ageMsg = `Candidate exceeds the maximum age limit of ${limits.maxAge} years.`;
            }
          }
        }
      }

      // Reconstruct step1 for BSSC compatibility
      stepDataMap[1] = {
        applicationId: s1.applicationId || s0.applicationId || '',
        fullName: s0.fullName || s1.fullName || (s1.personalInfo && s1.personalInfo.fullName) || (s0.personalInfo && s0.personalInfo.fullName) || '',
        fatherName: s1.fatherName || s1.fathersName || s0.fatherName || s0.fathersName || (s1.personalInfo && (s1.personalInfo.fatherName || s1.personalInfo.fathersName)) || (s0.personalInfo && (s0.personalInfo.fatherName || s0.personalInfo.fathersName)) || '',
        motherName: s1.motherName || s0.motherName || (s1.personalInfo && s1.personalInfo.motherName) || (s0.personalInfo && s0.personalInfo.motherName) || '',
        gender: (s0.gender || s1.gender || (s1.personalInfo && s1.personalInfo.gender) || (s0.personalInfo && s0.personalInfo.gender) || 'MALE').toUpperCase(),
        dateOfBirth: s0.dateOfBirth || s0.dob || s1.dateOfBirth || s1.dob || (s1.personalInfo && s1.personalInfo.dob) || (s0.personalInfo && s0.personalInfo.dob) || '',
        nationality: s1.nationality || s0.nationality || (s1.personalInfo && s1.personalInfo.nationality) || (s0.personalInfo && s0.personalInfo.nationality) || 'Indian',
        nationalityId: s1.nationalityId || s0.nationalityId || '1',
        otherNationality: s1.otherNationality || s0.otherNationality || '',
        emailId: s0.emailId || s1.emailId || (s1.personalInfo && s1.personalInfo.emailId) || (s0.personalInfo && s0.personalInfo.emailId) || '',
        mobileNo: s0.mobileNumber || s0.mobileNo || s1.mobileNumber || s1.mobileNo || (s1.personalInfo && s1.personalInfo.mobileNumber) || (s0.personalInfo && s0.personalInfo.mobileNumber) || '',
        confirmMobileNo: s1.confirmMobileNo || s0.confirmMobileNo || s0.mobileNo || s0.mobileNumber || s1.mobileNo || s1.mobileNumber || (s1.personalInfo && s1.personalInfo.mobileNumber) || (s0.personalInfo && s0.personalInfo.mobileNumber) || '',
        identificationMarkEn: s1.identificationMarkEn || s1.identificationMark1 || s0.identificationMarkEn || s0.identificationMark1 || (s1.personalInfo && s1.personalInfo.identificationMark1) || (s0.personalInfo && s0.personalInfo.identificationMark1) || '',
        identificationMarkEn2: s1.identificationMarkEn2 || s1.identificationMark2 || s0.identificationMarkEn2 || s0.identificationMark2 || (s1.personalInfo && s1.personalInfo.identificationMark2) || (s0.personalInfo && s0.personalInfo.identificationMark2) || '',
        isMarried: s1.isMarried || s0.isMarried || (s1.maritalStatus === 'unmarried' || s1.personalInfo?.maritalStatus === 'unmarried' || s0.maritalStatus === 'unmarried' || s0.personalInfo?.maritalStatus === 'unmarried' ? 'NO' : 'YES') || 'NO',
        spouseName: s1.spouseName || s0.spouseName || (s1.personalInfo && s1.personalInfo.spouseName) || (s0.personalInfo && s0.personalInfo.spouseName) || '',
        domicileOfBihar: (s1.isBiharDomicile === true || s1.isBiharDomicile === 'YES' || s1.domicileOfBihar === 'YES' || s1.domicileOfBihar === true || s0.isBiharDomicile === true || s0.isBiharDomicile === 'YES' || s0.domicileOfBihar === 'YES' || s0.domicileOfBihar === true) ? 'YES' : 'NO',
        domicileCertNo: s1.domicileCertNo || s1.domicileCertificateNumber || s0.domicileCertNo || s0.domicileCertificateNumber || '',
        domicileIssueDate: s1.domicileIssueDate || s1.domicileCertificateIssueDate || s0.domicileIssueDate || s0.domicileCertificateIssueDate || '',
        domicileAuthority: s1.domicileAuthority || s1.domicileCertificateAuthority || s0.domicileAuthority || s0.domicileCertificateAuthority || '',
        category: s1.category || s0.category || '',
        categoryId: String(s1.categoryId || s1.mainCategory || s0.categoryId || s0.mainCategory || ''),
        caste: s1.caste || s0.caste || '',
        casteId: String(s1.casteId || s1.subCategory || s0.casteId || s0.subCategory || ''),
        mainCategory: s1.mainCategory || s0.mainCategory || (s1.categoryId ? Number(s1.categoryId) : null) || (s0.categoryId ? Number(s0.categoryId) : null) || null,
        // subCategory: s1.subCategory || s0.subCategory || (s1.casteId ? Number(s1.casteId) : null) || (s0.casteId ? Number(s0.casteId) : null) || null,
        subSubCategoryId: s1.subSubCategoryId || s0.subSubCategoryId || null,
        // mainCategoryId: s1.mainCategoryId || s0.mainCategoryId || (s1.categoryId ? Number(s1.categoryId) : null) || (s0.categoryId ? Number(s0.categoryId) : null) || null,
        // subCategoryId: s1.subCategoryId || s0.subCategoryId || (s1.casteId ? Number(s1.casteId) : null) || (s0.casteId ? Number(s0.casteId) : null) || null,
        reservationCategory: s1.reservationCategory || {
          isLocallyResident: s1.isLocallyResident || s0.isLocallyResident || false,
          localDistrictId: s1.localDistrictId || s0.localDistrictId || null,
          isBiharDomicile: s1.isBiharDomicile || s0.isBiharDomicile || false,
          domicileCertificateNumber: s1.domicileCertificateNumber || s0.domicileCertificateNumber || null,
          domicileCertificateAuthority: s1.domicileCertificateAuthority || s0.domicileCertificateAuthority || null,
          domicileCertificateIssueDate: s1.domicileCertificateIssueDate || s0.domicileCertificateIssueDate || null,
          mainCategory: s1.mainCategory || s0.mainCategory || (s1.categoryId ? Number(s1.categoryId) : null) || (s0.categoryId ? Number(s0.categoryId) : null) || null,
          subCategory: s1.subCategory || s0.subCategory || (s1.casteId ? Number(s1.casteId) : null) || (s0.casteId ? Number(s0.casteId) : null) || null,
          subSubCategoryId: s1.subSubCategoryId || s0.subSubCategoryId || null,
          categoryCertificateNumber: s1.categoryCertificateNumber || s0.categoryCertificateNumber || null,
          categoryCertificateAuthority: s1.categoryCertificateAuthority || s0.categoryCertificateAuthority || null,
          categoryCertificateIssueDate: s1.categoryCertificateIssueDate || s0.categoryCertificateIssueDate || null,
          isPwd: s1.isPwd || s0.isPwd || false,
          // pwdType: s1.pwdType || s0.pwdType || null,
          // pwdPercentage: s1.pwdPercentage || s0.pwdPercentage || null,
          pwdCertificateNumber: s1.pwdCertificateNumber || s0.pwdCertificateNumber || null,
          pwdCertificateAuthority: s1.pwdCertificateAuthority || s0.pwdCertificateAuthority || null,
          pwdCertificateIssueDate: s1.pwdCertificateIssueDate || s0.pwdCertificateIssueDate || null,
          isExServiceman: s1.isExServiceman || s0.isExServiceman || false,
          exServicemanYears: s1.exServicemanYears || s0.exServicemanYears || null,
          typeOfExOfficer: s1.typeOfExOfficer || s0.typeOfExOfficer || (s1.officerType ? parseInt(s1.officerType, 10) : null) || (s0.officerType ? parseInt(s0.officerType, 10) : null) || null,
          isSportsQuota: s1.isSportsQuota || s0.isSportsQuota || false,
          sportsLevel: s1.sportsLevel || s0.sportsLevel || null,
          sportsAchievement: s1.sportsAchievement || s0.sportsAchievement || null,
          serviceFromDate: s1.serviceFromDate || s0.serviceFromDate || null,
          serviceToDate: s1.serviceToDate || s0.serviceToDate || null,
          contractualFromDate: s1.contractualFromDate || s0.contractualFromDate || null,
          contractualToDate: s1.contractualToDate || s0.contractualToDate || null,
          isownscribe: s1.isownscribe || s0.isownscribe || null,
        },
        isNonCreamyLayer: (s1.nonCreamyLayer === 'YES' || s1.nonCreamyLayer === true || s0.nonCreamyLayer === 'YES' || s0.nonCreamyLayer === true) ? 'YES' : 'NO',
        categoryCertNo: s1.categoryCertNo || s1.categoryCertificateNumber || s0.categoryCertNo || s0.categoryCertificateNumber || '',
        categoryIssueDate: s1.categoryIssueDate || s1.categoryCertificateIssueDate || s0.categoryIssueDate || s0.categoryCertificateIssueDate || '',
        categoryAuthority: s1.categoryAuthority || s1.categoryCertificateAuthority || s0.categoryAuthority || s0.categoryCertificateAuthority || '',
        categoryAuthorityOther: s1.categoryAuthorityOther || s0.categoryAuthorityOther || '',
        disability: (s1.isPwd === true || s1.isPwd === 'YES' || s1.disability === 'YES' || s1.disability === true || s0.isPwd === true || s0.isPwd === 'YES' || s0.disability === 'YES' || s0.disability === true) ? 'YES' : 'NO',
        natureOfDisability: s1.natureOfDisability || s1.disabilityType || s1.pwdType || s0.natureOfDisability || s0.disabilityType || s0.pwdType || '',
        natureOfDisabilityType: s1.natureOfDisabilityType || s1.disTypePersist || s0.natureOfDisabilityType || s0.disTypePersist || '',
        disabilityPercent: s1.disabilityPercent || String(s1.pwdPercentage || '') || s0.disabilityPercent || String(s0.pwdPercentage || ''),
        isMin40PercentPwD: (s1.pwd40Percent === 'YES' || s1.pwd40Percent === true || s1.isMin40PercentPwD === 'YES' || s1.isMin40PercentPwD === true || s0.pwd40Percent === 'YES' || s0.pwd40Percent === true || s0.isMin40PercentPwD === 'YES' || s0.isMin40PercentPwD === true) ? 'YES' : 'NO',
        disabilityCertNo: s1.disabilityCertNo || s1.pwdCertificateNumber || s0.disabilityCertNo || s0.pwdCertificateNumber || '',
        disabilityIssueDate: s1.disabilityIssueDate || s1.pwdCertificateIssueDate || s0.disabilityIssueDate || s0.pwdCertificateIssueDate || '',
        disabilityAuthority: s1.disabilityAuthority || s1.pwdCertificateAuthority || s0.disabilityAuthority || s0.pwdCertificateAuthority || '',
        disabilityAuthorityOther: s1.disabilityAuthorityOther || s0.disabilityAuthorityOther || '',
        isScribeRequired: (s1.isScribeRequired === 'YES' || s1.isScribeRequired === true || s0.isScribeRequired === 'YES' || s0.isScribeRequired === true) ? 'YES' : 'NO',
        isownscribe: (s1.isownscribe === 'YES' || s1.isownscribe === true || s0.isownscribe === 'YES' || s0.isownscribe === true) ? 'YES' : 'NO',
        exServiceman: (s1.isExServiceman === true || s1.isExServiceman === 'YES' || s1.exServiceman === 'YES' || s1.exServiceman === true || s0.isExServiceman === true || s0.isExServiceman === 'YES' || s0.exServiceman === 'YES' || s0.exServiceman === true) ? 'YES' : 'NO',
        officerType: String(s1.officerType || s1.typeOfExOfficer || s0.officerType || s0.typeOfExOfficer || ''),
        typeOfExOfficer: s1.typeOfExOfficer || s0.typeOfExOfficer || (s1.officerType ? parseInt(s1.officerType, 10) : null) || (s0.officerType ? parseInt(s0.officerType, 10) : null) || null,
        serviceFromDate: s1.serviceFromDate || s0.serviceFromDate || '',
        serviceToDate: s1.serviceToDate || s0.serviceToDate || '',
        wardOfFreedomFighter: (s1.wardOfFreedomFighter === 'YES' || s1.wardOfFreedomFighter === true || s1.isFreedomFighter === 'YES' || s1.isFreedomFighter === true || s0.wardOfFreedomFighter === 'YES' || s0.wardOfFreedomFighter === true || s0.isFreedomFighter === 'YES' || s0.isFreedomFighter === true) ? 'YES' : 'NO',
        freedomFighterCertNo: s1.freedomFighterCertNo || s0.freedomFighterCertNo || '',
        freedomFighterAuthority: s1.freedomFighterAuthority || s0.freedomFighterAuthority || '',
        biharGovtEmployee: (s1.biharGovtEmployee === 'YES' || s1.biharGovtEmployee === true || s1.biharGovtEmp === 'YES' || s1.biharGovtEmp === true || s0.biharGovtEmployee === 'YES' || s0.biharGovtEmployee === true || s0.biharGovtEmp === 'YES' || s0.biharGovtEmp === true) ? 'YES' : 'NO',
        numberOfAttempts: String(s1.numberOfAttempts || s1.bsscAttempts || s0.numberOfAttempts || s0.bsscAttempts || '0'),
        contractualEmployee: (s1.contractualEmployee === 'YES' || s1.contractualEmployee === true || s1.contractualEmp === 'YES' || s1.contractualEmp === true || s0.contractualEmployee === 'YES' || s0.contractualEmployee === true || s0.contractualEmp === 'YES' || s0.contractualEmp === true) ? 'YES' : 'NO',
        organizationName: s1.organizationName || s0.organizationName || '',
        hasPostExperience: (s1.hasPostExperience === 'YES' || s1.hasPostExperience === true || s0.hasPostExperience === 'YES' || s0.hasPostExperience === true) ? 'YES' : 'NO',
        nameOfPost: s1.nameOfPost || s1.postName || s0.nameOfPost || s0.postName || '',
        agreementCircular: s1.agreementCircular || (s1.hasAgreement === 'YES' || s1.hasAgreement === true ? 'YES' : 'NO') || s0.agreementCircular || (s0.hasAgreement === 'YES' || s0.hasAgreement === true ? 'YES' : 'NO'),
        departmentName: s1.departmentName || s0.departmentName || '',
        officeOrderNo: s1.officeOrderNo || s0.officeOrderNo || '',
        contractualFromDate: s1.contractualFromDate || s0.contractualFromDate || '',
        contractualToDate: s1.contractualToDate || s0.contractualToDate || '',
        isDebarred: (s1.isDebarred === 'YES' || s1.isDebarred === true || s0.isDebarred === 'YES' || s0.isDebarred === true) ? 'YES' : 'NO',
        debarredFromDate: s1.debarredFromDate || s0.debarredFromDate || '',
        debarredToDate: s1.debarredToDate || s0.debarredToDate || '',
        debarmentReason: s1.debarmentReason || s0.debarmentReason || '',
        hasAadharCard: hasAadhar ? 'YES' : 'NO',
        aadharCardNumber: s0.aadharCardNumber || s0.identityNumber || s1.aadharCardNumber || s1.identityNumber || '',
        typeOfPhotoIdProof: s0.typeOfPhotoIdProof || s0.identityType || s1.typeOfPhotoIdProof || s1.identityType || 'aadhaar',
        idProofNo: s0.idProofNo || s0.identityNumber || s1.idProofNo || s1.identityNumber || '',

        permVillage: s1.permVillage || perm.street || perm.cityOrVillage || perm.city || s0.permVillage || '',
        permPoliceStation: s1.permPoliceStation || s0.permPoliceStation || '',
        permPostOffice: s1.permPostOffice || perm.post || s0.permPostOffice || '',
        permDistrict: s1.permDistrict || perm.district || s0.permDistrict || '',
        permDistrictId: s1.permDistrictId || s0.permDistrictId || '',
        permState: s1.permState || perm.state || s0.permState || '',
        permStateId: s1.permStateId || s0.permStateId || '',
        permPinCode: s1.permPinCode || perm.pincode || s0.permPinCode || '',

        corrVillage: s1.corrVillage || corr.street || corr.cityOrVillage || corr.city || s0.corrVillage || '',
        corrPoliceStation: s1.corrPoliceStation || s0.corrPoliceStation || '',
        corrPostOffice: s1.corrPostOffice || corr.post || s0.corrPostOffice || '',
        corrDistrict: s1.corrDistrict || corr.district || s0.corrDistrict || '',
        corrDistrictId: s1.corrDistrictId || s0.corrDistrictId || '',
        corrState: s1.corrState || corr.state || s0.corrState || '',
        corrStateId: s1.corrStateId || s0.corrStateId || '',
        corrPinCode: s1.corrPinCode || corr.pincode || s0.corrPinCode || '',

        sameAsPermanent: s1.sameAsPermanent === true || corr.sameAsPermanent === true || s0.sameAsPermanent === true,
        ageEligibility: {
          ok: ageOk,
          message: ageMsg,
          effectiveMaxAge: maxAgeVal
        },
        previouslyRegistered: candidateRecord?.previouslyRegistered || s1.previouslyRegistered || s0.previouslyRegistered || 'NO',
        governmentIdNumber: candidateRecord?.governmentIdNumber || s1.governmentIdNumber || s0.governmentIdNumber || null,
        oldRegistrationNumber: candidateRecord?.oldRegistrationNumber || s1.oldRegistrationNumber || s0.oldRegistrationNumber || null
      };

      // Reconstruct step0 for frontend output
      stepDataMap[0] = {
        //...s1, // has personalInfo, address, and flat fields
        ...s0, // Cognito fields take precedence
        personalInfo: s1.personalInfo || s0.personalInfo || {
          fullName: s0.fullName || (s1.personalInfo && s1.personalInfo.fullName) || '',
          fatherName: s1.fatherName || s0.fatherName || '',
          motherName: s1.motherName || s0.motherName || '',
          dateOfBirth: s0.dateOfBirth || s1.dateOfBirth || '',
          age: s0.age || s1.age || 0,
          gender: s0.gender || s1.gender || 'MALE',
          maritalStatus: s1.maritalStatus || s0.maritalStatus || 'unmarried',
          spouseName: s1.spouseName || s0.spouseName || '',
          nationality: s1.nationality || s0.nationality || 'Indian',
          identityType: s0.identityType || s1.identityType || 'aadhaar',
          identityNumber: s0.identityNumber || s0.aadharCardNumber || s1.identityNumber || s1.aadharCardNumber || '',
          identificationMark1: s1.identificationMark1 || s0.identificationMark1 || '',
          identificationMark2: s1.identificationMark2 || s0.identificationMark2 || '',
          mobileNumber: s0.mobileNumber || s1.mobileNumber || '',
          alternateNumber: s1.alternateNumber || s0.alternateNumber || '',
          emailId: s0.emailId || s1.emailId || '',
          address: s1.address || s0.address || { permanent: perm, correspondence: corr }
        },
        address: s1.address || s0.address || { permanent: perm, correspondence: corr }
      };
    }

    // 1. Resolve reservationCategory category IDs to names (Step 1)
    if (stepDataMap[1]) {
      const reservationCategory = { ...stepDataMap[1] };

      let catId: number | null = null;
      if (typeof reservationCategory.categoryId === 'number') {
        catId = reservationCategory.categoryId;
      } else if (typeof reservationCategory.mainCategoryId === 'number') {
        catId = reservationCategory.mainCategoryId;
      } else if (typeof reservationCategory.mainCategory === 'number') {
        catId = reservationCategory.mainCategory;
      } else if (
        typeof reservationCategory.categoryId === 'string' &&
        reservationCategory.categoryId !== '' &&
        !isNaN(Number(reservationCategory.categoryId))
      ) {
        catId = Number(reservationCategory.categoryId);
      } else if (
        typeof reservationCategory.mainCategory === 'string' &&
        reservationCategory.mainCategory !== '' &&
        !isNaN(Number(reservationCategory.mainCategory))
      ) {
        catId = Number(reservationCategory.mainCategory);
      } else if (
        typeof reservationCategory.mainCategoryId === 'string' &&
        reservationCategory.mainCategoryId !== '' &&
        !isNaN(Number(reservationCategory.mainCategoryId))
      ) {
        catId = Number(reservationCategory.mainCategoryId);
      }

      let subCatId: number | null = null;
      if (typeof reservationCategory.casteId === 'number') {
        subCatId = reservationCategory.casteId;
      } else if (typeof reservationCategory.subCategoryId === 'number') {
        subCatId = reservationCategory.subCategoryId;
      } else if (typeof reservationCategory.subCategory === 'number') {
        subCatId = reservationCategory.subCategory;
      } else if (
        typeof reservationCategory.casteId === 'string' &&
        reservationCategory.casteId !== '' &&
        !isNaN(Number(reservationCategory.casteId))
      ) {
        subCatId = Number(reservationCategory.casteId);
      } else if (
        typeof reservationCategory.subCategory === 'string' &&
        reservationCategory.subCategory !== '' &&
        !isNaN(Number(reservationCategory.subCategory))
      ) {
        subCatId = Number(reservationCategory.subCategory);
      } else if (
        typeof reservationCategory.subCategoryId === 'string' &&
        reservationCategory.subCategoryId !== '' &&
        !isNaN(Number(reservationCategory.subCategoryId))
      ) {
        subCatId = Number(reservationCategory.subCategoryId);
      }

      const catIds: number[] = [];
      if (catId !== null) catIds.push(catId);
      if (subCatId !== null) catIds.push(subCatId);

      if (catIds.length > 0) {
        try {
          const categoriesList = await db
            .select({
              catId: categories.catId,
              catName: categories.catName,
            })
            .from(categories)
            .where(inArray(categories.catId, catIds));
          const catMap = new Map(categoriesList.map((c) => [c.catId, c.catName]));

          if (catId !== null) {
            reservationCategory.mainCategoryName = catMap.get(catId) || '';
          }
          if (subCatId !== null) {
            reservationCategory.subCategoryName = catMap.get(subCatId) || '';
          }
        } catch (err) {
          console.error('Failed to enrich reservation category names:', err);
        }
      }

      // Resolve localDistrictName from localDistrictId if present
      let districtId: number | null = null;
      if (typeof reservationCategory.localDistrictId === 'number') {
        districtId = reservationCategory.localDistrictId;
      } else if (
        typeof reservationCategory.localDistrictId === 'string' &&
        reservationCategory.localDistrictId !== '' &&
        !isNaN(Number(reservationCategory.localDistrictId))
      ) {
        districtId = Number(reservationCategory.localDistrictId);
      }

      let districtNameVal = '';
      if (districtId !== null) {
        try {
          const districtList = await db
            .select({
              districtId: districts.districtId,
              districtName: districts.districtName,
            })
            .from(districts)
            .where(eq(districts.districtId, districtId))
            .limit(1);
          if (districtList.length > 0) {
            reservationCategory.localDistrictName = districtList[0].districtName;
            districtNameVal = districtList[0].districtName;
          }
        } catch (err) {
          console.error('Failed to resolve district name in enrichStepData:', err);
        }
      }

      // Also enrich fields inside the nested reservationCategory object if present
      if (reservationCategory.reservationCategory && typeof reservationCategory.reservationCategory === 'object') {
        const rc = { ...reservationCategory.reservationCategory } as any;
        if (catId !== null) {
          rc.mainCategoryName = reservationCategory.mainCategoryName;
        }
        if (subCatId !== null) {
          rc.subCategoryName = reservationCategory.subCategoryName;
        }
        if (districtId !== null) {
          rc.localDistrictName = districtNameVal;
        }
        reservationCategory.reservationCategory = rc;
      }

      stepDataMap[1] = reservationCategory;
    }

    // 2. Resolve postPreference post IDs to names (Step 3)
    if (stepDataMap[3]) {
      const postPreferences = { ...stepDataMap[3] };
      if (Array.isArray(postPreferences.postRankings)) {
        const postCodes = postPreferences.postRankings
          .map((pr: any) => pr.postCode || pr.postId)
          .filter((id: any) => typeof id === 'number' || typeof id === 'string');
        if (postCodes.length > 0) {
          try {
            const postsList = await db
              .select({
                postCode: posts.postCode,
                postName: posts.postName,
              })
              .from(posts)
              .where(inArray(posts.postCode, postCodes.map(String)));
            const postMap = new Map(postsList.map((p) => [p.postCode, p.postName]));

            postPreferences.postRankings = postPreferences.postRankings.map((pr: any) => {
              const title = postMap.get(String(pr.postCode || pr.postId));
              return {
                ...pr,
                postTitle: title || '',
                postName: title || '',
              };
            });
            stepDataMap[3] = postPreferences;
          } catch (err) {
            console.error('Failed to enrich post preference names:', err);
          }
        }
      }
    }

    // Delete postGraduation from educational details (step 2 or 3) as it is not needed
    if (stepDataMap[2]) {
      delete stepDataMap[2].postGraduation;
    }
    if (stepDataMap[3]) {
      delete stepDataMap[3].postGraduation;
    }

    normalizeStepDataDates(stepDataMap);
  }
  async finalSubmitLegacy(applicationId: string, candidateId: string, txClient?: any): Promise<any> {
    const db = txClient || getDb();
    const app = await applicationRepository.findById(applicationId);
    if (!app) throw new NotFoundError('Application not found');
    if (app.candidateId !== candidateId) throw new ForbiddenError('Not your application');

    const stepDataRows = await applicationRepository.getAllStepData(applicationId);
    const stepDataMap: Record<number, Record<string, any>> = {};
    for (const row of stepDataRows) {
      stepDataMap[row.stepNumber] = row.data as Record<string, any>;
    }
    await this.enrichStepData(stepDataMap, candidateId);

    // Store the constructed payload in final_submissions table for auditing/history
    try {
      const payload: Record<string, any> = {};
      for (const row of stepDataRows) {
        payload[`step${row.stepNumber}`] = row.data;
      }
      const existing = await db
        .select()
        .from(finalSubmissions)
        .where(
          and(
            eq(finalSubmissions.applicationId, applicationId),
            eq(finalSubmissions.candidateId, candidateId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(finalSubmissions).values({
          applicationId,
          candidateId,
          payload,
        });
      } else {
        await db
          .update(finalSubmissions)
          .set({ payload })
          .where(
            and(
              eq(finalSubmissions.applicationId, applicationId),
              eq(finalSubmissions.candidateId, candidateId)
            )
          );
      }
    } catch (e) {
      console.error("Failed to insert or update finalSubmissions table in finalSubmitLegacy:", e);
    }

    // Process Step 0 -> Candidates table
    if (stepDataMap[0]) {
      const s0 = stepDataMap[0];

      const dobStr = s0.dateOfBirth || s0.dob || (s0.personalInfo && s0.personalInfo.dob);
      let dobDate: Date | null = null;
      if (dobStr) {
        if (typeof dobStr === 'string' && dobStr.includes('-')) {

          const parts = dobStr.split('-');
          if (parts[0].length === 2) {
            dobDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            dobDate = new Date(dobStr);
          }
        } else {
          dobDate = new Date(dobStr);
        }
      }

      await userRepository.updateCandidate(candidateId, {
        alternateNumber: s0.alternateNumber || s0.alternateNo || (s0.personalInfo && s0.personalInfo.alternateNumber) || null,
        mobileNumber: s0.mobileNumber || s0.mobileNo || (s0.personalInfo && s0.personalInfo.mobileNumber) || null,
        dateOfBirth: dobDate,
        gender: s0.gender || (s0.personalInfo && s0.personalInfo.gender) || null,
        category: s0.category || s0.categoryId || s0.mainCategory || (s0.reservationCategory && s0.reservationCategory.mainCategory ? String(s0.reservationCategory.mainCategory) : null) || null,
        caste: s0.caste || s0.casteId || null,
        biharDomicile: s0.isBiharDomicile === 'YES' || s0.isBiharDomicile === true || s0.domicileOfBihar === 'YES' || s0.domicileOfBihar === true || s0.biharDomicile === 'YES' || s0.biharDomicile === true || (s0.reservationCategory && (s0.reservationCategory.isBiharDomicile === true || s0.reservationCategory.isBiharDomicile === 'YES')),
        isPwd: s0.isPwd === 'YES' || s0.isPwd === true || s0.disability === 'YES' || s0.disability === true || (s0.reservationCategory && (s0.reservationCategory.isPwd === true || s0.reservationCategory.isPwd === 'YES')),
        disabilityType: s0.disabilityType || s0.pwdType || s0.natureOfDisability || (s0.reservationCategory && s0.reservationCategory.pwdType ? String(s0.reservationCategory.pwdType) : null) || null,
        pwd40Percent: s0.pwd40Percent === 'YES' || s0.pwd40Percent === true || s0.pwd40Percent === 'yes' || s0.isMin40PercentPwD === 'YES' || s0.isMin40PercentPwD === true || s0.disabilityPercent === 'YES' || (s0.reservationCategory && (s0.reservationCategory.pwdPercentage !== undefined && s0.reservationCategory.pwdPercentage >= 40)),
        isExServiceman: s0.isExServiceman === 'YES' || s0.isExServiceman === true || s0.isExsm === 'YES' || s0.isExsm === true || s0.exServiceman === 'YES' || s0.exServiceman === true || (s0.reservationCategory && (s0.reservationCategory.isExServiceman === true || s0.reservationCategory.isExServiceman === 'YES')),
        isBiharGovtEmp: s0.biharGovtEmp === 'YES' || s0.biharGovtEmp === true || s0.isBiharGovt === 'YES' || s0.isBiharGovt === true || s0.biharGovtEmployee === 'YES' || s0.biharGovtEmployee === true,
        isContractualEmp: s0.contractualEmp === 'YES' || s0.contractualEmp === true || s0.isContractual === 'YES' || s0.isContractual === true || s0.contractualEmployee === 'YES' || s0.contractualEmployee === true,
        bsscAttempts: s0.numberOfAttempts ? parseInt(String(s0.numberOfAttempts), 10) || 0 : (s0.bsscAttempts ? parseInt(String(s0.bsscAttempts), 10) || 1 : 1),
        nonCreamyLayer: s0.nonCreamyLayer === 'YES' || s0.nonCreamyLayer === true || s0.isNonCreamyLayer === 'YES' || s0.isNonCreamyLayer === true,
        servicePeriod: s0.servicePeriod || null,
        postName: s0.postName || s0.nameOfPost || null,
        hasAgreement: s0.hasAgreement === 'YES' || s0.hasAgreement === true || s0.hasAgreement === 'yes' || s0.agreementCircular === 'YES' || s0.agreementCircular === true,
        contractualPeriod: s0.contractualPeriod || null,

        // Certificate columns
        domicileCertificateNumber: s0.domicileCertificateNumber || s0.domicileCertNo || (s0.reservationCategory && s0.reservationCategory.domicileCertificateNumber) || null,
        domicileCertificateAuthority: s0.domicileCertificateAuthority || s0.domicileAuthority || (s0.reservationCategory && s0.reservationCategory.domicileCertificateAuthority) || null,
        domicileCertificateIssueDate: parseServiceDate(s0.domicileCertificateIssueDate || s0.domicileIssueDate || (s0.reservationCategory && s0.reservationCategory.domicileCertificateIssueDate)),

        categoryCertificateNumber: s0.categoryCertificateNumber || s0.categoryCertNo || (s0.reservationCategory && s0.reservationCategory.categoryCertificateNumber) || null,
        categoryCertificateAuthority: s0.categoryCertificateAuthority || s0.categoryAuthority || (s0.reservationCategory && s0.reservationCategory.categoryCertificateAuthority) || null,
        categoryCertificateIssueDate: parseServiceDate(s0.categoryCertificateIssueDate || s0.categoryIssueDate || (s0.reservationCategory && s0.reservationCategory.categoryCertificateIssueDate)),

        pwdCertificateNumber: s0.pwdCertificateNumber || s0.disabilityCertNo || (s0.reservationCategory && s0.reservationCategory.pwdCertificateNumber) || null,
        pwdCertificateAuthority: s0.pwdCertificateAuthority || s0.disabilityAuthority || (s0.reservationCategory && s0.reservationCategory.pwdCertificateAuthority) || null,
        pwdCertificateIssueDate: parseServiceDate(s0.pwdCertificateIssueDate || s0.disabilityIssueDate || (s0.reservationCategory && s0.reservationCategory.pwdCertificateIssueDate)),

        disTypePersist: s0.disTypePersist || s0.natureOfDisabilityType || null,
        isScribeRequired: s0.isScribeRequired === 'YES' || s0.isScribeRequired === true || s0.isScribeRequired === 'yes',

        organizationName: s0.organizationName || null,
        hasPostExperience: s0.hasPostExperience === 'YES' || s0.hasPostExperience === true || s0.hasPostExperience === 'yes',

        serviceFromDate: parseServiceDate(s0.serviceFromDate || (s0.reservationCategory && s0.reservationCategory.serviceFromDate)),
        serviceToDate: parseServiceDate(s0.serviceToDate || (s0.reservationCategory && s0.reservationCategory.serviceToDate)),
        contractualFromDate: parseServiceDate(s0.contractualFromDate || (s0.reservationCategory && s0.reservationCategory.contractualFromDate)),
        contractualToDate: parseServiceDate(s0.contractualToDate || (s0.reservationCategory && s0.reservationCategory.contractualToDate)),
        isOwnScribe: s0.isownscribe === 'YES' || s0.isownscribe === true || s0.isownscribe === 'yes' || (s0.reservationCategory && (s0.reservationCategory.isownscribe === 'YES' || s0.reservationCategory.isownscribe === true)),
      }, db);
    }

    // Process Step 1 -> Candidates table (for BSSC flat payload and extra details)
    if (stepDataMap[1]) {
      const s1 = stepDataMap[1];
      const dobStr = s1.dateOfBirth || s1.dob || (s1.personalInfo && s1.personalInfo.dob);
      let dobDate: Date | null = null;
      if (dobStr) {
        if (typeof dobStr === 'string' && dobStr.includes('-')) {
          const parts = dobStr.split('-');
          if (parts[0].length === 2) {
            dobDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            dobDate = new Date(dobStr);
          }
        } else {
          dobDate = new Date(dobStr);
        }
      }

      await userRepository.updateCandidate(candidateId, {
        alternateNumber: s1.alternateNumber || s1.alternateNo || (s1.personalInfo && s1.personalInfo.alternateNumber) || null,
        mobileNumber: s1.mobileNumber || s1.mobileNo || (s1.personalInfo && s1.personalInfo.mobileNumber) || null,
        dateOfBirth: dobDate,
        gender: s1.gender || (s1.personalInfo && s1.personalInfo.gender) || null,
        category: s1.category || s1.categoryId || s1.mainCategory || (s1.reservationCategory && s1.reservationCategory.mainCategory ? String(s1.reservationCategory.mainCategory) : null) || null,
        caste: s1.caste || s1.casteId || null,
        biharDomicile: s1.isBiharDomicile === 'YES' || s1.isBiharDomicile === true || s1.domicileOfBihar === 'YES' || s1.domicileOfBihar === true || s1.biharDomicile === 'YES' || s1.biharDomicile === true || (s1.reservationCategory && (s1.reservationCategory.isBiharDomicile === true || s1.reservationCategory.isBiharDomicile === 'YES')),
        isPwd: s1.isPwd === 'YES' || s1.isPwd === true || s1.disability === 'YES' || s1.disability === true || (s1.reservationCategory && (s1.reservationCategory.isPwd === true || s1.reservationCategory.isPwd === 'YES')),
        disabilityType: s1.disabilityType || s1.pwdType || s1.natureOfDisability || (s1.reservationCategory && s1.reservationCategory.pwdType ? String(s1.reservationCategory.pwdType) : null) || null,
        pwd40Percent: s1.pwd40Percent === 'YES' || s1.pwd40Percent === true || s1.pwd40Percent === 'yes' || s1.isMin40PercentPwD === 'YES' || s1.isMin40PercentPwD === true || s1.disabilityPercent === 'YES' || (s1.reservationCategory && (s1.reservationCategory.pwdPercentage !== undefined && s1.reservationCategory.pwdPercentage >= 40)),
        isExServiceman: s1.isExServiceman === 'YES' || s1.isExServiceman === true || s1.isExsm === 'YES' || s1.isExsm === true || s1.exServiceman === 'YES' || s1.exServiceman === true || (s1.reservationCategory && (s1.reservationCategory.isExServiceman === true || s1.reservationCategory.isExServiceman === 'YES')),
        isBiharGovtEmp: s1.biharGovtEmp === 'YES' || s1.biharGovtEmp === true || s1.isBiharGovt === 'YES' || s1.isBiharGovt === true || s1.biharGovtEmployee === 'YES' || s1.biharGovtEmployee === true,
        isContractualEmp: s1.contractualEmp === 'YES' || s1.contractualEmp === true || s1.isContractual === 'YES' || s1.isContractual === true || s1.contractualEmployee === 'YES' || s1.contractualEmployee === true,
        bsscAttempts: s1.numberOfAttempts ? parseInt(String(s1.numberOfAttempts), 10) || 0 : (s1.bsscAttempts ? parseInt(String(s1.bsscAttempts), 10) || 1 : 1),
        nonCreamyLayer: s1.nonCreamyLayer === 'YES' || s1.nonCreamyLayer === true || s1.isNonCreamyLayer === 'YES' || s1.isNonCreamyLayer === true,
        servicePeriod: s1.servicePeriod || null,
        postName: s1.postName || s1.nameOfPost || null,
        hasAgreement: s1.hasAgreement === 'YES' || s1.hasAgreement === true || s1.hasAgreement === 'yes' || s1.agreementCircular === 'YES' || s1.agreementCircular === true,
        contractualPeriod: s1.contractualPeriod || null,

        // Certificate columns
        domicileCertificateNumber: s1.domicileCertificateNumber || s1.domicileCertNo || (s1.reservationCategory && s1.reservationCategory.domicileCertificateNumber) || null,
        domicileCertificateAuthority: s1.domicileCertificateAuthority || s1.domicileAuthority || (s1.reservationCategory && s1.reservationCategory.domicileCertificateAuthority) || null,
        domicileCertificateIssueDate: parseServiceDate(s1.domicileCertificateIssueDate || s1.domicileIssueDate || (s1.reservationCategory && s1.reservationCategory.domicileCertificateIssueDate)),

        categoryCertificateNumber: s1.categoryCertificateNumber || s1.categoryCertNo || (s1.reservationCategory && s1.reservationCategory.categoryCertificateNumber) || null,
        categoryCertificateAuthority: s1.categoryCertificateAuthority || s1.categoryAuthority || (s1.reservationCategory && s1.reservationCategory.categoryCertificateAuthority) || null,
        categoryCertificateIssueDate: parseServiceDate(s1.categoryCertificateIssueDate || s1.categoryIssueDate || (s1.reservationCategory && s1.reservationCategory.categoryCertificateIssueDate)),

        pwdCertificateNumber: s1.pwdCertificateNumber || s1.disabilityCertNo || (s1.reservationCategory && s1.reservationCategory.pwdCertificateNumber) || null,
        pwdCertificateAuthority: s1.pwdCertificateAuthority || s1.disabilityAuthority || (s1.reservationCategory && s1.reservationCategory.pwdCertificateAuthority) || null,
        pwdCertificateIssueDate: parseServiceDate(s1.pwdCertificateIssueDate || s1.disabilityIssueDate || (s1.reservationCategory && s1.reservationCategory.pwdCertificateIssueDate)),

        disTypePersist: s1.disTypePersist || s1.natureOfDisabilityType || null,
        isScribeRequired: s1.isScribeRequired === 'YES' || s1.isScribeRequired === true || s1.isScribeRequired === 'yes',

        organizationName: s1.organizationName || null,
        hasPostExperience: s1.hasPostExperience === 'YES' || s1.hasPostExperience === true || s1.hasPostExperience === 'yes',

        serviceFromDate: parseServiceDate(s1.serviceFromDate || (s1.reservationCategory && s1.reservationCategory.serviceFromDate)),
        serviceToDate: parseServiceDate(s1.serviceToDate || (s1.reservationCategory && s1.reservationCategory.serviceToDate)),
        contractualFromDate: parseServiceDate(s1.contractualFromDate || (s1.reservationCategory && s1.reservationCategory.contractualFromDate)),
        contractualToDate: parseServiceDate(s1.contractualToDate || (s1.reservationCategory && s1.reservationCategory.contractualToDate)),
        isOwnScribe: s1.isownscribe === 'YES' || s1.isownscribe === true || s1.isownscribe === 'yes' || (s1.reservationCategory && (s1.reservationCategory.isownscribe === 'YES' || s1.reservationCategory.isownscribe === true)),
      }, db);
    }

    // Determine whether this application is using BSSC step numbers (educational details in step 3) or JSSC step numbers (educational details in step 2)
    const isBSSC = !!(
      (stepDataMap[3] && (stepDataMap[3].tenth || stepDataMap[3].qualifications)) ||
      (stepDataMap[4] && stepDataMap[4].postRankings) ||
      (stepDataMap[5] && (stepDataMap[5].paperOne || stepDataMap[5].paperOneLanguage))
    );

    const qualificationsStep = isBSSC ? 3 : 2;
    const postPreferencesStep = isBSSC ? 4 : 3;
    const languagesStep = isBSSC ? 5 : 4;

    // Process Experiences and Qualifications (Step 2 or 3)
    const sQuals = stepDataMap[qualificationsStep];
    if (sQuals) {
      const parsedQualifications: any[] = [];

      // 1. Support JSSC format (array of qualifications)
      if (Array.isArray(sQuals.qualifications)) {
        for (const q of sQuals.qualifications) {
          const obtained = q.marksObtained || q.obtainedMarks;
          const total = q.totalMarks;
          const percentageVal = (obtained && total && Number(total) > 0)
            ? String(((Number(obtained) / Number(total)) * 100).toFixed(2))
            : (q.percentage ? String(parseFloat(String(q.percentage))) : null);

          parsedQualifications.push({
            level: q.level || 'unknown',
            degree: q.degree || null,
            boardUniversity: q.boardUniversity || null,
            totalMarks: total ? parseInt(String(total)) : null,
            marksObtained: obtained ? parseInt(String(obtained)) : null,
            percentage: percentageVal,
            specialization: q.specialization || null,
            passingYear: q.passingYear || null,
            jobQualificationId: q.jobQualificationId || null,
          });
        }
      } else {
        // 2. Support BSSC format (nested objects tenth, twelfth, graduation, postGraduation)
        const levels = ['tenth', 'twelfth', 'graduation' /*, 'postGraduation'*/] as const;
        for (const lvl of levels) {
          if (sQuals[lvl] && typeof sQuals[lvl] === 'object') {
            const q = sQuals[lvl] as any;
            let dbLevel = 'unknown';
            let degree = '';
            if (lvl === 'tenth') {
              dbLevel = 'matriculation';
              degree = '10th';
            } else if (lvl === 'twelfth') {
              dbLevel = 'intermediate';
              degree = '12th';
            } else if (lvl === 'graduation') {
              dbLevel = 'graduation';
              degree = q.subject || 'Graduation';
            } else if (lvl === 'postGraduation') {
              dbLevel = 'post_graduation';
              degree = q.subject || 'Post Graduation';
            }

            const obtained = q.obtainedMarks || q.marksObtained;
            const total = q.totalMarks;
            const percentageVal = (obtained && total && Number(total) > 0)
              ? String(((Number(obtained) / Number(total)) * 100).toFixed(2))
              : (q.percentage ? String(parseFloat(String(q.percentage))) : null);

            parsedQualifications.push({
              level: dbLevel,
              degree: degree,
              boardUniversity: q.boardUniversity || null,
              totalMarks: total ? parseInt(String(total)) : null,
              marksObtained: obtained ? parseInt(String(obtained)) : null,
              percentage: percentageVal,
              specialization: q.subject || null,
              passingYear: q.certIssueDate ? String(q.certIssueDate).split('-')[0] : null,
              jobQualificationId: null,
            });
          }
        }
      }

      if (parsedQualifications.length > 0) {
        await db
          .delete(candidateQualifications)
          .where(eq(candidateQualifications.applicationId, applicationId));
        for (const q of parsedQualifications) {
          await db.insert(candidateQualifications).values({
            applicationId,
            level: q.level,
            degree: q.degree,
            boardUniversity: q.boardUniversity,
            totalMarks: q.totalMarks,
            marksObtained: q.marksObtained,
            percentage: q.percentage,
            specialization: q.specialization,
            passingYear: q.passingYear,
            jobQualificationId: q.jobQualificationId,
          });
        }
      }
    }

    // Process Post Preferences (Step 3 or 4)
    const sPrefs = stepDataMap[postPreferencesStep];
    if (sPrefs) {
      if (Array.isArray(sPrefs.postRankings)) {
        await db
          .delete(candidatePostPreferences)
          .where(eq(candidatePostPreferences.applicationId, applicationId));
        for (const p of sPrefs.postRankings) {
          await db.insert(candidatePostPreferences).values({
            applicationId,
            postCode: String(p.postCode || p.postId),
            priority: parseInt(p.priority),
            isRegular: sPrefs.isRegular ?? true,
            isBacklog: sPrefs.isBacklog ?? false,
          });
        }
      }
    }

    // Process Languages / Subjects (Step 4 or 5)
    const sLangs = stepDataMap[languagesStep];
    if (sLangs) {
      await db
        .delete(candidateLanguages)
        .where(eq(candidateLanguages.applicationId, applicationId));
      await db.insert(candidateLanguages).values({
        applicationId,
        paperOneLanguage: sLangs.paperOne || sLangs.paperOneLanguage,
        paperTwoLanguage: sLangs.paperTwo || sLangs.paperTwoLanguage,
        paperThreeLanguage:
          sLangs.paperThreeForPost4 ||
          sLangs.paperThreeForPost6 ||
          sLangs.paperThreeForPost7 ||
          sLangs.paperThreeLanguage ||
          '',
      });
    }

    // Process Step 6 -> Documents
    // The step-6 values are document IDs that were already uploaded in step 5.
    // We only need to ensure the document row is correctly associated with this
    // candidate/type. We must NOT overwrite fileUrl with a fake s3:// placeholder —
    // the real HTTPS URL was saved during the actual S3 upload.
    if (stepDataMap[6]) {
      const s6 = stepDataMap[6];
      const docMapping: Record<string, string> = {
        photo: 'photo',
        signature: 'signature',
        tenthMarksheet: 'tenthMarksheet',
        twelfthMarksheet: 'twelfthMarksheet',
        graduationMarksheet: 'graduationMarksheet',
        // postGraduationCertificate: 'postGraduationCertificate',
      };

      for (const [key, docType] of Object.entries(docMapping)) {
        const docId = s6[key];
        if (!docId || typeof docId !== 'string') continue;

        // Look up the document row that was already created during the upload step.
        const [existingById] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, docId))
          .limit(1);

        if (existingById) {
          // Row already exists with the correct fileUrl — just ensure type/candidateId are set.
          await db
            .update(documents)
            .set({
              documentType: docType,
              candidateId,
              updatedAt: new Date(),
            })
            .where(eq(documents.id, docId));
        } else {
          // Fallback: check by candidateId + documentType (older records).
          const [existingByType] = await db
            .select()
            .from(documents)
            .where(and(eq(documents.candidateId, candidateId), eq(documents.documentType, docType)))
            .limit(1);

          if (!existingByType) {
            // No record at all — log a warning. We cannot fabricate a real fileUrl here.
            console.warn(
              `[finalSubmitLegacy] No uploaded document found for type "${docType}" (id: ${docId}). Skipping.`
            );
          }
          // If existingByType exists, its fileUrl is already correct — nothing to do.
        }
      }
    }

    // Mark application as submitted
    const refNo = app.applicationReferenceNumber || `BSSC${Date.now().toString(36).toUpperCase()}`;
    const submissionDate = app.submissionDate || new Date();
    await db
      .update(applications)
      .set({
        isSubmitted: true,
        status: 'submitted',
        applicationReferenceNumber: refNo,
        submissionDate: submissionDate,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));

    try {
      // Generate and upload HTML
      const htmlString = await this.generateHtml(applicationId, candidateId, true);
      const s3Url = await documentService.uploadGeneratedHtml(
        candidateId,
        Buffer.from(htmlString),
        refNo
      );
      console.log(`[finalSubmitLegacy] Uploaded generated HTML to: ${s3Url}`);
    } catch (err) {
      console.error(
        `[finalSubmitLegacy] Failed to generate/upload HTML for ${applicationId}:`,
        err
      );
    }

    return { success: true, applicationReferenceNumber: refNo };
  }

  async unifiedFinalSubmit(applicationId: string, candidateId: string): Promise<any> {
    const db = getDb();
    const app = await applicationRepository.findById(applicationId);
    if (!app) throw new NotFoundError('Application not found');
    if (app.candidateId !== candidateId) throw new ForbiddenError('Not your application');

    // Fetch existing steps to form the monolithic payload for history/auditing
    const stepDataRows = await applicationRepository.getAllStepData(applicationId);
    const payload: Record<string, any> = {};
    for (const row of stepDataRows) {
      payload[`step${row.stepNumber}`] = row.data;
    }

    // Wrap the entire final submission mapping and auditing logic in a transaction
    return await db.transaction(async (tx) => {
      // 1. Store the constructed payload in final_submissions table
      try {
        const existing = await tx
          .select()
          .from(finalSubmissions)
          .where(
            and(
              eq(finalSubmissions.applicationId, applicationId),
              eq(finalSubmissions.candidateId, candidateId)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await tx.insert(finalSubmissions).values({
            applicationId,
            candidateId,
            payload,
          });
        } else {
          await tx
            .update(finalSubmissions)
            .set({ payload })
            .where(
              and(
                eq(finalSubmissions.applicationId, applicationId),
                eq(finalSubmissions.candidateId, candidateId)
              )
            );
        }
      } catch (e) {
        console.error("Failed to insert or update finalSubmissions table in unifiedFinalSubmit:", e);
      }

      // 2. Call legacy submit to map data into existing tables, passing the transaction context
      return this.finalSubmitLegacy(applicationId, candidateId, tx);
    });
  }

  async generateHtml(applicationId: string, candidateId: string, bypassSubmitCheck = false): Promise<string> {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw new NotFoundError('Application not found');
    if (application.candidateId !== candidateId)
      throw new ForbiddenError('Application does not belong to this candidate');
    if (!bypassSubmitCheck && !application.isSubmitted)
      throw new AppError(
        'You can only view or print the application preview after it has been fully submitted.',
        422
      );

    const stepsData = await this.getAllStepsData(candidateId, applicationId);
    return generateApplicationHtml(stepsData as any);
  }
}

export const applicationService = new ApplicationService();
export default applicationService;
