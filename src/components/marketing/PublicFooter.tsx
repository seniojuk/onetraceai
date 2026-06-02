import { Link } from "react-router-dom";
import { Github, Linkedin, Twitter } from "lucide-react";

/* ============================================================
   PublicFooter — editorial, footer.design-inspired.
   - Oversized wordmark
   - Status badge + manifesto line
   - Sitemap columns (mono eyebrows)
   - Newsletter capture
   - Fine print rail
   ============================================================ */

type ColLink = { label: string; to: string; external?: boolean };

const COLUMNS: { title: string; links: ColLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Artifact Graph", to: "/#solution" },
      { label: "Coverage Engine", to: "/#solution" },
      { label: "Drift Detection", to: "/#solution" },
      { label: "Integrations", to: "/#how" },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Manifesto", to: "/#problem" },
      { label: "Contact", to: "/contact" },
      { label: "Careers", to: "/contact" },
      { label: "Security", to: "/privacy" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", to: "/#how" },
      { label: "Changelog", to: "/#how" },
      { label: "Support", to: "/contact" },
      { label: "Status", to: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "DPA", to: "/contact" },
      { label: "Cookies", to: "/privacy" },
    ],
  },
];

export function PublicFooter() {
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
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="group inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-foreground"
                    >
                      <span className="border-b border-transparent group-hover:border-foreground/40">
                        {l.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>


      {/* Oversized wordmark with interactive variants */}
      <FooterWordmark />


      {/* Fine print rail */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>© 2026 OneTrace AI, Inc.</span>
            <span className="hidden md:inline text-border">/</span>
            <span>Built in Europe</span>
            <span className="hidden md:inline text-border">/</span>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Twitter"
              className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Twitter className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Github className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Linkedin className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
