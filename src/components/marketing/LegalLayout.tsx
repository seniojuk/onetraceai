import { useEffect, useRef, useState } from "react";
import { PublicNav } from "./PublicNav";
import { PublicFooter } from "./PublicFooter";
import { AccentWord } from "@/components/marketing/AccentWord";

interface LegalLayoutProps {
  eyebrow: string;
  title: string;
  flourish?: string;
  updated: string;
  sections: { id: string; label: string }[];
  children: React.ReactNode;
}

export function LegalLayout({ eyebrow, title, flourish, updated, sections, children }: LegalLayoutProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [bar, setBar] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 0,
    opacity: 0,
  });

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        setVisibleIds((prev) => {
          const next = new Set(prev);
          entries.forEach((e) => {
            if (e.isIntersecting) next.add(e.target.id);
            else next.delete(e.target.id);
          });
          return next;
        });
      },
      { rootMargin: "0px 0px 0px 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      setBar((b) => ({ ...b, opacity: 0 }));
      return;
    }
    const visibleSections = sections.filter((s) => visibleIds.has(s.id));
    if (!visibleSections.length) {
      setBar((b) => ({ ...b, opacity: 0 }));
      return;
    }
    const firstEl = itemRefs.current[visibleSections[0].id];
    const lastEl = itemRefs.current[visibleSections[visibleSections.length - 1].id];
    if (!firstEl || !lastEl) return;
    const listRect = list.getBoundingClientRect();
    const firstRect = firstEl.getBoundingClientRect();
    const lastRect = lastEl.getBoundingClientRect();
    setBar({
      top: firstRect.top - listRect.top,
      height: lastRect.bottom - firstRect.top,
      opacity: 1,
    });
  }, [visibleIds, sections]);


  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-accent/20">
      <PublicNav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-8 sm:px-6 sm:pt-20 sm:pb-12">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          {eyebrow}
        </span>
        <h1 className="mt-4 max-w-3xl font-display text-[36px] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[52px] md:text-[64px]">
          {title}{" "}
          {flourish && <AccentWord>{flourish}</AccentWord>}
        </h1>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Last updated · {updated}
        </p>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
          {/* TOC */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Contents
            </div>
            <ol ref={listRef} className="relative mt-4 space-y-2.5 border-l border-border pl-4">
              <span
                aria-hidden
                className="pointer-events-none absolute left-[-1px] w-[2px] rounded-full bg-accent"
                style={{
                  top: bar.top,
                  height: bar.height,
                  opacity: bar.opacity,
                  transition:
                    "top 400ms cubic-bezier(0.22, 1, 0.36, 1), height 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out",
                }}
              />
              {sections.map((s, i) => {
                const active = visibleIds.has(s.id);
                return (
                  <li
                    key={s.id}
                    ref={(el) => {
                      itemRefs.current[s.id] = el;
                    }}
                  >
                    <a
                      href={`#${s.id}`}
                      className={`group flex items-baseline gap-2 text-[12.5px] leading-relaxed transition-colors hover:text-foreground ${
                        active ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`font-mono text-[10px] transition-colors ${
                          active ? "text-accent" : "text-muted-foreground/60 group-hover:text-accent"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{s.label}</span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </aside>

          {/* Content */}
          <article className="legal-prose max-w-2xl">
            {children}
          </article>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

/* Section helpers */
export function LegalSection({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-10 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] tracking-[0.18em] text-accent">
          {String(index).padStart(2, "0")}
        </span>
        <h2 className="font-display text-[22px] font-medium tracking-[-0.01em] text-foreground sm:text-[26px]">
          {title}
        </h2>
      </div>
      <div className="mt-5 space-y-4 text-[14px] leading-[1.75] text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function LegalSubheading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 font-display text-[15px] font-medium tracking-[-0.01em] text-foreground">
      {children}
    </h3>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[14px] leading-[1.7] text-muted-foreground">
          <span className="mt-[10px] h-[3px] w-[3px] shrink-0 rounded-full bg-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalCallout({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 rounded-xl border border-border bg-muted/30 p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 text-[13.5px] leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}
