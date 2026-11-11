"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

type Theme = "light" | "dark";

function themeIcon(theme: Theme) {
  if (theme === "dark") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 18a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm0-15a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm7 8a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2h2ZM7 12a1 1 0 0 1-1 1H4a1 1 0 1 1 0-2h2a1 1 0 0 1 1 1Zm9.657 5.243a1 1 0 0 1 1.414 0l1.415 1.414a1 1 0 0 1-1.415 1.414l-1.414-1.414a1 1 0 0 1 0-1.414Zm-11.314 0a1 1 0 0 1 0 1.414L3.93 20.07a1 1 0 1 1-1.415-1.414l1.414-1.414a1 1 0 0 1 1.414 0Zm12.728-12.728a1 1 0 0 1 1.415 1.414l-1.415 1.414a1 1 0 1 1-1.414-1.414l1.414-1.414ZM5.343 4.515a1 1 0 0 1 1.414 0l1.414 1.414A1 1 0 0 1 6.757 7.343L5.343 5.93a1 1 0 0 1 0-1.414ZM12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a.75.75 0 0 0-1.05-.88A10 10 0 1 0 20.88 15.55A.75.75 0 0 0 20 14.5Z"
      />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("light");
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") {
      setTheme(current);
      document.documentElement.classList.toggle("dark", current === "dark");
      return;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Theme = prefersDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setTheme(initial);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("visa-score-theme", next);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-card/85 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
        >
          {/* V2 Gradient Portal Icon */}
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#7C3AED' }} />
                <stop offset="100%" style={{ stopColor: '#06B6D4' }} />
              </linearGradient>
            </defs>
            <circle cx="13" cy="16" r="9" stroke="url(#headerGrad)" strokeWidth="3" fill="none"/>
            <circle cx="19" cy="16" r="9" stroke="url(#headerGrad)" strokeWidth="3" fill="none"/>
            <path d="M14.5 12.5 L18.5 16 L14.5 19.5" stroke="url(#headerGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm font-bold tracking-tight text-foreground group-hover:opacity-80 transition-opacity">
            Borderless AI
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          <Link 
            href="/form" 
            className={`transition-colors ${
              pathname === "/form" 
                ? "text-indigo-600 dark:text-indigo-400 font-semibold" 
                : "text-muted hover:text-foreground"
            }`}
          >
            Visa Check
          </Link>
          <Link 
            href="/explore" 
            className={`transition-colors ${
              pathname === "/explore" 
                ? "text-indigo-600 dark:text-indigo-400 font-semibold" 
                : "text-muted hover:text-foreground"
            }`}
          >
            Explore
          </Link>
          <Link 
            href="/chat" 
            className={`transition-colors ${
              pathname === "/chat" 
                ? "text-indigo-600 dark:text-indigo-400 font-semibold" 
                : "text-muted hover:text-foreground"
            }`}
          >
            AI Chat
          </Link>

          {!isLoaded ? (
            <div className="h-8 w-16 animate-pulse rounded-md bg-slate-200/60 dark:bg-slate-800" />
          ) : isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                className={`transition-colors mr-2 ${
                  pathname === "/dashboard" 
                    ? "text-indigo-600 dark:text-indigo-400 font-semibold" 
                    : "text-muted hover:text-foreground"
                }`}
              >
                Dashboard
              </Link>
              <UserButton />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="transition-colors hover:text-foreground">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="inline-flex h-8 items-center justify-center rounded-md bg-accent px-3 text-xs font-medium text-white hover:bg-indigo-600">
                  Sign up
                </button>
              </SignUpButton>
            </>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300/80 dark:border-slate-700 bg-background text-foreground transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {themeIcon(theme)}
          </button>
        </nav>
      </div>
    </header>
  );
}
