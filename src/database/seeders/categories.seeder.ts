import { getDb } from '../drizzle';
import { categories } from '../schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Category & Sub-Category definitions for BSSC.
 * Sub-categories use catParentId to reference the parent row.
 */

const EBC_BC_SUBCATEGORIES = [
  { value: "kagji", label: "Kagji / कागजी" },
  { value: "kushwaha", label: "Kushwaha (Koiri) / कुशवाहा (कोईरी)" },
  { value: "kosta", label: "Kosta / कोस्ता" },
  { value: "gaddi", label: "Gaddi / गद्दी" },
  { value: "ghatwar", label: "Ghatwar / घटवार" },
  { value: "chanau", label: "Chanau / चनउ" },
  { value: "jadupatia", label: "Jadupatia / जदुपतिया" },
  { value: "jogi", label: "Jogi (Jugi) / जोगी (जुगी)" },
  { value: "nalband", label: "Nalband (Muslim) / नालबंद (मुस्लिम)" },
  { value: "partha", label: "Partha / परथा" },
  { value: "bania", label: "Bania / बनिया" },
  { value: "yadav", label: "Yadav / यादव" },
  { value: "rautia", label: "Rautia / रौतिया" },
  { value: "shivhari", label: "Shivhari / शिवहरी" },
  { value: "sonar", label: "Sonar / सोनार" },
  { value: "sutradhar", label: "Sutradhar / सूत्रधार" },
  { value: "sukiar", label: "Sukiar / सुकियार" },
  { value: "isai_harijan", label: "Isai Dharmawalambi (Harijan) / ईसाई धर्मावलंबी (हरिजन)" },
  { value: "isai_pichari", label: "Ishai Dharmawalambi (Anya Pichari Jati) / ईसाई धर्मावलंबी (अन्य पिछड़ी जाति)" },
  { value: "kurmi", label: "Kurmi / कुर्मी" },
  { value: "bhaat", label: "Bhaat, Bhat, Brahmbhat, Rajbhat (Hindu) / भाट, भट, ब्रह्मभट, राजभट (हिन्दू)" },
  { value: "jat_hindu", label: "Jat (Hindu) / जट (हिन्दू) (सहरसा, सुपौल, मधेपुरा और अररिया जिलों के लिए)" },
  { value: "jat_muslim", label: "Jat (Muslim) / जट (मुस्लिम) (मधुबनी, दरभंगा, सीतामढ़ी, खगड़िया एवं अररिया जिलों के लिए)" },
  { value: "madaria_muslim", label: "Madaria (Muslim) / मडरिया (मुस्लिम) (मात्र भागलपुर जिला के सन्हौला प्रखंड एवं बांका जिला के धोरैया प्रखण्ड के लिए)" },
  { value: "donwar", label: "Donwar / दोनवार (केवल मधुबनी और सुपौल जिलों के लिए)" },
  { value: "surjapuri_muslim", label: "Surjapuri Muslim / सुरजापुरी मुस्लिम (शेख, सैयद, मलिक, मोगल, पठान को छोड़कर) (केवल पूर्णियां, कटिहार, किशनगंज एवं अररिया जिलों के लिए)" },
  { value: "mallik_muslim", label: "Mallik (Muslim) / मलिक (मुस्लिम)" },
  { value: "sainthwar", label: "Sainthwar / सैंथवार" },
  { value: "goswami", label: "Goswami, Sanyasi, Atith, Athit, Gosai, Jati, Yati / गोस्वामी, सन्यासी, अतिथ, अथीत, गोसाई, जति, यति" },
  { value: "transgender", label: "Kinnar, Kothi, Hijra, Transgender, Third Gender / किन्नर, कोठी, हिजड़ा, ट्रांसजेंडर (थर्ड जेंडर)" }
];

const SC_SUBCATEGORIES = [
  { value: "bantar", label: "Bantar / बंतार" },
  { value: "bauri", label: "Bauri / बौरी" },
  { value: "bhogta", label: "Bhogta / भोगता" },
  { value: "bhuiya", label: "Bhuiya / भुईया" },
  { value: "chamar", label: "Chamar, Mochi, Chamar-Rabidas, Chamar-Ravidas, Chamar-Rohidas, Charmarkar / चमार, मोची, चमार-रबिदास, चमार-रविदास, चमार-रोहिदास, चर्मरकार" },
  { value: "chaupal", label: "Chaupal / चौपाल" },
  { value: "dabgar", label: "Dabgar / दबगर" },
  { value: "dhobi", label: "Dhobi, Rajak / धोबी, रजक" },
  { value: "dom", label: "Dom, Dhangad, Bansphor, Dharikar, Dharkar, Domra / डोम, धनगड़, बांसफोड़, धारीकर, धरकर, डोमरा" },
  { value: "dusadh", label: "Dusadh, Dhari, Dharhi / दुसाध, धारी, धारही" },
  { value: "ghasi", label: "Ghasi / घासी" },
  { value: "halalkhor", label: "Halalkhor / हलालखोर" },
  { value: "hari", label: "Hari, Mehtar, Bhangi / हरि, मेहतर, भंगी" },
  { value: "kanjar", label: "Kanjar / कंजर" },
  { value: "kurariar", label: "Kurariar / कुररियार" },
  { value: "lalbegi", label: "Lalbegi / लालबेगी" },
  { value: "musahar", label: "Musahar / मुसहर" },
  { value: "nat", label: "Nat / नट" },
  { value: "pan", label: "Pan, Sawasi, Panr / पान, सवासी, पानर" },
  { value: "pasi", label: "Pasi / पासी" },
  { value: "rajwar", label: "Rajwar / रजवार" },
  { value: "turi", label: "Turi / तुरी" }
];

