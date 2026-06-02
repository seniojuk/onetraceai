import { Link } from "react-router-dom";
import { ArrowUpRight, Github, Linkedin, Twitter } from "lucide-react";
import { useState } from "react";

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
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <footer className="relative mt-24 border-t border-border bg-background">
      {/* Top band: manifesto + newsletter */}
      <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          {/* Manifesto */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                All systems operational
              </span>
            </div>
            <h2 className="mt-6 font-geist text-[32px] leading-[1.05] tracking-[-0.025em] text-foreground sm:text-[44px] md:text-[52px]">
              Stop shipping{" "}
              <span className="font-serif italic text-foreground/70">orphaned code.</span>
              <br />
              Trace it,{" "}
              <span className="font-serif italic text-foreground/70">end to end.</span>
            </h2>
            <p className="mt-5 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
              OneTrace is the traceability layer for AI-built software. PRDs, Stories, Jira, Git
              and Tests — connected in one living graph.
            </p>
          </div>

          {/* Newsletter */}
          <div className="lg:pl-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Field notes · monthly
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-foreground/90">
              A short dispatch on AI-native traceability, coverage engineering and how teams ship
              with provenance.
            </p>
            <form onSubmit={handleSubscribe} className="mt-5">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-1.5 focus-within:border-foreground/30">
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-2 text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  className="btn-3d btn-3d-primary inline-flex h-9 items-center gap-1 px-4 text-[12.5px] font-medium"
                >
                  {subscribed ? "Subscribed" : "Subscribe"}
                  {!subscribed && <ArrowUpRight className="h-3 w-3" />}
                </button>
              </div>
              <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                No spam · unsubscribe in one click
              </p>
            </form>
          </div>
        </div>

        {/* Sitemap */}
        <div className="mt-16 grid grid-cols-2 gap-10 border-t border-border pt-12 sm:grid-cols-4 sm:gap-8">
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

      {/* Oversized wordmark */}
      <div
        aria-hidden
        className="mx-auto mt-16 max-w-[1400px] overflow-hidden px-4 sm:px-6"
      >
        <div className="select-none whitespace-nowrap font-geist text-[clamp(80px,18vw,260px)] font-medium leading-[0.85] tracking-[-0.06em] text-foreground/90">
          OneTrace<span className="font-serif italic text-foreground/40">.ai</span>
        </div>
      </div>

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
