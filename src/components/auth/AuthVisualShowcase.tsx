import { useState } from "react";

type Variant = "constellation" | "orbital" | "isometric" | "liquid";

const VARIANTS: { id: Variant; label: string; caption: string }[] = [
  { id: "constellation", label: "Lineage", caption: "Every artifact, every link — alive." },
  { id: "orbital", label: "Orbit", caption: "Systems in motion. Always in sync." },
  { id: "isometric", label: "Layers", caption: "Scan the stack. Top to bottom." },
  { id: "liquid", label: "Flux", caption: "Continuous. Fluid. Traceable." },
];

/* ----------------------- 1. CONSTELLATION / LINEAGE ----------------------- */
const Constellation = () => {
  // Nodes positioned as a small graph
  const nodes = [
    { x: 80, y: 90, r: 6, d: "0s" },
    { x: 200, y: 60, r: 8, d: "0.4s" },
    { x: 320, y: 110, r: 5, d: "0.8s" },
    { x: 140, y: 200, r: 7, d: "1.2s" },
    { x: 260, y: 220, r: 6, d: "1.6s" },
    { x: 380, y: 200, r: 9, d: "2.0s" },
    { x: 200, y: 320, r: 6, d: "2.4s" },
    { x: 330, y: 330, r: 7, d: "2.8s" },
  ];
  const edges = [
    [0, 1], [1, 2], [0, 3], [1, 4], [2, 5],
    [3, 4], [4, 5], [3, 6], [4, 6], [5, 7], [6, 7],
  ];

  return (
    <svg viewBox="0 0 460 400" className="h-full w-full">
      <defs>
        <radialGradient id="cn-node" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* edges */}
      {edges.map(([a, b], i) => {
        const A = nodes[a], B = nodes[b];
        return (
          <line
            key={i}
            x1={A.x} y1={A.y} x2={B.x} y2={B.y}
            stroke="hsl(var(--foreground))" strokeOpacity="0.12" strokeWidth="1"
          />
        );
      })}

      {/* animated beams along three edges */}
      {[0, 3, 8].map((idx, i) => {
        const [a, b] = edges[idx];
        const A = nodes[a], B = nodes[b];
        return (
          <circle key={`beam-${i}`} r="2.5" fill="hsl(var(--accent))">
            <animate
              attributeName="cx"
              values={`${A.x};${B.x};${A.x}`}
              dur={`${3 + i}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values={`${A.y};${B.y};${A.y}`}
              dur={`${3 + i}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur={`${3 + i}s`}
              repeatCount="indefinite"
            />
          </circle>
        );
      })}

      {/* nodes */}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r * 3} fill="url(#cn-node)" opacity="0.35">
            <animate
              attributeName="opacity"
              values="0.1;0.5;0.1"
              dur="3s"
              begin={n.d}
              repeatCount="indefinite"
            />
          </circle>
          <circle cx={n.x} cy={n.y} r={n.r} fill="hsl(var(--accent))" />
          <circle
            cx={n.x} cy={n.y} r={n.r}
            fill="none" stroke="hsl(var(--accent))" strokeOpacity="0.5"
          >
            <animate
              attributeName="r"
              values={`${n.r};${n.r + 14};${n.r}`}
              dur="3s"
              begin={n.d}
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-opacity"
              values="0.6;0;0.6"
              dur="3s"
              begin={n.d}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}
    </svg>
  );
};

/* ----------------------------- 2. ORBITAL ------------------------------ */
const Orbital = () => {
  const orbits = [
    { r: 60, dur: 12, count: 1, size: 4 },
    { r: 110, dur: 22, count: 2, size: 5 },
    { r: 160, dur: 34, count: 3, size: 3.5 },
  ];
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <defs>
        <radialGradient id="ob-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g transform="translate(200 200)">
        {/* core */}
        <circle r="36" fill="url(#ob-core)" />
        <circle r="10" fill="hsl(var(--accent))" />
        <circle r="14" fill="none" stroke="hsl(var(--accent))" strokeOpacity="0.4">
          <animate attributeName="r" values="10;30;10" dur="3s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* orbits */}
        {orbits.map((o, i) => (
          <g key={i}>
            <circle
              r={o.r}
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.1"
              strokeDasharray="2 4"
            />
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={i % 2 === 0 ? "0" : "360"}
                to={i % 2 === 0 ? "360" : "0"}
                dur={`${o.dur}s`}
                repeatCount="indefinite"
              />
              {Array.from({ length: o.count }).map((_, j) => {
                const angle = (j / o.count) * Math.PI * 2;
                const x = Math.cos(angle) * o.r;
                const y = Math.sin(angle) * o.r;
                return (
                  <g key={j}>
                    <circle cx={x} cy={y} r={o.size + 4} fill="hsl(var(--accent))" opacity="0.2" />
                    <circle cx={x} cy={y} r={o.size} fill="hsl(var(--accent))" />
                  </g>
                );
              })}
            </g>
          </g>
        ))}

        {/* data packet */}
        <circle r="3" fill="hsl(var(--accent))">
          <animateMotion dur="6s" repeatCount="indefinite"
            path="M 60 0 C 60 -40, 110 -40, 110 0 C 110 40, 160 40, 160 0" />
          <animate attributeName="opacity" values="0;1;1;0" dur="6s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
};

