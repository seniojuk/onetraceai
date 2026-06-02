import { useEffect, useRef, useState, type ReactNode } from "react";

interface AccentWordProps {
  children: ReactNode;
  className?: string;
  /** Delay before the reveal starts (ms) */
  delay?: number;
  /** Per-character stagger (ms) */
  stagger?: number;
}

/**
 * AccentWord — teal-tinted emphasis word/phrase with an on-view
 * letter-by-letter write-on animation. Replaces the previous greyed
 * serif-italic accent treatment.
 */
export function AccentWord({
  children,
  className = "",
  delay = 0,
  stagger = 35,
}: AccentWordProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.4, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const text = typeof children === "string" ? children : "";
  const chars = text ? Array.from(text) : null;

  return (
    <span
      ref={ref}
      className={`inline text-accent font-medium ${className}`}
    >
      {chars
        ? chars.map((ch, i) => (
            <span
              key={i}
              aria-hidden={false}
              style={{
                display: "inline-block",
                whiteSpace: ch === " " ? "pre" : "normal",
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(0.25em)",
                transition: `opacity 380ms ease-out, transform 380ms ease-out`,
                transitionDelay: `${delay + i * stagger}ms`,
              }}
            >
              {ch}
            </span>
          ))
        : children}
    </span>
  );
}

export default AccentWord;
