import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/Header";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://borderless.ghulam-mustafa.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Borderless AI — Free Visa Eligibility Checker",
    template: "%s | Borderless AI",
  },
  description:
    "Check your chances for 70+ visa types worldwide. AI-powered immigration advisor backed by official government data. No legal jargon. Instant results.",
  keywords: [
    "visa eligibility checker",
    "immigration AI",
    "visa score",
    "digital nomad visa",
    "work permit",
    "global mobility",
    "borderless AI",
  ],
  authors: [{ name: "Borderless AI" }],
  creator: "Borderless AI",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    siteName: "Borderless AI",
    title: "Borderless AI — Free Visa Eligibility Checker",
    description:
      "AI-powered immigration advisor. Check your visa chances instantly across 70+ countries.",
    url: BASE_URL,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Borderless AI — Your Global Immigration Advisor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Borderless AI — Free Visa Eligibility Checker",
    description:
      "AI-powered immigration advisor. Check your visa chances instantly across 70+ countries.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `
    (function() {
      try {
        var saved = localStorage.getItem("visa-score-theme");
        var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        var theme = saved === "dark" || saved === "light" ? saved : (prefersDark ? "dark" : "light");
        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.classList.toggle("dark", theme === "dark");
      } catch (_) {}
    })();
  `;

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased text-foreground`}
        >
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
