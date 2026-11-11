export type Education = "high_school" | "bachelor" | "master" | "phd";

export type TargetRegion =
  | "canada"
  | "uk"
  | "australia-new-zealand"
  | "germany-nordics"
  | "southern-europe"
  | "middle-east"
  | "usa"
  | "sg-my"
  | "jp-kr"
  | "easy-entry"
  | "latam"
  | "eastern-europe"
  | "greater-china"
  | "africa";

export type EnglishTest = "none" | "ielts" | "toefl";
export type Goal = "work" | "study" | "pr";

export type VisaProfile = {
  nationality: string;
  targetRegion: TargetRegion;
  age: number;
  education: Education;
  yearsExperience: number;
  fieldOfWork: string;
  englishTest: EnglishTest;
  testScore: number | null;
  savingsUsd: number;
  goal: Goal;
  hasJobOffer?: boolean;
};

export type CEFRLevel = "none" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type NormalizedProfile = {
  original: VisaProfile;
  canonicalOccupation: string;
  languageLevelCEFR: CEFRLevel;
  isSTEM: boolean;
  isHealthcare: boolean;
  hasJobOffer?: boolean;
};

export type VisaOption = {
  id: string;
  name: string;
  shortDescription: string;
  highlights: string[];
  eligibilityScore?: number;
};

// --- Phase 3: Explainable Scoring & Marginal Improvement Models ---

export type EligibilityStatus = 
  | "ELIGIBLE"
  | "LIKELY_ELIGIBLE"
  | "CONDITIONALLY_ELIGIBLE"
  | "BLOCKED" // Replaces NOT_ELIGIBLE for hard failures
  | "INSUFFICIENT_EVIDENCE";

export type EligibilityConfidence = "HIGH" | "MEDIUM" | "LOW";
export type RequirementType = "hard" | "conditional" | "points";

// Quantifies the heuristic effort to resolve a missing requirement
export type ActionMetrics = {
  cost: number;       // 1 (Low) to 5 (High)
  time: number;       // 1 (Fast) to 5 (Slow)
  difficulty: number; // 1 (Easy) to 5 (Hard)
  certainty: number;  // 1 (Uncertain) to 5 (Guaranteed if done)
};

export type Condition = 
  | { operator: ">=" | "<=" | "===" | "<" | ">"; field: string; value: any }
  | { operator: "in"; field: string; value: any[] }
  | { operator: "and" | "or"; conditions: Condition[] };

export type Requirement = {
  id: string;
  type: RequirementType;
  description: string;
  // Deterministic points awarded if met
  pointsAwarded: number; 
  // What action the user must take if this requirement is missing
  resolutionActionName?: string;
  // Effort required to meet this missing requirement
  actionMetrics?: ActionMetrics;
  // Dynamic AST condition evaluated by the Math Engine
  condition?: Condition;
};

export type EvaluatedRequirement = Requirement & {
  met: boolean;
  notes?: string;
  scoreImpact: number; // The actual points awarded (or 0)
};

export type ScoreBreakdown = {
  eligibilityFit: number;
  profileStrength: number;
  evidenceQuality: number; // Based on authority tier of matched evidence
  competitiveness: number; // Subjective or calculated against threshold
};

export type MarginalAction = {
  actionName: string;
  pointImpact: number;
  metrics: ActionMetrics;
  roiScore: number; // Return on Investment score for ranking
  requirementId: string;
};

export type WhatIfScenario = {
  targetAction: MarginalAction;
  newEligibilityStatus: EligibilityStatus;
  newBaseScore: number;
};

export type DeterministicEvaluation = {
  pathwayId: string;
  status: EligibilityStatus;
  baseScore: number;
  maxScore: number;
  scoreBreakdown: ScoreBreakdown;
  satisfiedRequirements: EvaluatedRequirement[];
  missingRequirements: EvaluatedRequirement[];
  blockingRequirements: EvaluatedRequirement[];
  marginalImprovements: MarginalAction[];
  topWhatIfScenario?: WhatIfScenario;
};

export type RecommendationConfidence = "HIGH" | "MEDIUM" | "LOW";

export type Citation = {
  title: string;
  url: string;
};

export type RankedPathway = DeterministicEvaluation & {
  name: string;
  country: string;
  reason: string;
  weaknesses: string[];
  documents: string[];
  next_steps: string[];
  citations: Citation[];
  estimated_timeline: string;
  top_improvement: string;
  eligibilityStatus?: string;
  source_freshness?: "VERIFIED" | "STALE" | "UNKNOWN";
};

export type ScoreResponse = {
  overall_score: number;
  summary: string;
  pathways: RankedPathway[];
};

// --- Phase 2: Evidence Grounding Models ---

export type AuthorityTier = 1 | 2 | 3 | 4 | 5;
export type DataFreshness = "VERIFIED" | "STALE" | "EXPIRED" | "UNKNOWN";

export type Evidence = {
  id: string;
  source_id: string;
  authority_tier: AuthorityTier;
  country: string;
  jurisdiction?: string;
  pathway?: string;
  claim_type: string;
  effective_from?: string;
  effective_until?: string;
  retrieved_at: string;
  source_url: string;
  source_title: string;
  verification_status: string;
  human_reviewed_at?: string | Date | null;
  human_reviewed_by?: string | null;
  content_hash: string;
  content: string;
};

export type CitationValidationResult = {
  valid: boolean;
  errors: string[];
};

export type ConflictDetectionResult = {
  hasConflict: boolean;
  conflictingClaims: Evidence[];
  resolvedEvidence: Evidence | null;
  message?: string;
};

// --- Phase 4: Agentic Workflow Models ---

export type CriticResult = {
  approved: boolean;
  feedback: string[];
  hallucinated_claims: string[];
};
