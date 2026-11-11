import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Visa Options by Region",
  description:
    "Compare visa costs, difficulty, and processing speed across 14 global regions—find the best option for work, study, or permanent stay.",
  openGraph: {
    title: "Explore Visa Options by Region — Borderless AI",
    description:
      "Compare visa costs, difficulty, and processing speed across 14 global regions before checking your chances.",
    url: "https://borderless.ghulam-mustafa.com/explore",
  },
  alternates: {
    canonical: "https://borderless.ghulam-mustafa.com/explore",
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
