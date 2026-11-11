/**
 * Centralized Country Normalization Module
 * 
 * Maps user inputs, regional slugs, and country aliases to canonical database country names.
 * Ensures single-country identifiers resolve to exactly one country and multi-country
 * regions explicitly expand to discrete canonical countries without silent omission.
 */

export const CANONICAL_COUNTRIES = {
  UNITED_STATES: "United States",
  UNITED_KINGDOM: "United Kingdom",
  CANADA: "Canada",
  AUSTRALIA: "Australia",
  GERMANY: "Germany",
  NEW_ZEALAND: "New Zealand",
  SWEDEN: "Sweden",
  DENMARK: "Denmark",
  NORWAY: "Norway",
  FINLAND: "Finland",
} as const;

export type CanonicalCountry = typeof CANONICAL_COUNTRIES[keyof typeof CANONICAL_COUNTRIES];

export class UnsupportedCountryError extends Error {
  public readonly code = "UNSUPPORTED_COUNTRY" as const;
  constructor(public readonly input: string) {
    super(`Unsupported country or region: "${input}". Automated scoring requires certified official government rules.`);
    this.name = "UnsupportedCountryError";
  }
}

export class AmbiguousRegionError extends Error {
  public readonly code = "AMBIGUOUS_REGION" as const;
  constructor(public readonly input: string, public readonly countries: CanonicalCountry[]) {
    super(`Regional identifier "${input}" contains multiple discrete countries: [${countries.join(", ")}]. Use resolveRegionCountries() instead of single-country resolution.`);
    this.name = "AmbiguousRegionError";
  }
}

// Single-country alias dictionary (must map to exactly ONE canonical country)
const SINGLE_COUNTRY_MAP: Record<string, CanonicalCountry> = {
  // United States
  "usa": "United States",
  "us": "United States",
  "u s a": "United States",
  "u s": "United States",
  "united states": "United States",
  "united states of america": "United States",
  "america": "United States",

  // United Kingdom
  "uk": "United Kingdom",
  "u k": "United Kingdom",
  "united kingdom": "United Kingdom",
  "great britain": "United Kingdom",
  "britain": "United Kingdom",
  "england": "United Kingdom",
  "scotland": "United Kingdom",
  "wales": "United Kingdom",
  "northern ireland": "United Kingdom",

  // Canada
  "canada": "Canada",
  "ca": "Canada",

  // Australia
  "australia": "Australia",
  "aus": "Australia",
  "au": "Australia",

  // New Zealand
  "new zealand": "New Zealand",
  "nz": "New Zealand",

  // Germany
  "germany": "Germany",
  "de": "Germany",
  "deutschland": "Germany",

  // Nordic countries
  "sweden": "Sweden",
  "se": "Sweden",
  "denmark": "Denmark",
  "dk": "Denmark",
  "norway": "Norway",
  "no": "Norway",
  "finland": "Finland",
  "fi": "Finland",
};

// Multi-country regional groupings (explicitly maps regional slugs to discrete countries)
const MULTI_COUNTRY_REGIONS: Record<string, CanonicalCountry[]> = {
  "australia new zealand": ["Australia", "New Zealand"],
  "australia and new zealand": ["Australia", "New Zealand"],
  "germany nordics": ["Germany", "Denmark", "Sweden", "Norway", "Finland"],
  "germany and nordics": ["Germany", "Denmark", "Sweden", "Norway", "Finland"],
  "nordics": ["Denmark", "Sweden", "Norway", "Finland"],
};

