import { useRef, useState } from "react";

const WORD = "OneTrace";
const SUFFIX = ".ai";

/* ---------- Cursor spotlight reveal ---------- */
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

export function FooterWordmark() {
  return (
    <div className="mx-auto mt-16 max-w-[1400px] px-4 sm:px-6">
      <div className="overflow-hidden">
        <Spotlight />
      </div>
    </div>
  );
}

