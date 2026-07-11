import { applicationRepository } from '../repositories/application.repository';
import { userRepository } from '../repositories/user.repository';
import { getDb } from '../database/drizzle';
import { calculateBSSCAge } from '../utils/age';
import { eq, and, inArray } from 'drizzle-orm';
import { generateApplicationHtml } from '../utils/pdf';
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
} from '../database/schema';
import { documentRepository } from '../repositories/common.repository';
import { documentService } from './document.service';
import { AppError, NotFoundError, ForbiddenError } from '../errors/AppError';
import { STEP_SCHEMAS, type StepNumber } from '../validators/application';
import { validate } from '../middleware/validate';
import { generateRandomToken } from '../utils/crypto';
import type { ApplicationDraft, ApplicationStepData } from '../types';
import type { Application, ApplicationStepDatum } from '../database/schema';

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
    await this.enrichStepData(stepDataMap);
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
        step6: stepDataMap[6] ?? null,
        step7: stepDataMap[7] ?? null,
        step8: stepDataMap[8] ?? null,
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
      const levels = ['tenth', 'twelfth', 'graduation', 'postGraduation'] as const;
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
          } else if (lvl === 'postGraduation') {
            dbLevel = 'post_graduation';
            degree = q.subject || 'Post Graduation';
          }

          qualifications.push({
            level: dbLevel,
            degree: degree,
            boardUniversity: q.boardUniversity || 'N/A',
            totalMarks: q.totalMarks ? String(q.totalMarks) : '0',
            obtainedMarks: q.obtainedMarks || q.marksObtained || '0',
            marksObtained: q.obtainedMarks || q.marksObtained || '0',
            percentage: q.percentage ? String(q.percentage) : '0',
            specialization: q.subject || null,
            passingYear: q.certIssueDate ? String(q.certIssueDate).split('-')[0] : null,
            certNumber: q.certNumber || '',
            certIssueDate: q.certIssueDate || null,
          });
        }
      }
      if (qualifications.length > 0) {
        (data as any).qualifications = qualifications;
      }
    }

    const schema = STEP_SCHEMAS[stepNumber as StepNumber];
    if (schema) {
      validate(schema as any, data);
    }

    await applicationRepository.upsertStepData(applicationId, stepNumber, data);

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

    const stepData = await applicationRepository.getStepData(applicationId, stepNumber);
    return stepData?.data ?? null;
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

    const requiredSteps = [0, 1, 2, 3, 4, 5, 6, 7];
    let missingSteps = requiredSteps.filter((step) => !application.completedSteps.includes(step));

    // Allow submission if payment is already completed (for 0 amount bypass or successful payments)
    if (missingSteps.includes(7) && application.status === 'payment_completed') {
      missingSteps = missingSteps.filter((step) => step !== 7);
    }

    if (missingSteps.length > 0) {
      throw new AppError(
        `Cannot submit: incomplete steps: ${missingSteps.map((s) => `Step ${s}`).join(', ')}`,
        422
      );
    }

    const referenceNumber = `BSSC${Date.now().toString(36).toUpperCase()}`;
    return applicationRepository.submit(applicationId, referenceNumber);
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

    return {
      applicationReferenceNumber: application.applicationReferenceNumber,
      submissionDate: application.submissionDate,
      candidateDetails: candidate,
      stepData: stepDataRows.reduce<Record<string, unknown>>((acc, row) => {
        acc[`step_${row.stepNumber}`] = row.data;
        return acc;
      }, {}),
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

    if (stepDataMap[6]) {
      const docsStep = { ...stepDataMap[6] };
      const candidateDocs = await documentRepository.findByCandidateId(candidateId);
      const docMap = new Map(candidateDocs.map((d) => [d.id, d]));

      for (const [key, value] of Object.entries(docsStep)) {
        if (typeof value === 'string' && value.trim() !== '') {
          const doc = docMap.get(value);
          if (doc) {
            const signedUrl = await documentService.getPresignedUrl(doc.fileUrl);
            // signedUrl is null when the stored fileUrl is a corrupted s3:// placeholder
            docsStep[key] = signedUrl ?? null;
          }
        }
      }
      stepDataMap[6] = docsStep;
    }

    await this.enrichStepData(stepDataMap);

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
        step6: stepDataMap[6] ?? null,
        step7: stepDataMap[7] ?? null,
        step8: stepDataMap[8] ?? null,
      },
    };
  }

  private async enrichStepData(
    stepDataMap: Record<number, Record<string, unknown>>
  ): Promise<void> {
    const db = getDb();
    if (!db || typeof db.select !== 'function') {
      return;
    }

    // 1. Resolve reservationCategory category IDs to names (Step 1)
    if (stepDataMap[1]) {
      const reservationCategory = { ...stepDataMap[1] };

      let catId: number | null = null;
      if (typeof reservationCategory.mainCategoryId === 'number') {
        catId = reservationCategory.mainCategoryId;
      } else if (typeof reservationCategory.mainCategory === 'number') {
        catId = reservationCategory.mainCategory;
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
      if (typeof reservationCategory.subCategoryId === 'number') {
        subCatId = reservationCategory.subCategoryId;
      } else if (typeof reservationCategory.subCategory === 'number') {
        subCatId = reservationCategory.subCategory;
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
          }
        } catch (err) {
          console.error('Failed to resolve district name in enrichStepData:', err);
        }
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
  }
  async finalSubmitLegacy(applicationId: string, candidateId: string): Promise<any> {
    const db = getDb();
    const app = await applicationRepository.findById(applicationId);
    if (!app) throw new NotFoundError('Application not found');
    if (app.candidateId !== candidateId) throw new ForbiddenError('Not your application');

    const stepDataRows = await applicationRepository.getAllStepData(applicationId);
    const stepDataMap: Record<number, Record<string, any>> = {};
    for (const row of stepDataRows) {
      stepDataMap[row.stepNumber] = row.data as Record<string, any>;
    }
    // Process Step 0 -> Candidates table
    if (stepDataMap[0]) {
      const s0 = stepDataMap[0];
      await db
        .update(candidates)
        .set({
          alternateNumber: s0.alternateNumber || null,
          mobileNumber: s0.mobileNumber || null,
          dateOfBirth: s0.dateOfBirth
            ? new Date(
              s0.dateOfBirth.includes('-') && s0.dateOfBirth.split('-')[0].length === 2
                ? s0.dateOfBirth.split('-').reverse().join('-')
                : s0.dateOfBirth
            )
            : null,
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, candidateId));
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
          parsedQualifications.push({
            level: q.level || 'unknown',
            degree: q.degree || null,
            boardUniversity: q.boardUniversity || null,
            totalMarks: q.totalMarks ? parseInt(String(q.totalMarks)) : null,
            marksObtained: q.marksObtained ? parseInt(String(q.marksObtained)) : null,
            percentage: q.percentage ? String(parseFloat(String(q.percentage))) : null,
            specialization: q.specialization || null,
            passingYear: q.passingYear || null,
            jobQualificationId: q.jobQualificationId || null,
          });
        }
      } else {
        // 2. Support BSSC format (nested objects tenth, twelfth, graduation, postGraduation)
        const levels = ['tenth', 'twelfth', 'graduation', 'postGraduation'] as const;
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

            parsedQualifications.push({
              level: dbLevel,
              degree: degree,
              boardUniversity: q.boardUniversity || null,
              totalMarks: q.totalMarks ? parseInt(String(q.totalMarks)) : null,
              marksObtained: q.obtainedMarks ? parseInt(String(q.obtainedMarks)) : null,
              percentage: q.percentage ? String(parseFloat(String(q.percentage))) : null,
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
        postGraduationCertificate: 'postGraduationCertificate',
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
      const htmlString = await this.generateHtml(applicationId, candidateId);
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

    // 1. Store the constructed payload in final_submissions table
    try {
      await db.insert(finalSubmissions).values({
        applicationId,
        candidateId,
        payload,
      });
    } catch (e) {
      console.error("Failed to insert into finalSubmissions table, maybe it doesn't exist yet:", e);
    }

    // 2. Call legacy submit to map data into existing tables
    return this.finalSubmitLegacy(applicationId, candidateId);
  }

  async generateHtml(applicationId: string, candidateId: string): Promise<string> {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw new NotFoundError('Application not found');
    if (application.candidateId !== candidateId)
      throw new ForbiddenError('Application does not belong to this candidate');
    if (!application.isSubmitted)
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
