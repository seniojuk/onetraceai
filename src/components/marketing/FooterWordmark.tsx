import { useEffect, useLayoutEffect, useRef, useState } from "react";

const WORD = "OneTrace";
const SUFFIX = ".ai";

/* ---------- Cursor spotlight reveal ---------- */
function Spotlight() {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(120);
  const [pos, setPos] = useState({ x: -9999, y: -9999 });
  const [active, setActive] = useState(false);

  useLayoutEffect(() => {
    const fit = () => {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;
      const containerWidth = Math.max(container.clientWidth - 8, 0);
      const currentWidth = measure.getBoundingClientRect().width;
      if (currentWidth === 0) return;
      // scale font size just under the container width so italic glyph overhangs do not clip
      setFontSize((prev) => (prev * containerWidth) / currentWidth);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", fit);
    // re-fit after web fonts load
    if ((document as any).fonts?.ready) {
      (document as any).fonts.ready.then(fit);
    }
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => {
        const r = containerRef.current!.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="relative w-full select-none whitespace-nowrap font-display font-medium leading-[0.85] tracking-[-0.06em]"
      style={{ fontSize: `${fontSize}px` }}
    >
      {/* hidden measurement layer */}
      <span
        ref={measureRef}
        aria-hidden
        className="invisible whitespace-nowrap"
      >
        {WORD}
        <span className="font-serif italic">{SUFFIX}</span>
      </span>
      {/* base muted */}
      <span className="absolute inset-0 text-foreground/15">
        {WORD}
        <span className="font-serif italic">{SUFFIX}</span>
      </span>
      {/* spotlighted brand layer */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 text-primary transition-opacity duration-300"
        style={{
          opacity: active ? 1 : 0,
          WebkitMaskImage: `radial-gradient(220px circle at ${pos.x}px ${pos.y}px, black 0%, transparent 70%)`,
          maskImage: `radial-gradient(220px circle at ${pos.x}px ${pos.y}px, black 0%, transparent 70%)`,
        }}
      >
        {WORD}
        <span className="font-serif italic">{SUFFIX}</span>
      </span>
    </div>
  );
}

export function FooterWordmark() {
  return (
    <div className="mt-16 w-full">
      <div className="w-full overflow-visible">
        <Spotlight />
      </div>
    </div>
  );
}

