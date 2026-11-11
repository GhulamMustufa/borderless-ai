import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start Your Free Visa Check",
  description:
    "Answer 3 quick steps and get an honest score for your best visa options in under 2 minutes—free and backed by real government rules.",
  openGraph: {
    title: "Start Your Free Visa Check — Borderless AI",
    description:
      "Answer 3 quick steps and get an honest score for your best visa options in under 2 minutes.",
    url: "https://borderless.ghulam-mustafa.com/form",
  },
  alternates: {
    canonical: "https://borderless.ghulam-mustafa.com/form",
  },
};

export default function FormLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
