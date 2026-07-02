import { z } from 'zod';

const candidateStep3Schema = z.object({
  graduation: z.object({
    degreeId: z.union([z.number(), z.string()]).optional().transform(v => (v === '' || v == null) ? undefined : Number(v)),
    university: z.string().optional(),
    percentage: z.string().optional(),
    totalMarks: z.string().optional(),
    marksObtained: z.string().optional(),
    passingCertificateNo: z.string().optional(),
  }).optional().default({}),
});

const payload = {
  "graduation": {
    "degreeId": 62,
    "university": "34567",
    "percentage": "23",
    "totalMarks": ""
  }
};

const input = candidateStep3Schema.parse(payload);
console.log("Parsed input:", JSON.stringify(input, null, 2));

const degree = input.graduation.degreeId ? String(input.graduation.degreeId) : '0';
console.log("Evaluated degree:", degree);
