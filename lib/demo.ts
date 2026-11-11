import type { StoredResult } from "./storage";
import type { VisaProfile, RankedPathway } from "./types";

export interface DemoPreset {
  id: string;
  title: string;
  badge: string;
  flag: string;
  description: string;
  profile: VisaProfile;
  result: StoredResult;
}

function createPathway(overrides: Partial<RankedPathway> & Pick<RankedPathway, "name" | "country" | "pathwayId" | "baseScore" | "reason" | "weaknesses" | "documents" | "next_steps" | "citations" | "estimated_timeline" | "top_improvement">): RankedPathway {
  return {
    status: overrides.status ?? "CONDITIONALLY_ELIGIBLE",
    maxScore: overrides.maxScore ?? 100,
    scoreBreakdown: overrides.scoreBreakdown ?? {
      eligibilityFit: overrides.baseScore,
      profileStrength: 85,
      evidenceQuality: 90,
      competitiveness: 80,
    },
    satisfiedRequirements: overrides.satisfiedRequirements ?? [
      {
        id: "req-gen-exp",
        type: "hard",
        description: "Meets skilled work experience requirement.",
        pointsAwarded: 15,
        met: true,
        scoreImpact: 15,
      },
      {
        id: "req-gen-lang",
        type: "points",
        description: "Verified English test score (IELTS / TOEFL).",
        pointsAwarded: 20,
        met: true,
        scoreImpact: 20,
      },
    ],
    missingRequirements: overrides.missingRequirements ?? [],
    blockingRequirements: overrides.blockingRequirements ?? [],
    marginalImprovements: overrides.marginalImprovements ?? [
      {
        actionName: overrides.top_improvement,
        pointImpact: 10,
        metrics: { cost: 2, time: 3, difficulty: 3, certainty: 4 },
        roiScore: 3.5,
        requirementId: "req-opt",
      },
    ],
    source_freshness: "VERIFIED",
    ...overrides,
  };
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "canada-tech-lead",
    title: "Tech Lead to Canada",
    badge: "Permanent Stay & Fast Work Visa",
    flag: "🇨🇦",
    description: "Age 29 • Master's • 6 yrs exp • IELTS 8.0 • $25k USD",
    profile: {
      nationality: "India",
      targetRegion: "canada",
      age: 29,
      education: "master",
      yearsExperience: 6,
      fieldOfWork: "Software & IT",
      englishTest: "ielts",
      testScore: 8.0,
      savingsUsd: 25000,
      goal: "pr",
    },
    result: {
      profileSummary: {
        nationality: "India",
        targetRegion: "canada",
        age: 29,
        education: "master",
        yearsExperience: 6,
        fieldOfWork: "Software & IT",
        englishTest: "ielts",
        testScore: 8.0,
        savingsUsd: 25000,
        goal: "pr",
      },
      overall_score: 88,
      summary: "Very strong match for staying permanently in Canada. Being under 30 with a Master's degree, 6 years of tech work, and an IELTS 8.0 English score puts you near the top of the points system. A provincial tech nomination or approved Canadian job offer would make an invitation very likely.",
      pathways: [
        createPathway({
          name: "Express Entry (Federal Skilled Worker)",
          country: "Canada",
          pathwayId: "can-express-entry",
          status: "CONDITIONALLY_ELIGIBLE",
          baseScore: 84,
          maxScore: 100,
          scoreBreakdown: {
            eligibilityFit: 100,
            profileStrength: 92,
            evidenceQuality: 95,
            competitiveness: 82,
          },
          reason: "Easily passes the basic 67/100 eligibility check. Your estimated ranking score (~478) is strong for Canada's tech and science selection rounds.",
          weaknesses: [
            "You haven't studied or worked inside Canada yet (which adds bonus points).",
            "General invitation rounds sometimes ask for 500+ points, though tech rounds are often lower.",
          ],
          documents: [
            "Official degree check report (from WES or another approved group)",
            "IELTS English test result sheet",
            "Bank statement showing required savings (~$14,690+ CAD)",
            "Job experience letters from past employers (with duties & hours)",
          ],
          next_steps: [
            "Get your Master's degree verified by an approved agency (like WES).",
            "Submit your free online Express Entry profile.",
            "Watch for provincial tech invitations from Ontario and Alberta.",
          ],
          citations: [
            {
              title: "Federal Skilled Worker Program - IRCC Guidelines",
              url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html",
            },
          ],
          estimated_timeline: "6–9 months (after invitation)",
          top_improvement: "Watch for tech-focused Express Entry rounds or apply for a provincial tech nomination",
        }),
        createPathway({
          name: "Global Talent Stream (Fast Work Permit)",
          country: "Canada",
          pathwayId: "can-gts",
          status: "CONDITIONALLY_ELIGIBLE",
          baseScore: 72,
          maxScore: 100,
          scoreBreakdown: {
            eligibilityFit: 100,
            profileStrength: 90,
            evidenceQuality: 90,
            competitiveness: 80,
          },
          reason: "Software and engineering roles qualify for Canada's fast 2-week work permit review once an approved Canadian employer gives you a job offer.",
          weaknesses: [
            "You need a Canadian employer willing to sponsor you and get government hiring approval.",
            "Starts as a temporary work permit, though you can apply to stay permanently after 1 year working in Canada.",
          ],
          documents: [
            "Valid passport copy",
            "Degree transcripts and certificates",
            "Updated resume / CV",
            "Signed Canadian job offer and work contract",
          ],
          next_steps: [
            "Apply to Canadian tech companies approved for fast-track hiring.",
            "Once hired, your employer completes the fast-track work permit approval.",
          ],
          citations: [
            {
              title: "Global Talent Stream Occupations List - ESDC",
              url: "https://www.canada.ca/en/employment-social-development/services/foreign-workers/global-talent/requirements.html",
            },
          ],
          estimated_timeline: "2–4 weeks once a job offer is signed",
          top_improvement: "Get a job offer from an approved Canadian tech employer",
        }),
      ],
    },
  },
  {
    id: "uk-senior-dev",
    title: "Senior Engineer to UK",
    badge: "Work Visa & Talent Route",
    flag: "🇬🇧",
    description: "Age 32 • Bachelor's • 8 yrs exp • IELTS 7.5 • $18k USD",
    profile: {
      nationality: "Nigeria",
      targetRegion: "uk",
      age: 32,
      education: "bachelor",
      yearsExperience: 8,
      fieldOfWork: "Software & IT",
      englishTest: "ielts",
      testScore: 7.5,
      savingsUsd: 18000,
      goal: "work",
    },
    result: {
      profileSummary: {
        nationality: "Nigeria",
        targetRegion: "uk",
        age: 32,
        education: "bachelor",
        yearsExperience: 8,
        fieldOfWork: "Software & IT",
        englishTest: "ielts",
        testScore: 7.5,
        savingsUsd: 18000,
        goal: "work",
      },
      overall_score: 82,
      summary: "Strong match for working in the UK. Your English score (IELTS 7.5) easily meets the rule, and 8 years of software experience helps you qualify for tech jobs paying above the £38,700/year minimum salary.",
      pathways: [
        createPathway({
          name: "UK Skilled Worker Visa",
          country: "United Kingdom",
          pathwayId: "uk-skilled-worker",
          status: "CONDITIONALLY_ELIGIBLE",
          baseScore: 80,
          maxScore: 100,
          scoreBreakdown: {
            eligibilityFit: 100,
            profileStrength: 88,
            evidenceQuality: 92,
            competitiveness: 78,
          },
          reason: "Meets the English rule and savings requirement. Next step is getting a job offer and sponsor code from a licensed UK employer paying at least £38,700/year.",
          weaknesses: [
            "You must earn at least £38,700/year (or your job's set minimum pay) to qualify.",
            "Upfront UK healthcare fee (£1,035 per year of the visa) must be paid when applying.",
          ],
          documents: [
            "Sponsor code (Certificate of Sponsorship) from your UK employer",
            "Approved English test certificate (IELTS for UKVI)",
            "Valid passport with blank pages",
            "Bank statements showing at least £1,270 held for 28 days",
          ],
          next_steps: [
            "Apply to UK companies listed on the official Registered Sponsors list.",
            "Confirm the job salary meets the minimum required pay for your role.",
          ],
          citations: [
            {
              title: "UK Skilled Worker Visa Guidance - GOV.UK",
              url: "https://www.gov.uk/skilled-worker-visa",
            },
          ],
          estimated_timeline: "3–8 weeks",
          top_improvement: "Get a sponsored job offer paying £38,700/year or more",
        }),
        createPathway({
          name: "UK Global Talent Visa (Tech Route)",
          country: "United Kingdom",
          pathwayId: "uk-global-talent",
          status: "CONDITIONALLY_ELIGIBLE",
          baseScore: 68,
          maxScore: 100,
          scoreBreakdown: {
            eligibilityFit: 85,
            profileStrength: 82,
            evidenceQuality: 90,
            competitiveness: 75,
          },
          reason: "With 8 years of senior engineering experience, you may qualify as a tech leader without needing a company to sponsor your visa.",
          weaknesses: [
            "Requires building a strong portfolio of proof (recommendation letters, projects, articles, or awards).",
            "Reviewers follow strict approval standards for tech leadership.",
          ],
          documents: [
            "3 recommendation letters from recognized tech leaders",
            "Up to 10 documents proving major product, code, or business impact",
            "Detailed resume showing your leadership experience",
          ],
          next_steps: [
            "Gather 10 strong examples showing your tech achievements and leadership.",
            "Apply for official tech leader approval before submitting your visa.",
          ],
          citations: [
            {
              title: "Global Talent Visa: Digital Technology - GOV.UK",
              url: "https://www.gov.uk/global-talent-digital-technology",
            },
          ],
          estimated_timeline: "4–8 weeks for approval + 3 weeks visa",
          top_improvement: "Document measurable product impact, leadership, or open-source work",
        }),
      ],
    },
  },
  {
    id: "germany-specialist",
    title: "Specialist to Germany",
    badge: "1-Year Job Search Visa & Blue Card",
    flag: "🇩🇪",
    description: "Age 27 • Bachelor's • 4 yrs exp • IELTS 7.0 • $15k USD",
    profile: {
      nationality: "Pakistan",
      targetRegion: "germany-nordics",
      age: 27,
      education: "bachelor",
      yearsExperience: 4,
      fieldOfWork: "Software & IT",
      englishTest: "ielts",
      testScore: 7.0,
      savingsUsd: 15000,
      goal: "work",
    },
    result: {
      profileSummary: {
        nationality: "Pakistan",
        targetRegion: "germany-nordics",
        age: 27,
        education: "bachelor",
        yearsExperience: 4,
        fieldOfWork: "Software & IT",
        englishTest: "ielts",
        testScore: 7.0,
        savingsUsd: 15000,
        goal: "work",
      },
      overall_score: 86,
      summary: "Strong match for Germany's Opportunity Card (a 1-year visa to look for work in Germany). You score 8 out of 6 needed points based on your recognized degree, age under 35, IT experience, and strong English.",
      pathways: [
        createPathway({
          name: "Opportunity Card (1-Year Job Search Visa)",
          country: "Germany",
          pathwayId: "de-opportunity-card",
          status: "ELIGIBLE",
          baseScore: 88,
          maxScore: 100,
          scoreBreakdown: {
            eligibilityFit: 100,
            profileStrength: 90,
            evidenceQuality: 92,
            competitiveness: 85,
          },
          reason: "Easily passes the 6-point rule with 8 points: recognized university degree (4 pts), age under 35 (2 pts), 2+ years experience (2 pts), and strong English (1 pt).",
          weaknesses: [
            "You must set aside ~€12,324 in a German blocked bank account to prove you can pay living costs.",
            "Valid for 1 year while you search for a skilled job in Germany.",
          ],
          documents: [
            "Proof your university degree is recognized in Germany (Anabin or ZAB check)",
            "IELTS English test certificate",
            "Blocked bank account proof showing enough living funds",
            "Clear resume (CV) showing your work history",
          ],
          next_steps: [
            "Check if your university and degree are listed on Germany's Anabin website.",
            "Open a German blocked bank account for your living funds.",
            "Book a visa appointment at your local German embassy or visa center.",
          ],
          citations: [
            {
              title: "Make it in Germany - Opportunity Card Official Portal",
              url: "https://www.make-it-in-germany.com/en/visa-residence/types/opportunity-card",
            },
          ],
          estimated_timeline: "4–8 weeks",
          top_improvement: "Learn basic German (A1/A2) to earn an extra point and find jobs faster",
        }),
        createPathway({
          name: "EU Blue Card (Germany)",
          country: "Germany",
          pathwayId: "de-eu-blue-card",
          status: "CONDITIONALLY_ELIGIBLE",
          baseScore: 75,
          maxScore: 100,
          scoreBreakdown: {
            eligibilityFit: 100,
            profileStrength: 88,
            evidenceQuality: 94,
            competitiveness: 82,
          },
          reason: "IT workers qualify at a lower salary threshold than most jobs. Once you sign a German job contract, this visa lets you apply to stay permanently in 21–27 months.",
          weaknesses: [
            "Requires a signed German job offer matching your degree or IT experience.",
            "Your degree must be recognized as matching a German university degree.",
          ],
          documents: [
            "Signed German job contract or formal job offer",
            "Employer work details form signed by the German company",
            "Proof your university degree is recognized in Germany",
          ],
          next_steps: [
            "Apply for roles at German tech companies that hire international workers.",
            "Check that the offered salary meets Germany's Blue Card minimum.",
          ],
          citations: [
            {
              title: "BAMF - EU Blue Card Requirements",
              url: "https://www.bamf.de/EN/Themen/MigrationAufenthalt/ZuwandererDrittstaaten/Migrathek/BlaueKarteEU/blauekarteeu-node.html",
            },
          ],
          estimated_timeline: "4–6 weeks (after contract)",
          top_improvement: "Apply to German companies open to English-speaking tech hires",
        }),
      ],
    },
  },
];

export const DEMO_RESULT: StoredResult = DEMO_PRESETS[0].result;
