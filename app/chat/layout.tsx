import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Visa Assistant",
  description:
    "Ask questions about visas, work permits, or moving abroad in everyday English. Powered by verified official government rules. Free with an account.",
  openGraph: {
    title: "AI Visa Assistant — Borderless AI",
    description:
      "Ask questions about visas, work permits, or moving abroad in everyday English, backed by official government rules.",
    url: "https://borderless.ghulam-mustafa.com/chat",
  },
  alternates: {
    canonical: "https://borderless.ghulam-mustafa.com/chat",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the Spain Digital Nomad Visa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Spain's Digital Nomad Visa lets remote workers and freelancers from outside the EU live in Spain. Applicants must show steady remote income for clients or employers outside Spain.",
      },
    },
    {
      "@type": "Question",
      name: "How do I qualify for Canada Express Entry?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Canada Express Entry scores applicants on age, degree, work experience, and English/French scores. People with higher scores receive invitations to apply to stay permanently in Canada.",
      },
    },
    {
      "@type": "Question",
      name: "What countries offer a Digital Nomad Visa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Many countries offer remote worker visas, including Portugal, Spain, Germany, the UAE, Thailand, Brazil, and Estonia. Each has different monthly income or savings rules.",
      },
    },
    {
      "@type": "Question",
      name: "Can AI help me check my visa chances?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Borderless AI checks your profile against official government visa rules and gives an honest score and checklist. It offers practical guidance, not legal advice.",
      },
    },
  ],
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}

