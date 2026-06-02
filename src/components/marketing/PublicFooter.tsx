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
      {/* Sitemap + newsletter */}
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

        {/* Newsletter — below links */}
        <form onSubmit={handleSubscribe} className="mt-12 flex max-w-md items-center gap-2">
          <input
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 flex-1 rounded-md border border-border bg-muted/20 px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/30"
          />
          <button
            type="submit"
            className="btn-3d btn-3d-primary inline-flex h-9 items-center gap-1 whitespace-nowrap px-4 text-[12.5px] font-medium"
          >
            {subscribed ? "Subscribed" : "Subscribe"}
            {!subscribed && <ArrowUpRight className="h-3 w-3" />}
          </button>
        </form>
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
