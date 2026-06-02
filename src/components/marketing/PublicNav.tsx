import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/ThemeProvider";

const SECTIONS = [
  { id: "problem", label: "Problem" },
  { id: "solution", label: "Solution" },
  { id: "how", label: "How it works" },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { pathname, hash } = useLocation();
  const onHome = pathname === "/";

  // Scroll-aware shrink/elevate
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active section observer (only on home)
  useEffect(() => {
    if (!onHome) {
      setActiveSection(null);
      return;
    }
    const els = SECTIONS
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
  }, [onHome, hash]);

  const sectionLinkClass = (id: string) => {
    const active = onHome && activeSection === id;
    return `relative text-[13px] transition-colors ${
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    } after:absolute after:left-0 after:-bottom-1 after:h-px after:bg-foreground after:transition-all ${
      active ? "after:w-full" : "after:w-0 hover:after:w-full"
    }`;
  };

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
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-mono text-[11px] font-medium text-accent-foreground">
            OT
          </span>
          <span className="font-geist text-[15px] font-medium tracking-[-0.01em] text-foreground">
            OneTrace <span className="text-muted-foreground">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {SECTIONS.map((s) => (
            <Link key={s.id} to={`/#${s.id}`} className={sectionLinkClass(s.id)}>
              {s.label}
            </Link>
          ))}
          <Link to="/pricing" className={routeLinkClass(pathname === "/pricing")}>Pricing</Link>
          <Link to="/contact" className={routeLinkClass(pathname === "/contact")}>Contact</Link>
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
              <div className="mt-8 flex flex-col gap-4">
                <Link to="/#problem" onClick={() => setOpen(false)}>Problem</Link>
                <Link to="/#solution" onClick={() => setOpen(false)}>Solution</Link>
                <Link to="/#how" onClick={() => setOpen(false)}>How it works</Link>
                <Link to="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
                <Link to="/contact" onClick={() => setOpen(false)}>Contact</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
