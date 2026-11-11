import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Visa Plan & Results",
  description:
    "See your personalized visa scores, rejection risks, and next steps before applying.",
  // Results are personalised and dynamic — don't index them
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
