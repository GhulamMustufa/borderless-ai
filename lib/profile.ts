import type { VisaProfile, NormalizedProfile, CEFRLevel, EnglishTest } from "./types";

function normalizeOccupation(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (/\b(backend|frontend|full.?stack|software|web\s*dev|developer|programmer|coder)\b/.test(s)) return "Software Engineer";
  if (/\b(data\s*sci|ml|machine\s*learn|ai\b|deep\s*learn)\b/.test(s)) return "Data Scientist / ML Engineer";
  if (/\b(nurs|rn\b|registered\s*nurse)\b/.test(s)) return "Registered Nurse";
  if (/\b(doctor|physician|mbbs|md\b|gp\b|surgeon)\b/.test(s)) return "Medical Doctor";
  if (/\b(account|cpa\b|chartered\s*acc)\b/.test(s)) return "Accountant / CPA";
  if (/\b(teacher|tutor|educator|lecturer)\b/.test(s)) return "Teacher / Educator";
  if (/\b(cyber|infosec|security\s*eng)\b/.test(s)) return "Cybersecurity Engineer";
  if (/\b(civil|structural|mechanical|electrical\s*eng)\b/.test(s)) return "Engineer";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function normalizeLanguageScore(test: EnglishTest, score: number | null): CEFRLevel {
  if (test === "none" || score === null) return "none";
  
  if (test === "ielts") {
    if (score >= 8.0) return "C2";
    if (score >= 7.0) return "C1";
    if (score >= 5.5) return "B2";
    if (score >= 4.0) return "B1";
    if (score >= 3.0) return "A2";
    return "A1";
  }

  if (test === "toefl") {
    if (score >= 114) return "C2";
    if (score >= 95) return "C1";
    if (score >= 72) return "B2";
    if (score >= 42) return "B1";
    return "A2";
  }

  return "none";
}

function checkSTEM(occupation: string): boolean {
  return /(engineer|developer|software|data|cyber|ai|ml|architect|technician)/i.test(occupation);
}

function checkHealthcare(occupation: string): boolean {
  return /(nurse|doctor|physician|surgeon|pharmac|medical)/i.test(occupation);
}

export function normalizeProfile(profile: VisaProfile): NormalizedProfile {
  const canonicalOccupation = normalizeOccupation(profile.fieldOfWork);
  
  return {
    original: profile,
    canonicalOccupation,
    languageLevelCEFR: normalizeLanguageScore(profile.englishTest, profile.testScore),
    isSTEM: checkSTEM(canonicalOccupation),
    isHealthcare: checkHealthcare(canonicalOccupation),
    hasJobOffer: Boolean(profile.hasJobOffer),
  };
}