const ST_SUBCATEGORIES = [
  { value: "asur", label: "Asur, Agaria / असुर, अगरिया" },
  { value: "baiga", label: "Baiga / बेगा" },
  { value: "bedia", label: "Bedia / बेदिया" },
  { value: "binjhia", label: "Binjhia / बिंझिया" },
  { value: "birhor", label: "Birhor / बिरहोर" },
  { value: "birjia", label: "Birjia / बिरजिया" },
  { value: "chero", label: "Chero / चेरो" },
  { value: "chik_baraik", label: "Chik Baraik / चिक बराइक" },
  { value: "gond", label: "Gond / गोंड" },
  { value: "gorait", label: "Gorait / गोराइत" },
  { value: "ho", label: "Ho / हो" },
  { value: "karmali", label: "Karmali / करमाली" },
  { value: "kharia", label: "Kharia, Dhelki Kharia, Dudh Kharia, Hill Kharia / खरिया, ढेलकी खड़िया, दूध खड़िया, हिल खड़िया" },
  { value: "kharwar", label: "Kharwar / खरवार" },
  { value: "khond", label: "Khond / खोंड" },
  { value: "kisan", label: "Kisan, Nagesia / किसान, नागेसिया" },
  { value: "kora", label: "Kora, Mudi-Kora / कोरा, मुड़ी-कोरा" },
  { value: "korwa", label: "Korwa / कोरवा" },
  { value: "lohara", label: "Lohara, Lohra / लोहारा, लोहरा" },
  { value: "mahli", label: "Mahli / माहली" },
  { value: "mal_paharia", label: "Mal Paharia, Kumarbhag Paharia / माल पहरिया, कुमारभाग पहारिया" },
  { value: "munda", label: "Munda, Patar / मुण्डा, पातार" },
  { value: "dhangar", label: "Dhangar (Oraon) / धांगड़ (उरांव)" },
  { value: "parhaiya", label: "Parhaiya / परहया" },
  { value: "santal", label: "Santal / संथाल" },
  { value: "sauria_paharia", label: "Sauria Paharia / सोरिया पहाड़िया" },
  { value: "savar", label: "Savar / सावर" },
  { value: "kawar", label: "Kawar / कवार" },
  { value: "kol", label: "Kol / कोल" },
  { value: "tharu", label: "Tharu / थारू" },
  { value: "banjara", label: "Banjara / बनजारा" },
  { value: "bathudi", label: "Bathudi / बठुडी" }
];

const CATEGORY_DATA = [
  {
    value: 'ebc1',
    label: 'Extremely Backward Class (Annexure-1) / अत्यंत पिछड़ा वर्ग (अनुसूची-1)',
    subCategories: EBC_BC_SUBCATEGORIES,
  },
  {
    value: 'bc2',
    label: 'Backward Class (Annexure-2) / पिछड़ा वर्ग (अनुसूची-2)',
    subCategories: EBC_BC_SUBCATEGORIES,
  },
  {
    value: 'sc',
    label: 'Scheduled Caste (SC) / अनुसूचित जाति',
    subCategories: SC_SUBCATEGORIES,
  },
  {
    value: 'st',
    label: 'Scheduled Tribe (ST) / अनुसूचित जनजाति',
    subCategories: ST_SUBCATEGORIES,
  },
  {
    value: 'unreserved',
    label: 'Unreserved (General) / गैर आरक्षित',
    subCategories: [],
  },
];

export const seedCategories = async (
  userId: number = 1
): Promise<{ inserted: string[]; skipped: string[] }> => {
  const db = getDb();
  console.log(' Seeding categories & sub-categories...');

  // Truncate existing categories and restart primary key sequence from 1
  await db.execute(sql`TRUNCATE TABLE categories RESTART IDENTITY CASCADE;`);

  const inserted: string[] = [];
  const skipped: string[] = [];

  const seedRecursive = async (categoriesData: any[], parentId: number | null, level: number) => {
    for (const cat of categoriesData) {
      const existing = await db
        .select()
        .from(categories)
        .where(eq(categories.catName, cat.label))
        .limit(1);

      let currentId: number;
      const indent = '  '.repeat(level + 1);

      if (existing.length === 0) {
        const result = await db
          .insert(categories)
          .values({
            catUserId: userId,
            catName: cat.label,
            catValue: cat.value,
            catParentId: parentId,
            catPublish: 1,
          })
          .returning();
        currentId = result[0].catId;
        inserted.push(cat.label);
        console.log(`${indent}Created category: ${cat.label}`);
      } else {
        currentId = existing[0].catId;
        skipped.push(cat.label);

        const needsUpdate =
          existing[0].catValue !== cat.value ||
          existing[0].catParentId !== parentId ||
          existing[0].catPublish !== 1;

        if (needsUpdate) {
          await db
            .update(categories)
            .set({
              catValue: cat.value,
              catParentId: parentId,
              catPublish: 1,
            })
            .where(eq(categories.catId, currentId));
          console.log(`${indent}Updated category: ${cat.label}`);
        } else {
          console.log(`${indent}Category already exists: ${cat.label}`);
        }
      }

      if (cat.subCategories && cat.subCategories.length > 0) {
        await seedRecursive(cat.subCategories, currentId, level + 1);
      }
    }
  };

  await seedRecursive(CATEGORY_DATA, null, 0);

  console.log(
    ` Categories seeding complete (inserted: ${inserted.length}, skipped: ${skipped.length})`
  );
  return { inserted, skipped };
};

export default seedCategories;