/* ---------------------------- 3. ISOMETRIC ----------------------------- */
const Isometric = () => {
  // Stacked isometric cards
  const layers = [0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <defs>
        <linearGradient id="iso-card" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.08" />
          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="iso-scan" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.7" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </linearGradient>
        <clipPath id="iso-clip">
          <polygon points="100,140 300,140 340,200 300,260 100,260 60,200" />
        </clipPath>
      </defs>

      <g>
        {layers.map((i) => {
          const offset = (i - 2) * 28;
          const points = [
            `200,${100 + offset}`,
            `320,${160 + offset}`,
            `200,${220 + offset}`,
            `80,${160 + offset}`,
          ].join(" ");
          return (
            <g key={i}>
              <polygon
                points={points}
                fill="url(#iso-card)"
                stroke="hsl(var(--accent))"
                strokeOpacity="0.25"
                strokeWidth="1"
              >
                <animate
                  attributeName="opacity"
                  values="0.5;1;0.5"
                  dur="4s"
                  begin={`${i * 0.3}s`}
                  repeatCount="indefinite"
                />
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0 -3; 0 3; 0 -3"
                  dur="6s"
                  begin={`${i * 0.4}s`}
                  repeatCount="indefinite"
                />
              </polygon>
              {/* small marker dot */}
              <circle cx="200" cy={160 + offset} r="2.5" fill="hsl(var(--accent))">
                <animate
                  attributeName="opacity"
                  values="0.2;1;0.2"
                  dur="3s"
                  begin={`${i * 0.5}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}

        {/* scan beam */}
        <g clipPath="url(#iso-clip)">
          <rect x="40" y="0" width="320" height="40" fill="url(#iso-scan)">
            <animate
              attributeName="y"
              values="20;320;20"
              dur="5s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
      </g>
    </svg>
  );
};

/* ------------------------------ 4. LIQUID ------------------------------ */
const Liquid = () => {
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <defs>
        <radialGradient id="lq-grad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.9" />
          <stop offset="60%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </radialGradient>
        <filter id="lq-turb" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3">
            <animate
              attributeName="baseFrequency"
              dur="18s"
              values="0.010 0.014;0.018 0.010;0.010 0.014"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="40" />
        </filter>
        <linearGradient id="lq-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      <g filter="url(#lq-turb)">
        <circle cx="200" cy="200" r="130" fill="url(#lq-grad)" />
        <circle cx="200" cy="200" r="90" fill="none" stroke="url(#lq-ring)" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="60" fill="none" stroke="url(#lq-ring)" strokeWidth="1" />
      </g>

      {/* crisp overlay ring */}
      <circle
        cx="200" cy="200" r="150"
        fill="none" stroke="hsl(var(--accent))" strokeOpacity="0.25" strokeWidth="1"
        strokeDasharray="4 6"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 200 200"
          to="360 200 200"
          dur="40s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="200" cy="200" r="4" fill="hsl(var(--accent))" />
    </svg>
  );
};

/* ----------------------------- SHOWCASE -------------------------------- */
export const AuthVisualShowcase = () => {
  const [active, setActive] = useState<Variant>("constellation");
  const current = VARIANTS.find((v) => v.id === active)!;

  return (
    <div className="flex h-full w-full flex-col justify-center gap-8 px-12 py-16">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          Traceability, visualized
        </span>
        <h2 className="mt-4 font-geist text-[28px] leading-[1.1] tracking-[-0.02em] text-foreground">
          {current.caption}
        </h2>
      </div>

      {/* canvas */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card">
        <div className="absolute inset-0">
          {active === "constellation" && <Constellation />}
          {active === "orbital" && <Orbital />}
          {active === "isometric" && <Isometric />}
          {active === "liquid" && <Liquid />}
        </div>
      </div>

      {/* toggle pills */}
      <div className="flex flex-wrap gap-2">
        {VARIANTS.map((v) => {
          const isActive = v.id === active;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setActive(v.id)}
              className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                isActive
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-accent/50 hover:text-foreground"
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AuthVisualShowcase;