function cleanInput(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

/**
 * Normalizes an input string to an exact single database country name.
 * Returns null if the input is empty, unsupported, or is a multi-country region.
 * A single-country identifier must resolve to exactly one country.
 */
export function normalizeCountry(input: string | null | undefined): CanonicalCountry | null {
  const cleaned = cleanInput(input);
  if (!cleaned) return null;

  // Multi-country regions MUST NOT resolve to a single country
  if (MULTI_COUNTRY_REGIONS[cleaned]) {
    return null;
  }

  return SINGLE_COUNTRY_MAP[cleaned] || null;
}

/**
 * Resolves an input string to exactly one canonical country.
 * Throws AmbiguousRegionError if input represents a multi-country region.
 * Throws UnsupportedCountryError if input cannot be resolved.
 */
export function resolveCanonicalCountry(input: string | null | undefined): CanonicalCountry {
  const cleaned = cleanInput(input);
  if (!cleaned) {
    throw new UnsupportedCountryError(input || "unknown");
  }

  // Prevent silent collapsing of multi-country regions
  if (MULTI_COUNTRY_REGIONS[cleaned]) {
    throw new AmbiguousRegionError(input!, MULTI_COUNTRY_REGIONS[cleaned]);
  }

  const country = SINGLE_COUNTRY_MAP[cleaned];
  if (!country) {
    throw new UnsupportedCountryError(input || "unknown");
  }
  return country;
}

/**
 * Resolves single countries or multi-country regional slugs into an explicit list of canonical countries.
 * Guarantees that neither New Zealand nor Nordic countries are silently dropped.
 * Throws UnsupportedCountryError for unsupported or unmapped regions.
 */
export function resolveRegionCountries(input: string | null | undefined): CanonicalCountry[] {
  const cleaned = cleanInput(input);
  if (!cleaned) {
    throw new UnsupportedCountryError(input || "unknown");
  }

  // 1. Check multi-country regions
  if (MULTI_COUNTRY_REGIONS[cleaned]) {
    return [...MULTI_COUNTRY_REGIONS[cleaned]];
  }

  // 2. Check single country
  if (SINGLE_COUNTRY_MAP[cleaned]) {
    return [SINGLE_COUNTRY_MAP[cleaned]];
  }

  throw new UnsupportedCountryError(input || "unknown");
}

const ALIAS_TO_COUNTRY: Array<[RegExp, CanonicalCountry]> = [
  [/\b(?:usa|u\.s\.a?|united states(?:\s+of\s+america)?|america|american|us)\b/i, "United States"],
  [/\b(?:uk|u\.k\.|united kingdom|great britain|britain|british|england|scotland|wales)\b/i, "United Kingdom"],
  [/\b(?:canada|canadian)\b/i, "Canada"],
  [/\b(?:australia|australian|oz)\b/i, "Australia"],
  [/\b(?:new zealand|nz)\b/i, "New Zealand"],
  [/\b(?:germany|german|deutschland)\b/i, "Germany"],
  [/\b(?:sweden|swedish)\b/i, "Sweden"],
  [/\b(?:denmark|danish)\b/i, "Denmark"],
  [/\b(?:norway|norwegian)\b/i, "Norway"],
  [/\b(?:finland|finnish)\b/i, "Finland"],
];

function extractCountriesFromText(text: string): Set<CanonicalCountry> {
  const matches = new Set<CanonicalCountry>();
  for (const [pattern, country] of ALIAS_TO_COUNTRY) {
    if (pattern.test(text)) {
      matches.add(country);
    }
  }
  return matches;
}

/**
 * Extracts canonical destination countries referenced in a free-form chat query.
 * Distinguishes intended immigration destinations from nationality, citizenship,
 * or country of current residence.
 * 
 * Rules:
 * 1. Explicit destination phrases ("immigrate to", "move to", "work in", "visas for") are prioritized.
 * 2. Origin/residence mentions ("I am a US citizen", "living in the UK") are excluded from destinations.
 * 3. Multi-country comparisons ("compare Canada and Australia") are preserved.
 * 4. Queries with ambiguous, unresolvable, or missing destinations return an empty array []
 *    so that application-level clarification is triggered.
 */
export function detectCountriesFromQuery(query: string): CanonicalCountry[] {
  if (!query || typeof query !== "string") return [];

  const lowerQuery = query.toLowerCase();

  // 1. Identify Origin / Residence / Nationality clauses
  const originCountries = new Set<CanonicalCountry>();
  const originPatterns = [
    /\b(?:from|citizen\s+of|citizenship\s+(?:in|of)|national\s+of|nationality\s+is|living\s+in|live\s+in|currently\s+in|currently\s+living\s+in|based\s+in|resident\s+of|passport\s+from)\s+([a-z\s\-]+?)(?=\s+(?:(?:and|but)\s+want|(?:and|but)\s+would|(?:and|but)\s+need|how\s+can|how\s+do|want\s+to|moving\s+to|move\s+to|relocating\s+to|immigrating\s+to|looking\s+to|to\b)|\.|\?|,|$)/gi,
    /\b(us|american|uk|british|canadian|australian|german|swedish|danish|norwegian|finnish|pakistani|indian|nigerian|malaysian|singaporean)\s+(?:citizens?|citizenship|nationals?|nationality|residents?|residency|passports?|origin)\b/gi,
  ];

  for (const pattern of originPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lowerQuery)) !== null) {
      const matchedSnippet = match[0];
      const matched = extractCountriesFromText(matchedSnippet);
      matched.forEach((c) => originCountries.add(c));
    }
  }

  // 2. Identify Explicit Multi-Country Comparisons
  const comparisonPatterns = [
    /\b(?:compare|comparison|between|vs|versus)\s+([a-z\s\.\,\-]+?)\s+(?:and|vs|versus|with)\s+([a-z\s\.\,\-]+?)(?=[.?!;]|\b(?:for|from|as|while|if)\b|$)/gi,
  ];
  for (const pattern of comparisonPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lowerQuery)) !== null) {
      const compSnippet = match[0];
      const compCountries = Array.from(extractCountriesFromText(compSnippet)).filter(
        (c) => !originCountries.has(c)
      );
      if (compCountries.length >= 2) {
        return compCountries;
      }
    }
  }

  // 3. Identify Explicit Destination / Target Phrases
  const destinationCountries = new Set<CanonicalCountry>();
  const destinationPatterns = [
    /\b(?:immigrate\s+to|immigrating\s+to|immigration\s+to|move\s+to|moving\s+to|relocate\s+to|relocating\s+to|settle\s+in|settling\s+in|go\s+to|head\s+to|travel\s+to)\s+([a-z\s\.\-]+)/gi,
    /\b(?:work\s+in|working\s+in|study\s+in|studying\s+in|job\s+in|jobs\s+in)\s+([a-z\s\.\-]+)/gi,
    /\b(?:visa|visas|permit|permits|pr|pathway|pathways|requirements|rules|guidance|entry|criteria)\s+(?:for|in|to)\s+([a-z\s\.\-]+)/gi,
    /\b(?:apply\s+(?:for|to)\s+(?:a\s+)?(?:visa\s+)?in)\s+([a-z\s\.\-]+)/gi,
    /\b(united states|usa|us|united kingdom|uk|britain|canada|canadian|australia|australian|new zealand|germany|german|sweden|swedish|denmark|danish|norway|norwegian|finland|finnish)\s+(?:skilled worker|express entry|blue card|green card|work visa|visitor visa|student visa|pr|permanent residen|immigration|pathway|visa requirements|visa rules|requirements|rules)\b/gi,
  ];

  for (const pattern of destinationPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lowerQuery)) !== null) {
      const destSnippet = match[0];
      const matched = extractCountriesFromText(destSnippet);
      matched.forEach((c) => destinationCountries.add(c));
    }
  }

  // 4. Resolve Candidate Destinations
  if (destinationCountries.size > 0) {
    // Exclude countries that were solely origin/residence unless explicitly targeted as destination
    const resolved = Array.from(destinationCountries).filter((country) => {
      return !originCountries.has(country);
    });

    // If more than 2 distinct destinations appear without explicit comparison, it is ambiguous
    if (resolved.length > 2) {
      return [];
    }
    return resolved;
  }

  // 5. Fallback: If no explicit destination phrase, inspect all country mentions
  const allMentioned = extractCountriesFromText(lowerQuery);
  // Remove countries that are solely origin/residence
  const nonOrigin = Array.from(allMentioned).filter((c) => !originCountries.has(c));

  // If exactly one non-origin country is referenced, treat it as the target jurisdiction
  if (nonOrigin.length === 1) {
    return nonOrigin;
  }

  // If 0 non-origin countries (or ambiguous multiple mentions), fail closed to prompt clarification
  return [];
}

