import type { TargetRegion } from "./types";

export type RegionMeta = {
  id: string;
  name: string;
  countries: string[];
  shortDescription: string;
  cost: "Low" | "Medium" | "High";
  difficulty: "Easy" | "Medium" | "Hard";
  speed: "Fast" | "Medium" | "Slow";
  bestFor: string;
  pros: [string, string, string];
  cons: [string, string, string];
};

export const REGIONS: RegionMeta[] = [
  {
    id: "canada",
    name: "Canada",
    countries: ["Canada"],
    shortDescription: "Structured PR routes but competitive CRS cutoffs.",
    cost: "High",
    difficulty: "Hard",
    speed: "Medium",
    bestFor:
      "Skilled applicants with IELTS + ECA + 3-5 years experience. Strong fit for long-term PR seekers.",
    pros: [
      "Clear pathways through Express Entry and PNP",
      "Family-friendly PR and citizenship timeline",
      "Nursing, tech, and trades still recruit internationally",
    ],
    cons: [
      "Requires IELTS + strong profile to clear CRS",
      "Settlement funds and process fees are significant",
      "Invitation chances drop quickly with lower scores",
    ],
  },
  {
    id: "uk",
    name: "UK",
    countries: ["United Kingdom"],
    shortDescription: "Fast processing if you already have a licensed sponsor.",
    cost: "High",
    difficulty: "Medium",
    speed: "Fast",
    bestFor:
      "Applicants with confirmed skilled-job offers or students planning post-study work transitions.",
    pros: [
      "Sponsor route can move quickly once offer is secured",
      "Graduate route gives post-study work window",
      "Strong demand in health and care roles",
    ],
    cons: [
      "Employer sponsorship needed for most work routes",
      "Visa fees + IHS charges are expensive",
      "PR takes years and depends on continuous status",
    ],
  },
  {
    id: "anz",
    name: "Australia / New Zealand",
    countries: ["Australia", "New Zealand"],
    shortDescription: "Points-driven systems with strict occupation filters.",
    cost: "High",
    difficulty: "Hard",
    speed: "Slow",
    bestFor:
      "Higher-education professionals in listed occupations with strong English test results.",
    pros: [
      "Transparent points frameworks and skilled lists",
      "High quality of life and salary potential",
      "Direct PR pathways exist for selected occupations",
    ],
    cons: [
      "Skills assessment is mandatory in many streams",
      "Invites can take long and cutoffs fluctuate",
      "Application + relocation costs are heavy",
    ],
  },
  {
    id: "germany-nordics",
    name: "Germany / Northern Europe",
    countries: ["Germany", "Netherlands", "Sweden", "Denmark", "Norway", "Finland"],
    shortDescription: "Employer-contract migration with growing demand for specialists.",
    cost: "Medium",
    difficulty: "Medium",
    speed: "Medium",
    bestFor:
      "Engineers, IT, healthcare, and technical workers willing to meet language or licensing needs.",
    pros: [
      "EU Blue Card is available for qualified workers",
      "Strong labor demand in engineering and tech",
      "Predictable permit rules once contract is secured",
    ],
    cons: [
      "Employer sponsorship needed in most cases",
      "Local language can block integration and renewal",
      "Degree recognition/licensing may delay entry",
    ],
  },
  {
    id: "southern-europe",
    name: "Southern Europe",
    countries: ["Portugal", "Spain", "Italy", "Greece", "Malta"],
    shortDescription: "Mixed routes: study, seasonal work, and niche permits.",
    cost: "Medium",
    difficulty: "Medium",
    speed: "Slow",
    bestFor:
      "Applicants flexible on occupation and timeline, especially for study-first strategies.",
    pros: [
      "Lower living costs than many northern EU markets",
      "Some countries offer easier initial residence paths",
      "Can be a stepping stone to longer EU residence",
    ],
    cons: [
      "Job market salaries are generally lower",
      "Processing and bureaucracy can be slow",
      "Direct PR path is less straightforward than Canada",
    ],
  },
  {
    id: "middle-east",
    name: "Middle East",
    countries: ["UAE", "Saudi Arabia", "Qatar", "Oman", "Bahrain", "Kuwait"],
    shortDescription: "Work-first migration with quick entry but limited permanence.",
    cost: "Low",
    difficulty: "Easy",
    speed: "Fast",
    bestFor:
      "Applicants prioritizing immediate employment income, especially in healthcare, construction, and services.",
    pros: [
      "Employer hiring cycles can be fast",
      "Lower upfront migration cost than Western routes",
      "Tax advantages in some Gulf countries",
    ],
    cons: [
      "No PR pathway in most Gulf destinations",
      "Status is tied directly to employer sponsorship",
      "Job security depends on contract and market cycles",
    ],
  },
  {
    id: "usa",
    name: "USA",
    countries: ["United States"],
    shortDescription: "High-reward but quota-driven and legally complex.",
    cost: "High",
    difficulty: "Hard",
    speed: "Slow",
    bestFor:
      "Specialized professionals with strong employers, multinational transfer options, or elite profiles.",
    pros: [
      "Top salaries in tech, medicine, and research",
      "Multiple visa classes for different profiles",
      "Strong long-term upside if status is secured",
    ],
    cons: [
      "Employer sponsorship needed for most routes",
      "H-1B lottery creates major uncertainty",
      "Long waits and legal costs are common",
    ],
  },
  {
    id: "sg-my",
    name: "Singapore / Malaysia",
    countries: ["Singapore", "Malaysia"],
    shortDescription: "Skill-focused work permits with strong employer control.",
    cost: "Medium",
    difficulty: "Medium",
    speed: "Fast",
    bestFor:
      "Mid-to-senior professionals in tech, finance, logistics, and operations roles.",
    pros: [
      "Fast processing once employer files permit",
      "Strong regional business hubs for skilled roles",
      "Lower relocation friction for many Asian applicants",
    ],
    cons: [
      "Employer sponsorship needed in practice",
      "PR outcomes are selective and not guaranteed",
      "Salary thresholds filter junior profiles out",
    ],
  },
  {
    id: "jp-kr",
    name: "Japan / South Korea",
    countries: ["Japan", "South Korea"],
    shortDescription: "Employment migration with high language and culture fit requirements.",
    cost: "Medium",
    difficulty: "Hard",
    speed: "Medium",
    bestFor:
      "Applicants with technical skills plus willingness to invest in language proficiency.",
    pros: [
      "Demand exists in manufacturing, engineering, and IT",
      "Stable work environments in major employers",
      "Specialized skilled-worker tracks are expanding",
    ],
    cons: [
      "Language requirement is a major barrier",
      "Fewer direct PR-style pathways than Canada/Australia",
      "Workplace integration can be challenging",
    ],
  },
  {
    id: "easy-entry",
    name: "Easy Entry Countries",
    countries: ["Azerbaijan", "Turkey", "Thailand", "Georgia", "Sri Lanka", "Indonesia"],
    shortDescription: "Lower-barrier entry options, usually temporary and non-PR.",
    cost: "Low",
    difficulty: "Easy",
    speed: "Fast",
    bestFor:
      "Applicants needing quick relocation, short-term mobility, or lower-cost first moves.",
    pros: [
      "Lower documentation burden for initial entry",
      "Affordable compared to high-income destinations",
      "Useful as a short-term transition step",
    ],
    cons: [
      "No PR pathway in many cases",
      "Salary levels are often modest",
      "Long-term immigration outcomes are limited",
    ],
  },
  {
    id: "latam",
    name: "Latin America",
    countries: ["Brazil", "Colombia", "Argentina", "Mexico", "Costa Rica"],
    shortDescription: "Growing digital nomad hubs with low cost of living.",
    cost: "Low",
    difficulty: "Easy",
    speed: "Fast",
    bestFor: "Remote workers and freelancers looking for lifestyle benefits and affordable visas.",
    pros: [
      "Very affordable cost of living",
      "Accessible digital nomad visas (e.g., Brazil, Colombia)",
      "Pathways to citizenship in some countries are fast"
    ],
    cons: [
      "Local salaries are low if you don't have remote income",
      "Bureaucracy can be unpredictable",
      "Tax implications require careful planning"
    ]
  },
  {
    id: "eastern-europe",
    name: "Eastern Europe & Caucasus",
    countries: ["Estonia", "Georgia", "Romania", "Hungary", "Croatia"],
    shortDescription: "Tech-friendly nations with simple e-residency and nomad options.",
    cost: "Low",
    difficulty: "Easy",
    speed: "Fast",
    bestFor: "Entrepreneurs, IT freelancers, and location-independent businesses.",
    pros: [
      "Pioneering digital infrastructures (e.g. Estonia E-Residency)",
      "Low flat taxes for independent contractors",
      "1-year visa-free stays for remote workers (e.g. Georgia)"
    ],
    cons: [
      "Nomad visas rarely lead directly to permanent residency",
      "Language barriers outside major hubs",
      "Local market sizes are small"
    ]
  },
  {
    id: "greater-china",
    name: "Greater China",
    countries: ["Hong Kong", "China", "Taiwan"],
    shortDescription: "Highly competitive, high-salary hubs for top talent.",
    cost: "High",
    difficulty: "Hard",
    speed: "Medium",
    bestFor: "Top-tier professionals in finance, logistics, tech, and academia.",
    pros: [
      "Points-based systems (like HK QMAS) allow entry without a job offer",
      "Extremely low taxes and high earning potential",
      "World-class infrastructure and safety"
    ],
    cons: [
      "Fierce competition and strict quotas",
      "Cost of living and housing is very high",
      "Requires significant documentation and proof of excellence"
    ]
  },
  {
    id: "africa",
    name: "Africa",
    countries: ["South Africa", "Mauritius", "Kenya", "Rwanda"],
    shortDescription: "Emerging markets offering critical skills and remote work visas.",
    cost: "Medium",
    difficulty: "Medium",
    speed: "Slow",
    bestFor: "Specialists in scarce skills or remote workers seeking premium climates.",
    pros: [
      "Critical skills lists provide direct pathways (e.g. South Africa)",
      "Premium/Nomad visas are easy to obtain (e.g. Mauritius)",
      "Lower cost of luxury living"
    ],
    cons: [
      "Processing times can be very slow (e.g. South Africa Home Affairs)",
      "Job market is highly protective of local workers",
      "Economic instability in some regions"
    ]
  }
];

