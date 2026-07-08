import { getDb } from '../drizzle';
import { jobQualifications } from '../schema';
import { eq } from 'drizzle-orm';

const JOB_QUALIFICATIONS = [
  // Post 1: Assistant Entomologist
  {
    slNo: 1,
    qualification: 'Post Graduate in Entomology / Zoology',
    eligiblePostCode: '1',
    mainPosts: 'Assistant Entomologist',
    preferenceApplicable: 'Yes',
  },

  // Post 2 & 3: Assistant VBDCO & Inspector
  {
    slNo: 2,
    qualification: 'Bachelor of Science (B.Sc.) in Zoology',
    eligiblePostCode: '2',
    mainPosts: 'Assistant Vector Borne Disease Control Officer',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 3,
    qualification: 'Bachelor of Science (B.Sc.) in Zoology',
    eligiblePostCode: '3',
    mainPosts: 'Inspector, Vector Borne Disease Control Programme',
    preferenceApplicable: 'Yes',
  },

  {
    slNo: 4,
    qualification: 'Bachelor of Science (B.Sc.) in Botany',
    eligiblePostCode: '2',
    mainPosts: 'Assistant Vector Borne Disease Control Officer',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 5,
    qualification: 'Bachelor of Science (B.Sc.) in Botany',
    eligiblePostCode: '3',
    mainPosts: 'Inspector, Vector Borne Disease Control Programme',
    preferenceApplicable: 'Yes',
  },

  {
    slNo: 6,
    qualification: 'Bachelor of Science (B.Sc.) in Mathematics',
    eligiblePostCode: '2',
    mainPosts: 'Assistant Vector Borne Disease Control Officer',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 7,
    qualification: 'Bachelor of Science (B.Sc.) in Mathematics',
    eligiblePostCode: '3',
    mainPosts: 'Inspector, Vector Borne Disease Control Programme',
    preferenceApplicable: 'Yes',
  },

  {
    slNo: 8,
    qualification: 'Bachelor of Science (B.Sc.) in Physics',
    eligiblePostCode: '2',
    mainPosts: 'Assistant Vector Borne Disease Control Officer',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 9,
    qualification: 'Bachelor of Science (B.Sc.) in Physics',
    eligiblePostCode: '3',
    mainPosts: 'Inspector, Vector Borne Disease Control Programme',
    preferenceApplicable: 'Yes',
  },

  {
    slNo: 10,
    qualification: 'Bachelor of Science (B.Sc.) in Chemistry',
    eligiblePostCode: '2',
    mainPosts: 'Assistant Vector Borne Disease Control Officer',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 11,
    qualification: 'Bachelor of Science (B.Sc.) in Chemistry',
    eligiblePostCode: '3',
    mainPosts: 'Inspector, Vector Borne Disease Control Programme',
    preferenceApplicable: 'Yes',
  },

  {
    slNo: 12,
    qualification: 'Bachelor of Science (B.Sc.) in Statistics',
    eligiblePostCode: '2',
    mainPosts: 'Assistant Vector Borne Disease Control Officer',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 13,
    qualification: 'Bachelor of Science (B.Sc.) in Statistics',
    eligiblePostCode: '3',
    mainPosts: 'Inspector, Vector Borne Disease Control Programme',
    preferenceApplicable: 'Yes',
  },

  {
    slNo: 14,
    qualification: 'Bachelor of Science (B.Sc.) in Geology',
    eligiblePostCode: '2',
    mainPosts: 'Assistant Vector Borne Disease Control Officer',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 15,
    qualification: 'Bachelor of Science (B.Sc.) in Geology',
    eligiblePostCode: '3',
    mainPosts: 'Inspector, Vector Borne Disease Control Programme',
    preferenceApplicable: 'Yes',
  },

  // Post 4: Block Statistical Supervisor / Junior Statistical Assistant / Investigator
  {
    slNo: 16,
    qualification: 'Bachelor of Science (B.Sc.) in Mathematics',
    eligiblePostCode: '4',
    mainPosts: 'Block Statistical Supervisor / Junior Statistical Assistant / Investigator',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 17,
    qualification: 'Bachelor of Science (B.Sc.) in Statistics',
    eligiblePostCode: '4',
    mainPosts: 'Block Statistical Supervisor / Junior Statistical Assistant / Investigator',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 18,
    qualification: 'Bachelor of Science (B.Sc.) in Economics',
    eligiblePostCode: '4',
    mainPosts: 'Block Statistical Supervisor / Junior Statistical Assistant / Investigator',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 19,
    qualification: 'Bachelor of Arts (B.A.) in Mathematics',
    eligiblePostCode: '4',
    mainPosts: 'Block Statistical Supervisor / Junior Statistical Assistant / Investigator',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 20,
    qualification: 'Bachelor of Arts (B.A.) in Statistics',
    eligiblePostCode: '4',
    mainPosts: 'Block Statistical Supervisor / Junior Statistical Assistant / Investigator',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 21,
    qualification: 'Bachelor of Arts (B.A.) in Economics',
    eligiblePostCode: '4',
    mainPosts: 'Block Statistical Supervisor / Junior Statistical Assistant / Investigator',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 22,
    qualification: 'Bachelor of Commerce (B.Com) in Mathematics',
    eligiblePostCode: '4',
    mainPosts: 'Block Statistical Supervisor / Junior Statistical Assistant / Investigator',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 23,
    qualification: 'Bachelor of Commerce (B.Com) in Statistics',
    eligiblePostCode: '4',
    mainPosts: 'Block Statistical Supervisor / Junior Statistical Assistant / Investigator',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 24,
    qualification: 'Bachelor of Commerce (B.Com) in Economics',
    eligiblePostCode: '4',
    mainPosts: 'Block Statistical Supervisor / Junior Statistical Assistant / Investigator',
    preferenceApplicable: 'Yes',
  },

  // Post 5: Dairy Technical Officer
  {
    slNo: 25,
    qualification: 'Bachelor of Dairy Technology / Dairy Science',
    eligiblePostCode: '5',
    mainPosts: 'Dairy Technical Officer',
    preferenceApplicable: 'Yes',
  },

  // Post 6: Fisheries Extension Supervisor
  {
    slNo: 26,
    qualification: 'Bachelor of Fisheries Science',
    eligiblePostCode: '6',
    mainPosts: 'Fisheries Extension Supervisor',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 27,
    qualification: 'Bachelor of Science (B.Sc.) in Zoology',
    eligiblePostCode: '6',
    mainPosts: 'Fisheries Extension Supervisor',
    preferenceApplicable: 'Yes',
  },

  // Post 7: Auditor
  {
    slNo: 28,
    qualification: 'Bachelor of Science (B.Sc.) in Mathematics',
    eligiblePostCode: '7',
    mainPosts: 'Auditor',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 29,
    qualification: 'Bachelor of Science (B.Sc.) in Economics',
    eligiblePostCode: '7',
    mainPosts: 'Auditor',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 30,
    qualification: 'Bachelor of Science (B.Sc.) in Statistics',
    eligiblePostCode: '7',
    mainPosts: 'Auditor',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 31,
    qualification: 'Bachelor of Arts (B.A.) in Mathematics',
    eligiblePostCode: '7',
    mainPosts: 'Auditor',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 32,
    qualification: 'Bachelor of Arts (B.A.) in Economics',
    eligiblePostCode: '7',
    mainPosts: 'Auditor',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 33,
    qualification: 'Bachelor of Arts (B.A.) in Statistics',
    eligiblePostCode: '7',
    mainPosts: 'Auditor',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 34,
    qualification: 'Bachelor of Commerce (B.Com) in Mathematics',
    eligiblePostCode: '7',
    mainPosts: 'Auditor',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 35,
    qualification: 'Bachelor of Commerce (B.Com) in Economics',
    eligiblePostCode: '7',
    mainPosts: 'Auditor',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 36,
    qualification: 'Bachelor of Commerce (B.Com) in Statistics',
    eligiblePostCode: '7',
    mainPosts: 'Auditor',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 37,
    qualification: 'Bachelor of Commerce (B.Com) in Commerce',
    eligiblePostCode: '7',
    mainPosts: 'Auditor',
    preferenceApplicable: 'Yes',
  },

  // Post 8: Junior Scientific Assistant
  {
    slNo: 38,
    qualification: 'Bachelor of Science (B.Sc.) in Zoology',
    eligiblePostCode: '8',
    mainPosts: 'Junior Scientific Assistant',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 39,
    qualification: 'Bachelor of Science (B.Sc.) in Botany',
    eligiblePostCode: '8',
    mainPosts: 'Junior Scientific Assistant',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 40,
    qualification: 'Bachelor of Science (B.Sc.) in Mathematics',
    eligiblePostCode: '8',
    mainPosts: 'Junior Scientific Assistant',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 41,
    qualification: 'Bachelor of Science (B.Sc.) in Physics',
    eligiblePostCode: '8',
    mainPosts: 'Junior Scientific Assistant',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 42,
    qualification: 'Bachelor of Science (B.Sc.) in Chemistry',
    eligiblePostCode: '8',
    mainPosts: 'Junior Scientific Assistant',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 43,
    qualification: 'Bachelor of Science (B.Sc.) in Statistics',
    eligiblePostCode: '8',
    mainPosts: 'Junior Scientific Assistant',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 44,
    qualification: 'Bachelor of Science (B.Sc.) in Geology',
    eligiblePostCode: '8',
    mainPosts: 'Junior Scientific Assistant',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 45,
    qualification:
      'Bachelor of Science (B.Sc.) in Pharmacy / Pharmaceutical Chemistry / Ayurveda / Pharmaceutics / Biotechnology',
    eligiblePostCode: '8',
    mainPosts: 'Junior Scientific Assistant',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 46,
    qualification:
      'Post Graduate in Zoology / Botany / Mathematics / Physics / Chemistry / Statistics / Geology / Pharmacy / Pharmaceutical Chemistry / Ayurveda / Pharmaceutics / Biotechnology',
    eligiblePostCode: '8',
    mainPosts: 'Junior Scientific Assistant',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 47,
    qualification: 'Associateship Diploma (with Chemistry/Pharmaceutics)',
    eligiblePostCode: '8',
    mainPosts: 'Junior Scientific Assistant',
    preferenceApplicable: 'Yes',
  },

  // Post 9: Laboratory Assistant (Physics)
  {
    slNo: 48,
    qualification: 'Bachelor of Science (B.Sc. Hons) in Physics',
    eligiblePostCode: '9',
    mainPosts: 'Laboratory Assistant (Physics)',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 49,
    qualification: 'Bachelor of Science (B.Sc.) in Physics',
    eligiblePostCode: '9',
    mainPosts: 'Laboratory Assistant (Physics)',
    preferenceApplicable: 'Yes',
  },

  // Post 10: Laboratory Assistant (Chemistry)
  {
    slNo: 50,
    qualification: 'Bachelor of Science (B.Sc. Hons) in Chemistry',
    eligiblePostCode: '10',
    mainPosts: 'Laboratory Assistant (Chemistry)',
    preferenceApplicable: 'Yes',
  },
  {
    slNo: 51,
    qualification: 'Bachelor of Science (B.Sc.) in Chemistry',
    eligiblePostCode: '10',
    mainPosts: 'Laboratory Assistant (Chemistry)',
    preferenceApplicable: 'Yes',
  },

  // Post 104: Matric level clerk (Requires only Class X) - from test scenarios
  {
    slNo: 52,
    qualification: 'Matriculation (Class X)',
    eligiblePostCode: '104',
    mainPosts: 'Matric level clerk',
    preferenceApplicable: 'Yes',
  },

  // Post 105: Pharmacist (Requires Diploma in Pharmacy) - from test scenarios
  {
    slNo: 53,
    qualification: 'Diploma in Pharmacy',
    eligiblePostCode: '105',
    mainPosts: 'Pharmacist',
    preferenceApplicable: 'Yes',
  },

  // Post 106: Associateship chemist (Requires Associateship with Chemistry/Pharmaceutics) - from test scenarios
  {
    slNo: 54,
    qualification: 'Associateship Diploma (with Chemistry/Pharmaceutics)',
    eligiblePostCode: '106',
    mainPosts: 'Associateship chemist',
    preferenceApplicable: 'Yes',
  },
];

export const seedJobQualifications = async (): Promise<void> => {
  const db = getDb();
  console.log(' Seeding job qualifications...');
  for (const jq of JOB_QUALIFICATIONS) {
    const existing = await db
      .select()
      .from(jobQualifications)
      .where(eq(jobQualifications.slNo, jq.slNo))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(jobQualifications).values(jq);
      console.log(` Created job qualification: [${jq.slNo}] ${jq.qualification}`);
    } else {
      console.log(`  Job qualification already exists: [${jq.slNo}]`);
    }
  }
  console.log(' Job qualifications seeding complete');
};

export default seedJobQualifications;