const UNSUPPORTED_COUNTRY_ALIASES: Array<[RegExp, string]> = [
  [/\bsingapore\b/i, "Singapore"],
  [/\bmalaysia\b/i, "Malaysia"],
  [/\b(?:uae|u\.a\.e\.?|united arab emirates|dubai|abu dhabi)\b/i, "United Arab Emirates"],
  [/\bspain\b/i, "Spain"],
  [/\bportugal\b/i, "Portugal"],
  [/\bfrance\b/i, "France"],
  [/\bitaly\b/i, "Italy"],
  [/\bjapan\b/i, "Japan"],
  [/\bsouth korea\b|\bkorea\b/i, "South Korea"],
  [/\bnetherlands\b|\bholland\b/i, "Netherlands"],
  [/\bireland\b/i, "Ireland"],
  [/\bswitzerland\b/i, "Switzerland"],
  [/\baustria\b/i, "Austria"],
  [/\bbelgium\b/i, "Belgium"],
  [/\bthailand\b/i, "Thailand"],
  [/\bbrazil\b/i, "Brazil"],
  [/\bmexico\b/i, "Mexico"],
  [/\bindia\b/i, "India"],
  [/\bpakistan\b/i, "Pakistan"],
  [/\bphilippines\b/i, "Philippines"],
  [/\bchina\b/i, "China"],
  [/\bhong kong\b/i, "Hong Kong"],
  [/\btaiwan\b/i, "Taiwan"],
  [/\bestonia\b/i, "Estonia"],
  [/\bgeorgia\b/i, "Georgia"],
  [/\bturkey\b|\btürkiye\b/i, "Turkey"],
  [/\bqatar\b/i, "Qatar"],
  [/\bsaudi arabia\b/i, "Saudi Arabia"],
  [/\bnigeria\b/i, "Nigeria"],
  [/\bgreece\b/i, "Greece"],
  [/\bpoland\b/i, "Poland"],
];

