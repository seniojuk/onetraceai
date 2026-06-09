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
            <ol className="mt-4 space-y-2.5 border-l border-border pl-4">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="group flex items-baseline gap-2 text-[12.5px] leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground/60 group-hover:text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{s.label}</span>
                  </a>
                </li>
              ))}
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