export const EXPLORE_TO_FORM_REGION_MAP: Record<
  string,
  { targetRegion: TargetRegion; label: string }
> = {
  canada: { targetRegion: "canada", label: "Canada" },
  uk: { targetRegion: "uk", label: "UK" },
  anz: { targetRegion: "australia-new-zealand", label: "Australia/New Zealand" },
  "australia-new-zealand": { targetRegion: "australia-new-zealand", label: "Australia/New Zealand" },
  "germany-nordics": { targetRegion: "germany-nordics", label: "Germany/Northern Europe" },
  "southern-europe": { targetRegion: "southern-europe", label: "Southern Europe" },
  "middle-east": { targetRegion: "middle-east", label: "Middle East" },
  usa: { targetRegion: "usa", label: "USA" },
  "sg-my": { targetRegion: "sg-my", label: "Singapore/Malaysia" },
  "jp-kr": { targetRegion: "jp-kr", label: "Japan/South Korea" },
  "easy-entry": { targetRegion: "easy-entry", label: "Easy Entry Countries" },
  latam: { targetRegion: "latam", label: "Latin America" },
  "eastern-europe": { targetRegion: "eastern-europe", label: "Eastern Europe & Caucasus" },
  "greater-china": { targetRegion: "greater-china", label: "Greater China" },
  africa: { targetRegion: "africa", label: "Africa" },
  "canada-uk": { targetRegion: "canada", label: "Canada/UK" },
};

export const CERTIFIED_TARGET_REGIONS = new Set<TargetRegion>([
  "canada",
  "uk",
  "usa",
  "germany-nordics",
  "australia-new-zealand",
]);