function extractUnsupportedMatches(text: string): Set<string> {
  const matches = new Set<string>();
  for (const [pattern, name] of UNSUPPORTED_COUNTRY_ALIASES) {
    if (pattern.test(text)) {
      matches.add(name);
    }
  }
  return matches;
}

/**
 * Detects explicitly targeted destination countries outside Borderless AI's
 * certified database coverage (e.g. Singapore, UAE, Japan), while still
 * ignoring origin/residence clauses (e.g. "I live in Malaysia").
 */
export function detectUnsupportedCountryFromQuery(query: string): string[] {
  if (!query || typeof query !== "string") return [];
  const lowerQuery = query.toLowerCase();

  const originSet = new Set<string>();
  const originPatterns = [
    /\b(?:from|citizen\s+of|citizenship\s+(?:in|of)|national\s+of|nationality\s+is|living\s+in|live\s+in|currently\s+in|currently\s+living\s+in|based\s+in|resident\s+of|passport\s+from)\s+([a-z\s\-]+?)(?=\s+(?:(?:and|but)\s+want|(?:and|but)\s+would|(?:and|but)\s+need|how\s+can|how\s+do|want\s+to|moving\s+to|move\s+to|relocating\s+to|immigrating\s+to|looking\s+to|to\b)|\.|\?|,|$)/gi,
    /\b(us|american|uk|british|canadian|australian|german|swedish|danish|norwegian|finnish|pakistani|indian|nigerian|malaysian|singaporean|japanese|chinese|spanish|portuguese|french|italian|emirati|korean|dutch|irish|swiss|thai|brazilian|mexican|filipino)\s+(?:citizens?|citizenship|nationals?|nationality|residents?|residency|passports?|origin)\b/gi,
  ];

  for (const pattern of originPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lowerQuery)) !== null) {
      extractUnsupportedMatches(match[0]).forEach((c) => originSet.add(c));
    }
  }

  const destSet = new Set<string>();
  const destPatterns = [
    /\b(?:immigrate\s+to|immigrating\s+to|immigration\s+to|move\s+to|moving\s+to|relocate\s+to|relocating\s+to|settle\s+in|settling\s+in|go\s+to|head\s+to|travel\s+to)\s+([a-z\s\.\-]+)/gi,
    /\b(?:work\s+in|working\s+in|study\s+in|studying\s+in|job\s+in|jobs\s+in)\s+([a-z\s\.\-]+)/gi,
    /\b(?:visa|visas|permit|permits|pr|pathway|pathways|requirements|rules|guidance|entry|criteria)\s+(?:for|in|to)\s+([a-z\s\.\-]+)/gi,
    /\b(?:apply\s+(?:for|to)\s+(?:a\s+)?(?:visa\s+)?in)\s+([a-z\s\.\-]+)/gi,
  ];

  for (const pattern of destPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lowerQuery)) !== null) {
      extractUnsupportedMatches(match[0]).forEach((c) => destSet.add(c));
    }
  }

  if (destSet.size > 0) {
    return Array.from(destSet).filter((c) => !originSet.has(c));
  }

  const all = Array.from(extractUnsupportedMatches(lowerQuery)).filter((c) => !originSet.has(c));
  return all.length === 1 ? all : [];
}

