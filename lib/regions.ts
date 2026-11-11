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
    shortDescription: "Clear paths to stay permanently, though high point scores are needed.",
    cost: "High",
    difficulty: "Hard",
    speed: "Medium",
    bestFor:
      "Skilled workers with strong English scores (IELTS), verified degrees, and 3–5 years of experience looking for permanent residency (PR).",
    pros: [
      "Clear points-based path to permanent residency (Express Entry & provincial programs)",
      "Family-friendly rules and clear timeline to citizenship",
      "Strong demand for healthcare, tech, and skilled trade workers",
    ],
    cons: [
      "Needs high English test scores and a strong profile to win an invitation",
      "Requires proof of savings and higher government application fees",
      "Lower point scores face long waits for invitations",
    ],
  },
  {
    id: "uk",
    name: "UK",
    countries: ["United Kingdom"],
    shortDescription: "Fast visa decisions if you already have a UK job offer.",
    cost: "High",
    difficulty: "Medium",
    speed: "Fast",
    bestFor:
      "Applicants with a job offer from an approved UK employer, or students planning to work after graduation.",
    pros: [
      "Quick visa processing once you get a sponsored job offer",
      "Graduate Visa lets students stay and work after university",
      "Strong hiring in healthcare, nursing, and skilled roles",
    ],
    cons: [
      "Most work visas require an approved employer to sponsor you",
      "Upfront visa fees and healthcare charges are expensive",
      "Permanent residency takes several years of continuous stay",
    ],
  },
  {
    id: "anz",
    name: "Australia / New Zealand",
    countries: ["Australia", "New Zealand"],
    shortDescription: "Points-based visas focused on jobs that are in high demand.",
    cost: "High",
    difficulty: "Hard",
    speed: "Slow",
    bestFor:
      "Degree holders working in shortage jobs with strong English test scores.",
    pros: [
      "Clear points systems and public lists of in-demand jobs",
      "High salaries and great quality of life",
      "Direct paths to permanent residency for eligible skilled roles",
    ],
    cons: [
      "Many jobs require an official skills check before you can apply",
      "Wait times can be long and minimum scores change often",
      "Moving and visa costs are high",
    ],
  },
  {
    id: "germany-nordics",
    name: "Germany / Northern Europe",
    countries: ["Germany", "Netherlands", "Sweden", "Denmark", "Norway", "Finland"],
    shortDescription: "Job-offer visas and job-seeker options for skilled professionals.",
    cost: "Medium",
    difficulty: "Medium",
    speed: "Medium",
    bestFor:
      "Engineers, IT workers, healthcare staff, and degree holders who meet salary or language rules.",
    pros: [
      "EU Blue Card and Opportunity Card offer clear work options",
      "Strong demand for engineers, tech, and healthcare talent",
      "Clear rules once you sign a job contract",
    ],
    cons: [
      "Most routes still require a local job offer",
      "Not speaking the local language makes daily life and some renewals harder",
      "Checking foreign degrees or licenses can slow things down",
    ],
  },
  {
    id: "southern-europe",
    name: "Southern Europe",
    countries: ["Portugal", "Spain", "Italy", "Greece", "Malta"],
    shortDescription: "Options include study visas, remote worker permits, and seasonal work.",
    cost: "Medium",
    difficulty: "Medium",
    speed: "Slow",
    bestFor:
      "Remote workers, students, or applicants flexible on job type and wait time.",
    pros: [
      "Lower day-to-day living costs than Northern Europe",
      "Several countries offer remote worker or easy starter visas",
      "Can lead to long-term European residence over time",
    ],
    cons: [
      "Local salaries are generally lower",
      "Paperwork and government approvals can move slowly",
      "Direct permanent residency takes longer than in Canada",
    ],
  },
  {
    id: "middle-east",
    name: "Middle East",
    countries: ["UAE", "Saudi Arabia", "Qatar", "Oman", "Bahrain", "Kuwait"],
    shortDescription: "Fast work visas once hired, though permanent stay is rare.",
    cost: "Low",
    difficulty: "Easy",
    speed: "Fast",
    bestFor:
      "People focused on quick employment and tax-free income in healthcare, construction, tech, or services.",
    pros: [
      "Hiring and visa approvals are often very fast",
      "Lower upfront moving and visa fees than Western countries",
      "Low or zero personal income tax in several Gulf nations",
    ],
    cons: [
      "No permanent residency path in most Gulf countries",
      "Your visa stays tied directly to your employer",
      "Staying long-term depends on keeping an active job contract",
    ],
  },
  {
    id: "usa",
    name: "USA",
    countries: ["United States"],
    shortDescription: "Top salaries, but strict yearly visa limits and tough rules.",
    cost: "High",
    difficulty: "Hard",
    speed: "Slow",
    bestFor:
      "Specialists with a US employer sponsor, company transfer option, or standout achievements.",
    pros: [
      "Some of the highest salaries in tech, medicine, and research",
      "Many visa categories for different backgrounds",
      "Strong long-term career benefits once settled",
    ],
    cons: [
      "Most work visas require a US company to sponsor you",
      "The H-1B work visa relies on a yearly lottery",
      "Long wait times and legal costs are common",
    ],
  },
  {
    id: "sg-my",
    name: "Singapore / Malaysia",
    countries: ["Singapore", "Malaysia"],
    shortDescription: "Skill-focused work permits tied to employers, plus remote-work options.",
    cost: "Medium",
    difficulty: "Medium",
    speed: "Fast",
    bestFor:
      "Mid-to-senior workers in tech, finance, logistics, or remote digital jobs.",
    pros: [
      "Fast approvals once an employer applies for your pass",
      "Major business hubs with English-friendly workplaces",
      "Easy transition for workers already based in Asia",
    ],
    cons: [
      "Almost all work passes depend on having an employer",
      "Permanent residency is selective and not guaranteed",
      "High minimum salary rules make it harder for junior workers",
    ],
  },
  {
    id: "jp-kr",
    name: "Japan / South Korea",
    countries: ["Japan", "South Korea"],
    shortDescription: "Work visas for skilled roles, often needing local language skills.",
    cost: "Medium",
    difficulty: "Hard",
    speed: "Medium",
    bestFor:
      "Engineers and technical workers willing to learn Japanese or Korean.",
    pros: [
      "Steady hiring in manufacturing, engineering, and IT",
      "Safe cities and stable major employers",
      "New points-based tracks reward highly skilled workers",
    ],
    cons: [
      "Language skills are a major hurdle for jobs and daily life",
      "Fewer quick routes to permanent residency than Canada or Australia",
      "Local workplace culture can take time to adjust to",
    ],
  },
  {
    id: "easy-entry",
    name: "Easy Entry Countries",
    countries: ["Azerbaijan", "Turkey", "Thailand", "Georgia", "Sri Lanka", "Indonesia"],
    shortDescription: "Simpler visas to enter quickly, mostly for temporary or remote stays.",
    cost: "Low",
    difficulty: "Easy",
    speed: "Fast",
    bestFor:
      "Remote workers or movers wanting low costs and minimal paperwork to get started.",
    pros: [
      "Much less paperwork needed to apply",
      "Affordable living costs compared to Western destinations",
      "Good short-term base while planning a longer move",
    ],
    cons: [
      "Usually does not lead to permanent residency",
      "Local pay rates are often lower",
      "Long-term stay options can be limited",
    ],
  },
  {
    id: "latam",
    name: "Latin America",
    countries: ["Brazil", "Colombia", "Argentina", "Mexico", "Costa Rica"],
    shortDescription: "Popular remote worker hubs with affordable living costs.",
    cost: "Low",
    difficulty: "Easy",
    speed: "Fast",
    bestFor: "Remote workers and freelancers with outside income looking for lower living costs.",
    pros: [
      "Very affordable cost of living",
      "Simple remote worker visas (like Brazil and Colombia)",
      "Faster citizenship paths in a few countries",
    ],
    cons: [
      "Local pay is low if you don't earn remote income",
      "Paperwork rules can change or move slowly",
      "Cross-border taxes need careful planning",
    ],
  },
  {
    id: "eastern-europe",
    name: "Eastern Europe & Caucasus",
    countries: ["Estonia", "Georgia", "Romania", "Hungary", "Croatia"],
    shortDescription: "Tech-friendly countries with online business and remote worker options.",
    cost: "Low",
    difficulty: "Easy",
    speed: "Fast",
    bestFor: "Remote freelancers, IT workers, and solo founders.",
    pros: [
      "Strong digital setup for remote founders (like Estonia E-Residency)",
      "Low tax rates for independent contractors in several countries",
      "Long visa-free or remote stays available (such as Georgia)",
    ],
    cons: [
      "Remote worker visas rarely lead directly to permanent stay",
      "Local languages can be tricky outside big cities",
      "Smaller local job markets",
    ],
  },
  {
    id: "greater-china",
    name: "Greater China",
    countries: ["Hong Kong", "China", "Taiwan"],
    shortDescription: "Competitive, high-paying business hubs for top talent.",
    cost: "High",
    difficulty: "Hard",
    speed: "Medium",
    bestFor: "Experienced professionals in finance, logistics, tech, and research.",
    pros: [
      "Hong Kong's points program lets some skilled people apply without a job offer",
      "Low income tax rates and high earning potential",
      "Modern transit, safety, and global business connections",
    ],
    cons: [
      "Tough competition and yearly approval limits",
      "Housing and daily living costs are very high",
      "Requires strong proof of degrees, income, and work history",
    ],
  },
  {
    id: "africa",
    name: "Africa",
    countries: ["South Africa", "Mauritius", "Kenya", "Rwanda"],
    shortDescription: "Growing hubs offering critical-skills and remote worker visas.",
    cost: "Medium",
    difficulty: "Medium",
    speed: "Slow",
    bestFor: "Specialists in scarce jobs or remote workers seeking warm destinations.",
    pros: [
      "Direct skilled visas for shortage occupations (such as South Africa)",
      "Simple remote worker permits (like Mauritius)",
      "Lower day-to-day living costs for international earners",
    ],
    cons: [
      "Government processing times can be slow",
      "Employers often must show they couldn't hire a local worker first",
      "Job markets and pay vary widely by country",
    ],
  },
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
