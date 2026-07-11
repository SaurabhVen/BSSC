import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { getDb } from '../database/drizzle';
import {
  posts,
  subjects,
  degrees,
  degreePostMap,
  applicationStepData,
  jobQualifications,
  categories,
} from '../database/schema';
import { calculateBSSCAge, getBSSCAgeLimits, calculateExactAge, checkBSSCEligibility } from '../utils/age';
import { eq, inArray } from 'drizzle-orm';
import { response } from '../helpers/response';
import { AppError, DatabaseError, NotFoundError } from '../errors/AppError';
import type { LambdaResponse } from '../types';
import { authenticate } from '../middleware/auth';
import { userRepository } from '../repositories/user.repository';
import { applicationService } from '../services/application.service';
import { parseEvent } from '../helpers/request';

export class PostController {
  // ── GET /posts ───────────────────────────────────────────
  // List all posts

  async list(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    try {
      const { body } = parseEvent(event);
      let applicationId = body?.applicationId as string;
      let allPosts: Array<{ postCode: string; postName: string }> = [];

      // Always authenticate the user via JWT
      const user = await authenticate(event);
      const candidate = await userRepository.findCandidateByUserId(user.userId);
      if (!candidate) throw new NotFoundError('Candidate profile not found');

      // If no applicationId is passed in the request body, fallback to getting it from the draft
      if (!applicationId) {
        const draft = await applicationService.getOrCreateDraft(candidate.id);
        applicationId = draft.applicationId;
      } else {
        // Optional: Ensure the provided applicationId belongs to this candidate
        // (You could fetch the application here and check its candidateId if needed)
      }

      const db = getDb();
      const allStepData = await db
        .select()
        .from(applicationStepData)
        .where(eq(applicationStepData.applicationId, applicationId));

      // Transform array into an object where key is stepNumber and value is the data
      const stepDataObj = allStepData.reduce(
        (acc, step) => {
          acc[step.stepNumber] = typeof step.data === 'string' ? JSON.parse(step.data) : step.data;
          return acc;
        },
        {} as Record<number, any>
      );

      let candidateQualIds: number[] = [];
      const step0Data = stepDataObj[0]; // Personal Info
      const step1Data = stepDataObj[1]; // Reservation Category
      const step2Data = stepDataObj[2]; // Education

      // Calculate Age Logic
      let candidateAge = 0;
      let isEligibleByAge = true;
      if (step0Data?.dateOfBirth) {
        const dobStr = String(step0Data.dateOfBirth);
        // Safely parse date and calculate age using the updated calculateBSSCAge utility
        candidateAge = calculateBSSCAge(dobStr, '2025-08-01');

        const exactAge = calculateExactAge(dobStr, '2025-08-01');
        candidateAge = exactAge.years;

        // Get category value
        let catValue = 'unreserved';
        if (step1Data?.mainCategory) {
          const catRecord = await db
            .select()
            .from(categories)
            .where(eq(categories.catId, step1Data.mainCategory))
            .limit(1);
          if (catRecord.length > 0) {
            catValue = catRecord[0].catValue || 'unreserved';
          }
        }

        const gender = step0Data.gender || 'Male';
        const isPwd = step1Data?.isPwd === true || step1Data?.isPwd === 'true';
        const isExServiceman =
          step1Data?.isExServiceman === true || step1Data?.isExServiceman === 'true';
        const exServicemanYears = Number(step1Data?.exServicemanYears || 0);
        const isGovtServant =
          step1Data?.isGovtServant === true || step1Data?.isGovtServant === 'true';
        const isCommissionedOfficer =
          step1Data?.isCommissionedOfficer === true || step1Data?.isCommissionedOfficer === 'true';

        // Check if candidate qualified on or before 2022-08-01
        let qualifiedPre2022 = false;
        const qualifications = step2Data?.qualifications;
        if (Array.isArray(qualifications)) {
          const grad = qualifications.find((q: any) => q.level === 'graduation');
          if (grad && grad.passingYear) {
            qualifiedPre2022 = Number(grad.passingYear) <= 2022;
          }
        }

        const limits = getBSSCAgeLimits(
          catValue,
          gender,
          isPwd,
          isExServiceman,
          exServicemanYears,
          isGovtServant,
          isCommissionedOfficer
        );

        const isMinAgeEligible = checkBSSCEligibility(dobStr, limits.minAge, 150, '2025-08-01');
        const isMaxAgeEligibleBase = checkBSSCEligibility(dobStr, 0, limits.maxAge, '2025-08-01');
        const isMaxAgeEligibleCarryForward = checkBSSCEligibility(dobStr, 0, limits.maxAge, '2022-08-01') && qualifiedPre2022;

        if (!isMinAgeEligible || (!isMaxAgeEligibleBase && !isMaxAgeEligibleCarryForward)) {
          isEligibleByAge = false;
        }
      }

      console.log(
        'Parsed DOB:',
        step0Data?.dateOfBirth,
        'Candidate Age:',
        candidateAge,
        'Eligible by Age:',
        isEligibleByAge
      );

      let matriculation: any = null;
      let intermediate: any = null;
      let graduation: any = null;
      let post_graduation: any = null;
      const candidatePostIds: string = '';
      const postList: Array<{ postId: string; postName: string }> = [];

      const qualifications = step2Data?.qualifications;

      if (Array.isArray(qualifications)) {
        matriculation = qualifications.find((q: any) => q.level === 'matriculation') || null;
        intermediate = qualifications.find((q: any) => q.level === 'intermediate') || null;
        graduation = qualifications.find((q: any) => q.level === 'graduation') || null;
        post_graduation = qualifications.find((q: any) => q.level === 'post_graduation') || null;
        let candidateDegreeIdsStr = graduation?.degree ? String(graduation.degree) : '';
        console.log(graduation, 'degre');
        console.log(post_graduation, 'post_graduation');

        if (post_graduation?.degree) {
          candidateDegreeIdsStr += candidateDegreeIdsStr
            ? `, ${post_graduation.degree}`
            : String(post_graduation.degree);
        }

        console.log(candidateDegreeIdsStr, 'candidateDegreeIdsStr');

        const degreeIdsArray = candidateDegreeIdsStr
          .split(',')
          .map((id) => Number(id.trim()))
          .filter((id) => !isNaN(id) && id > 0);

        if (degreeIdsArray.length > 0) {
          // 1. Fetch matching mappings using the degree IDs
          const matchingMappings = await db
            .select()
            .from(degreePostMap)
            .where(inArray(degreePostMap.degreeId, degreeIdsArray));
          console.log(matchingMappings, 'matchingMappings');
          // 2. Extract and deduplicate actual post codes from the fetched mappings
          const extractedPostCodes = new Set<string>();
          for (const m of matchingMappings) {
            if (m.postCode) {
              extractedPostCodes.add(m.postCode);
            }
          }
          console.log(extractedPostCodes, 'extractedPostCodes');

          // 3. Query the posts table using the actual post codes
          const finalPostCodes = Array.from(extractedPostCodes);

          // Apply Special Reservation rules: Physical Disability "Other", Ex-Serviceman, and Sports Quota
          const isPwd = step1Data?.isPwd === true || step1Data?.isPwd === 'true';
          const pwdType = step1Data?.pwdType;
          const isExServiceman =
            step1Data?.isExServiceman === true || step1Data?.isExServiceman === 'true';
          const isSportsQuota =
            step1Data?.isSportsQuota === true || step1Data?.isSportsQuota === 'true';

          if (finalPostCodes.length > 0 && isEligibleByAge) {
            allPosts = await db.select().from(posts).where(inArray(posts.postCode, finalPostCodes));
          }
        }

        candidateQualIds = qualifications
          .map((q: any) => q.jobQualificationId)
          .filter((id: any): id is number => typeof id === 'number');
      }

      return response.success(200, {
        message: 'Data fetched successfully',
        data: {
          posts: allPosts,
        },
      });
    } catch (err) {
      console.error('CRITICAL DB ERROR in list posts:', err);
      if (err instanceof AppError) throw err;
      throw new DatabaseError('Failed to fetch posts', err as Error);
    }
  }
}

export const postController = new PostController();
export default postController;