/**
 * Distinguishes immigration-specific inquiries (visas, permits, legal criteria)
 * from general platform questions, greetings, or conversational remarks.
 */
export function isImmigrationQuery(text: string): boolean {
  const immigrationPatterns = [
    /\b(visa|visas|permit|permits|pr|permanent residen|citizenship|naturalization)\b/i,
    /\b(express entry|crs|fsw|skilled worker|h-?1b|o-?1|l-?1|eb-?[1-5]|green card|blue card|chancenkarte|opportunity card|study permit)\b/i,
    /\b(indefinite leave to remain|ilr|lmia|sponsorship|nomination|pnp)\b/i,
    /\b(immigration|immigrate|relocate|relocation|eligibility score|points test)\b/i,
    /\b(work in|move to|settle in|requirements to live in|study in)\b/i,
  ];
  return immigrationPatterns.some((pattern) => pattern.test(text));
}

export type ChatMessageLike = {
  role?: string;
  content?: string;
  parts?: Array<{ type?: string; text?: string }>;
};

export function extractChatMessageText(msg: ChatMessageLike | null | undefined): string {
  if (!msg) return "";
  if (typeof msg.content === "string" && msg.content.length > 0) {
    return msg.content;
  }
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p) => p && p.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string)
      .join("\n");
  }
  return "";
}

/**
 * Resolves the active destination country scope across conversation turns so
 * follow-up questions inherit the most recent explicit user jurisdiction.
 * Inspects only user turns (ignoring system/assistant illustrative country lists).
 */
export function resolveThreadCountryContext(messages: ChatMessageLike[]): {
  countries: CanonicalCountry[];
  unsupportedCountries: string[];
  inheritedFromHistory: boolean;
  hasPriorImmigrationTurn: boolean;
} {
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      countries: [],
      unsupportedCountries: [],
      inheritedFromHistory: false,
      hasPriorImmigrationTurn: false,
    };
  }

  const latestText = extractChatMessageText(messages[messages.length - 1]);
  const latestCertified = detectCountriesFromQuery(latestText);
  const latestUnsupported = detectUnsupportedCountryFromQuery(latestText);

  let hasPriorImmigrationTurn = false;
  for (let i = 0; i < messages.length - 1; i++) {
    const m = messages[i];
    if (m?.role === "user" && isImmigrationQuery(extractChatMessageText(m))) {
      hasPriorImmigrationTurn = true;
      break;
    }
  }

  if (latestCertified.length > 0 || latestUnsupported.length > 0) {
    return {
      countries: latestCertified,
      unsupportedCountries: latestUnsupported,
      inheritedFromHistory: false,
      hasPriorImmigrationTurn,
    };
  }

  for (let i = messages.length - 2; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "user") continue;
    const text = extractChatMessageText(m);
    if (!text) continue;
    const priorCertified = detectCountriesFromQuery(text);
    const priorUnsupported = detectUnsupportedCountryFromQuery(text);
    if (priorCertified.length > 0 || priorUnsupported.length > 0) {
      return {
        countries: priorCertified,
        unsupportedCountries: priorUnsupported,
        inheritedFromHistory: true,
        hasPriorImmigrationTurn,
      };
    }
  }

  return {
    countries: [],
    unsupportedCountries: [],
    inheritedFromHistory: false,
    hasPriorImmigrationTurn,
  };
}

export function isContextualImmigrationFollowUp(
  latestText: string,
  hasPriorImmigrationTurn: boolean
): boolean {
  if (isImmigrationQuery(latestText)) return true;
  if (!hasPriorImmigrationTurn) return false;
  const trimmed = latestText.trim();
  if (/^(hi|hello|hey|thanks|thank you|ok|okay|got it|cool|bye)[!.?\s]*$/i.test(trimmed)) {
    return false;
  }
  return /\b(document|documents|fund|funds|savings|money|fee|fees|cost|ielts|toefl|clb|cefr|english|language|score|points|salary|wage|threshold|timeline|processing|wait|long|requirement|requirements|criteria|eligible|eligibility|qualify|sponsor|sponsorship|job offer|employer|degree|age|experience|dependent|dependents|family|spouse|renew|extend|it|that|this|those|them|there)\b/i.test(
    trimmed
  );
}

