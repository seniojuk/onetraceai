import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, AlertTriangle, Sparkles, Workflow } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/ThemeProvider";

const PRODUCT_ITEMS = [
  {
    id: "problem",
    label: "The problem",
    desc: "Why specs and code drift",
    Icon: AlertTriangle,
  },
  {
    id: "solution",
    label: "The solution",
    desc: "One source of truth, AI-kept in sync",
    Icon: Sparkles,
  },
  {
    id: "how",
    label: "How it works",
    desc: "PRD → Epics → Stories → Code → Coverage",
    Icon: Workflow,
  },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { pathname } = useLocation();
  const onHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!onHome) {
      setActiveSection(null);
      return;
    }
    const els = PRODUCT_ITEMS
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onHome, pathname]);

  const productHref = (id: string) => (onHome ? `#${id}` : `/#${id}`);
  const productActive = onHome && PRODUCT_ITEMS.some((p) => p.id === activeSection);

  const routeLinkClass = (active: boolean) =>
    `relative text-[13px] transition-colors ${
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    } after:absolute after:left-0 after:-bottom-1 after:h-px after:bg-foreground after:transition-all ${
      active ? "after:w-full" : "after:w-0 hover:after:w-full"
    }`;

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? "pt-2 sm:pt-3" : "pt-0"
      }`}
    >
      <div
        className={`mx-auto flex items-center justify-between gap-4 transition-all duration-300 ${
          scrolled
            ? "max-w-5xl rounded-full border border-border bg-background/80 px-4 py-2 shadow-[0_8px_30px_-12px_hsl(var(--foreground)/0.15)] backdrop-blur-xl sm:px-5"
            : "max-w-6xl border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4"
        }`}
      >
        <Link to="/" className="group flex items-center gap-2 text-sm">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent to-accent/60 text-[11px] font-semibold text-accent-foreground transition-transform duration-300 group-hover:rotate-[-4deg] group-hover:scale-105">
            OT
          </div>
          <span className="font-semibold tracking-tight text-foreground">OneTrace</span>
          <span className="text-muted-foreground">AI</span>
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] text-muted-foreground md:flex">
          {/* Product mega menu */}
          <div className="group relative">
            <button
              type="button"
              className={`relative inline-flex items-center gap-1 text-[13px] transition-colors ${
                productActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Product
              <svg
                className="h-3 w-3 transition-transform duration-200 group-hover:rotate-180"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="invisible absolute left-1/2 top-full z-50 w-[340px] -translate-x-1/2 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
              <div className="rounded-xl border border-border bg-popover p-2 shadow-[0_20px_50px_-20px_hsl(var(--foreground)/0.25)]">
                {PRODUCT_ITEMS.map(({ id, label, desc, Icon }) =>
                  onHome ? (
                    <a
                      key={id}
                      href={`#${id}`}
                      data-active={activeSection === id}
                      className="group/item flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/60 data-[active=true]:bg-muted/40"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground group-hover/item:text-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-[13px] font-medium text-foreground">{label}</span>
                        <span className="text-[12px] leading-snug text-muted-foreground">{desc}</span>
                      </span>
                    </a>
                  ) : (
                    <Link
                      key={id}
                      to={`/#${id}`}
                      className="group/item flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/60"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground group-hover/item:text-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-[13px] font-medium text-foreground">{label}</span>
                        <span className="text-[12px] leading-snug text-muted-foreground">{desc}</span>
                      </span>
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
          <Link to="/pricing" className={routeLinkClass(pathname === "/pricing")}>
            Pricing
          </Link>
          <Link to="/contact" className={routeLinkClass(pathname === "/contact")}>
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/auth?mode=login"
            className="hidden text-[13px] text-muted-foreground hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link
            to="/auth?mode=signup"
            className="btn-3d btn-3d-primary inline-flex h-8 items-center gap-1 px-3 text-[12.5px] font-medium"
          >
            Start free <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent>
              <div className="mt-8 flex flex-col gap-1">
                <div className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Product
                </div>
                {PRODUCT_ITEMS.map((p) => (
                  <Link
                    key={p.id}
                    to={productHref(p.id)}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-2 text-base text-foreground/90 hover:bg-muted/50"
                  >
                    {p.label}
                  </Link>
                ))}
                <div className="my-2 border-t border-border" />
                <Link
                  to="/pricing"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 text-base text-foreground/90 hover:bg-muted/50"
                >
                  Pricing
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 text-base text-foreground/90 hover:bg-muted/50"
                >
                  Contact
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
