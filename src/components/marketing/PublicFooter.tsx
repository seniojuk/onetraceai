import { Link, useLocation } from "react-router-dom";
import { FooterWordmark } from "./FooterWordmark";

/* ============================================================
   PublicFooter — single source of truth for public pages.
   Only links to pages that actually exist. Indicates active route.
   ============================================================ */

type ColLink = { label: string; to: string };

const COLUMNS: { title: string; links: ColLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Overview", to: "/" },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", to: "/auth?mode=login" },
      { label: "Start free", to: "/auth?mode=signup" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
    ],
  },
];

export function PublicFooter() {
  const { pathname } = useLocation();
  const isActive = (to: string) => {
    const path = to.split("?")[0];
    if (path === "/") return pathname === "/";
    return pathname === path;
  };
  return (
    <footer className="relative mt-24 border-t border-border bg-background">
      {/* Sitemap */}
      <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
        <div className="grid grid-cols-2 gap-10 border-t-0 sm:grid-cols-4 sm:gap-8">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {col.title}
              </div>
              <ul className="mt-5 space-y-3 text-[13px]">
                {col.links.map((l) => {
                  const active = isActive(l.to);
                  return (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        aria-current={active ? "page" : undefined}
                        className={`group inline-flex items-center gap-2 transition-colors ${
                          active ? "text-foreground" : "text-foreground/70 hover:text-foreground"
                        }`}
                      >
                        {active && (
                          <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
                        )}
                        <span
                          className={`border-b ${
                            active
                              ? "border-foreground/60"
                              : "border-transparent group-hover:border-foreground/40"
                          }`}
                        >
                          {l.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright rail */}
      <div>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
            © 2026 OneTrace AI, Inc.
          </span>
        </div>
      </div>

      {/* Oversized wordmark with interactive variants — last thing on the page */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FooterWordmark />
      </div>
    </footer>
  );
}

