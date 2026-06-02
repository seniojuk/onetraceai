import { useEffect, useRef, useState } from "react";

type Variant = "letter-lift" | "spotlight" | "marquee" | "scramble";

const VARIANTS: { id: Variant; label: string }[] = [
  { id: "letter-lift", label: "Letter lift" },
  { id: "spotlight", label: "Spotlight" },
  { id: "marquee", label: "Marquee" },
  { id: "scramble", label: "Scramble" },
];

const WORD = "OneTrace";
const SUFFIX = ".ai";

/* ---------- Variant 1: per-letter hover lift ---------- */
function LetterLift() {
  return (
    <div className="select-none whitespace-nowrap font-geist text-[clamp(80px,18vw,260px)] font-medium leading-[0.85] tracking-[-0.06em] text-foreground/90">
      {WORD.split("").map((ch, i) => (
        <span
          key={i}
          className="inline-block transition-all duration-300 ease-out hover:-translate-y-[0.12em] hover:italic hover:text-primary"
          style={{ transitionDelay: `${i * 10}ms` }}
        >
          {ch}
        </span>
      ))}
      <span className="font-serif italic text-foreground/40">{SUFFIX}</span>
    </div>
  );
}

/* ---------- Variant 2: cursor spotlight reveal ---------- */
function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -9999, y: -9999 });
  const [active, setActive] = useState(false);

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="relative select-none whitespace-nowrap font-geist text-[clamp(80px,18vw,260px)] font-medium leading-[0.85] tracking-[-0.06em]"
    >
      {/* base muted */}
      <span className="text-foreground/15">
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

/* ---------- Variant 3: marquee loop ---------- */
function Marquee() {
  const phrase = "OneTrace.ai — Traceability for AI-built software — ";
  return (
    <div className="group relative overflow-hidden">
      <div className="flex w-max animate-[footer-marquee_28s_linear_infinite] whitespace-nowrap font-geist text-[clamp(80px,18vw,260px)] font-medium leading-[0.85] tracking-[-0.06em] text-foreground/90 group-hover:[animation-play-state:paused]">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="pr-[0.3em]">
            {phrase.replace(".ai", "")}
            <span className="font-serif italic text-foreground/40">.ai</span>
            {" — "}
          </span>
        ))}
      </div>
      <style>{`@keyframes footer-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}

/* ---------- Variant 4: scramble on view + hover ---------- */
const GLYPHS = "!<>-_\\/[]{}—=+*^?#________";
function Scramble() {
  const target = WORD + SUFFIX;
  const [text, setText] = useState(target);
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const run = () => {
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const reveal = Math.floor(p * target.length);
      let out = "";
      for (let i = 0; i < target.length; i++) {
        if (i < reveal) out += target[i];
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setText(out);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setText(target);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.3 }
    );
    io.observe(ref.current);
    return () => {
      io.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Split rendering so .ai stays styled
  const head = text.slice(0, WORD.length);
  const tail = text.slice(WORD.length);

  return (
    <div
      ref={ref}
      onMouseEnter={run}
      className="select-none whitespace-nowrap font-geist text-[clamp(80px,18vw,260px)] font-medium leading-[0.85] tracking-[-0.06em] text-foreground/90"
    >
      <span>{head}</span>
      <span className="font-serif italic text-foreground/40">{tail}</span>
    </div>
  );
}

export function FooterWordmark() {
  const [variant, setVariant] = useState<Variant>("letter-lift");

  return (
    <div className="mx-auto mt-16 max-w-[1400px] px-4 sm:px-6">
      {/* Variant toggle */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Wordmark FX
        </span>
        <div className="flex flex-wrap gap-1">
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setVariant(v.id)}
              className={`rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                variant === v.id
                  ? "border-foreground/40 bg-foreground/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden">
        {variant === "letter-lift" && <LetterLift />}
        {variant === "spotlight" && <Spotlight />}
        {variant === "marquee" && <Marquee />}
        {variant === "scramble" && <Scramble />}
      </div>
    </div>
  );
}
