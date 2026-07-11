/**
 * Safely parses a date string (e.g., DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY) into a Date object.
 */
export function parseBSSCDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  let dStr = String(dateStr).trim();
  if (!dStr) return new Date(NaN);

  if (dStr.includes('-') && dStr.split('-')[0].length <= 2) {
    const parts = dStr.split('-');
    dStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
  } else if (dStr.includes('/') && dStr.split('/')[0].length <= 2) {
    const parts = dStr.split('/');
    dStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
  } else if (dStr.includes('/')) {
    dStr = dStr.replace(/\//g, '-');
  }

  return new Date(dStr);
}

/**
 * Calculates a candidate's age as of the BSSC reference date (August 1, 2025) or a provided reference date.
 * Calculates a candidate's age exactly as of the BSSC reference date (August 1, 2025).
 *
 * @param dobInput Date of birth (string or Date)
 * @returns Object containing years, months, and days
 */
export function calculateExactAge(
  dobInput: string | Date,
  referenceDate?: string | Date
): { years: number; months: number; days: number } {
  const dob = parseBSSCDate(dobInput);
  if (isNaN(dob.getTime())) return { years: 0, months: 0, days: 0 };
  const refDate = referenceDate ? new Date(referenceDate) : new Date('2025-08-01');

  let years = refDate.getFullYear() - dob.getFullYear();
  let months = refDate.getMonth() - dob.getMonth();
  let days = refDate.getDate() - dob.getDate();

  if (days < 0) {
    months--;
    // Get the last day of the previous month relative to refDate
    const lastDayOfPrevMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 0).getDate();
    days += lastDayOfPrevMonth;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

/**
 * Legacy: Calculates a candidate's age as of the BSSC reference date (August 1, 2025).
 *
 * @param dobInput Date of birth (string or Date)
 * @param referenceDate Optional reference date to calculate age against
 * @returns Age in years
 */
export function calculateBSSCAge(dobInput: string | Date, referenceDate?: string | Date): number {
  const dob = parseBSSCDate(dobInput);
  if (isNaN(dob.getTime())) return 0;

  const refDate = referenceDate ? new Date(referenceDate) : new Date('2025-08-01');

  let age = refDate.getFullYear() - dob.getFullYear();
  const m = refDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

interface AgeLimits {
  minAge: number;
  maxAge: number;
}

/**
 * Gets the valid age limits for a candidate based on their category, gender, and relaxations.
 *
 * Rules:
 * - Minimum Age: 21 years (as of 01-08-2025)
 * - Maximum Age:
 *   - Unreserved (UR) & EWS: 35 years
 *   - BC-I & BC-II (Male): 37 years
 *   - Female (UR/EWS/BC-I/BC-II): 38 years
 *   - Scheduled Caste (SC) & Scheduled Tribe (ST) (Male & Female): 40 years
 * - Relaxations:
 *   - PwD candidates get a relaxation of 10 years in the maximum age limit.
 *   - Ex-servicemen get a relaxation of 5 years in the maximum age limit.
 */
export function getBSSCAgeLimits(
  categoryValue: string,
  gender: string,
  isPwd: boolean,
  isExServiceman: boolean,
  exServicemanYears: number = 0,
  isGovtServant: boolean = false,
  isCommissionedOfficer: boolean = false
): AgeLimits {
  const minAge = 21;

  const catVal = (categoryValue || '').toLowerCase();
  const genderLower = (gender || '').toLowerCase();

  const isScSt = [
    'sc',
    'st',
    'primitive',
    'asur',
    'birhor',
    'birjia',
    'korwa',
    'mal_pahariya',
    'pahariya',
    'sauria_pahariya',
    'savar',
    'other',
  ].includes(catVal);
  const isBc = ['bc1', 'bc2'].includes(catVal);

  let baseMax = 37; // Default for UR/EWS
  if (isScSt) {
    baseMax = 42;
  } else if (isBc) {
    baseMax = 40;
  } else if (genderLower === 'female' || genderLower === 'transgender') {
    baseMax = 40;
  } else {
    baseMax = 37;
  }

  let maxAge = baseMax;

  // Apply relaxations (PwD relaxation takes precedence if both, or PwD is 10, Ex-Serviceman is 5)
  if (isPwd) {
    maxAge = baseMax + 10;
  } else if (isExServiceman) {
    const extraForScSt = isScSt ? 5 : 0;
    maxAge = Math.min(baseMax + 3 + exServicemanYears + extraForScSt, 53);
  } else if (isGovtServant) {
    maxAge = baseMax + 5;
  } else if (isCommissionedOfficer) {
    maxAge = baseMax + 5;
  }

  return { minAge, maxAge };
}

/**
 * Checks if a candidate is strictly within the age limits on the reference date.
 * If overage by even 1 day, returns false.
 */
export function checkBSSCEligibility(
  dobInput: string | Date,
  minAge: number,
  maxAge: number,
  referenceDate?: string | Date
): boolean {
  const dob = parseBSSCDate(dobInput);
  if (isNaN(dob.getTime())) return false;

  const refDate = referenceDate ? new Date(referenceDate) : new Date('2025-08-01');

  // Earliest DOB allowed (for maxAge)
  const earliestDob = new Date(refDate);
  earliestDob.setFullYear(refDate.getFullYear() - maxAge);

  // Latest DOB allowed (for minAge)
  const latestDob = new Date(refDate);
  latestDob.setFullYear(refDate.getFullYear() - minAge);

  const dobTime = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate()).getTime();
  const earliestTime = new Date(earliestDob.getFullYear(), earliestDob.getMonth(), earliestDob.getDate()).getTime();
  const latestTime = new Date(latestDob.getFullYear(), latestDob.getMonth(), latestDob.getDate()).getTime();

  return dobTime >= earliestTime && dobTime <= latestTime;
}
