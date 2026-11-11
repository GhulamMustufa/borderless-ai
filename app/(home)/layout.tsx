import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://borderless.ghulam-mustafa.com";

export const metadata: Metadata = {
  title: "Borderless AI — Free Visa Eligibility Checker",
  description:
    "Check your visa chances for work, study, and long-term visas across 14 global regions. Official government rules explained in everyday English.",
  alternates: {
    canonical: BASE_URL,
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Borderless AI",
  url: BASE_URL,
  description:
    "Free visa eligibility checker and AI Visa Assistant backed by official government websites across 14 global regions.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/explore?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Borderless AI",
  url: BASE_URL,
  logo: `${BASE_URL}/favicon.svg`,
  sameAs: [],
  description:
    "Simple visa eligibility checker and AI assistant helping people compare work, study, and long-term move options abroad.",
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Borderless AI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Check your visa chances in 2 minutes using verified government rules, rejection risk alerts, and a printable checklist.",
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      {children}
    </>
  );
}
