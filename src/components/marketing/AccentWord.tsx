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
  // Split into tokens, preserving whitespace as its own tokens so we can
  // keep word characters grouped (prevents mid-word line breaks).
  const tokens = text ? text.split(/(\s+)/) : null;

  let charIndex = 0;
  return (
    <span
      ref={ref}
      className={`text-accent font-medium ${className}`}
      style={{ display: "inline" }}
    >
      {tokens
        ? tokens.map((token, ti) => {
            if (/^\s+$/.test(token)) {
              // Render whitespace as a normal text node so the browser
              // can break lines between words.
              charIndex += token.length;
              return <span key={`s${ti}`}>{token}</span>;
            }
            const chars = Array.from(token);
            return (
              <span
                key={`w${ti}`}
                style={{ display: "inline-block", whiteSpace: "nowrap" }}
              >
                {chars.map((ch, i) => {
                  const idx = charIndex++;
                  return (
                    <span
                      key={i}
                      style={{
                        display: "inline-block",
                        opacity: inView ? 1 : 0,
                        transform: inView ? "translateY(0)" : "translateY(0.25em)",
                        transition: `opacity 380ms ease-out, transform 380ms ease-out`,
                        transitionDelay: `${delay + idx * stagger}ms`,
                      }}
                    >
                      {ch}
                    </span>
                  );
                })}
              </span>
            );
          })
        : children}
    </span>
  );
}

export default AccentWord;
