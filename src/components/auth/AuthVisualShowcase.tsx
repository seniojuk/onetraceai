import { useState } from "react";

type Variant = "constellation" | "orbital" | "isometric" | "liquid" | "spotlight" | "gauge";

const VARIANTS: { id: Variant; label: string; caption: string }[] = [
  { id: "constellation", label: "Lineage", caption: "Every artifact, every link — alive." },
  { id: "orbital", label: "Orbit", caption: "Systems in motion. Always in sync." },
  { id: "isometric", label: "Layers", caption: "Scan the stack. Top to bottom." },
  { id: "liquid", label: "Flux", caption: "Continuous. Fluid. Traceable." },
  { id: "spotlight", label: "Focus", caption: "One source of truth, in focus." },
  { id: "gauge", label: "Signal", caption: "Precision. Measured continuously." },
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

/* ---------------------- 5. SPOTLIGHT (Linear-style) -------------------- */
const Spotlight = () => {
  // 5x5 grid of icon tiles; the center tile is "lit", neighbors fade with distance.
  const cols = 5;
  const rows = 5;
  const size = 56;
  const gap = 14;
  const totalW = cols * size + (cols - 1) * gap;
  const totalH = rows * size + (rows - 1) * gap;
  const offsetX = (400 - totalW) / 2;
  const offsetY = (400 - totalH) / 2;
  const cx = 2, cy = 2;

  // simple line-art glyphs
  const glyphs = [
    "M-8 -8 L8 -8 L8 8 L-8 8 Z",
    "M-8 0 L8 0 M0 -8 L0 8",
    "M-8 -6 L8 -6 M-8 0 L4 0 M-8 6 L8 6",
    "M-7 -7 L7 7 M7 -7 L-7 7",
    "M0 -8 A8 8 0 1 1 0 8 A8 8 0 1 1 0 -8 Z",
    "M-8 4 L-2 -4 L2 2 L8 -6",
    "M-7 -7 L7 -7 L0 7 Z",
    "M-7 -3 L0 -7 L7 -3 L7 5 L-7 5 Z",
  ];

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <defs>
        <radialGradient id="sp-spot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.18" />
          <stop offset="60%" stopColor="hsl(var(--foreground))" stopOpacity="0.04" />
          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sp-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.85" />
        </radialGradient>
      </defs>

      {/* spotlight glow behind grid */}
      <circle cx="200" cy="200" r="170" fill="url(#sp-spot)">
        <animate attributeName="r" values="160;185;160" dur="6s" repeatCount="indefinite" />
      </circle>

      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const dist = Math.hypot(c - cx, r - cy);
          const maxDist = Math.hypot(cx, cy);
          const t = dist / maxDist; // 0 center -> 1 edge
          const tileOpacity = Math.max(0.04, 0.45 * (1 - t));
          const glyphOpacity = Math.max(0.06, 0.55 * (1 - t));
          const x = offsetX + c * (size + gap);
          const y = offsetY + r * (size + gap);
          const isCenter = c === cx && r === cy;
          const glyph = glyphs[(r * cols + c) % glyphs.length];

          return (
            <g key={`${r}-${c}`}>
              <rect
                x={x} y={y} width={size} height={size} rx="12"
                fill="hsl(var(--foreground))"
                fillOpacity={isCenter ? 0 : tileOpacity * 0.15}
                stroke="hsl(var(--foreground))"
                strokeOpacity={isCenter ? 0 : tileOpacity}
                strokeWidth="1"
              />
              {isCenter && (
                <>
                  <rect
                    x={x} y={y} width={size} height={size} rx="12"
                    fill="url(#sp-core)"
                  />
                  <rect
                    x={x - 4} y={y - 4} width={size + 8} height={size + 8} rx="14"
                    fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.3" strokeWidth="1"
                  >
                    <animate attributeName="stroke-opacity" values="0.1;0.5;0.1" dur="3s" repeatCount="indefinite" />
                  </rect>
                </>
              )}
              <g transform={`translate(${x + size / 2} ${y + size / 2})`}>
                <path
                  d={glyph}
                  fill="none"
                  stroke={isCenter ? "hsl(var(--background))" : "hsl(var(--foreground))"}
                  strokeOpacity={isCenter ? 1 : glyphOpacity}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </g>
          );
        })
      )}
    </svg>
  );
};

/* ---------------------- 6. GAUGE (Linear-style) ------------------------ */
const Gauge = () => {
  // analog precision meter with sweeping needle and tick marks
  const cx = 200, cy = 230;
  const radius = 140;
  const startA = -210; // degrees
  const endA = 30;
  const totalA = endA - startA;
  const ticks = 41;

  const polar = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <defs>
        <radialGradient id="gg-spot" cx="50%" cy="60%" r="55%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.12" />
          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r="180" fill="url(#gg-spot)" />

      {/* arc */}
      {(() => {
        const p1 = polar(radius, startA);
        const p2 = polar(radius, endA);
        return (
          <path
            d={`M ${p1.x} ${p1.y} A ${radius} ${radius} 0 1 1 ${p2.x} ${p2.y}`}
            fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.18" strokeWidth="1"
          />
        );
      })()}

      {/* ticks */}
      {Array.from({ length: ticks }).map((_, i) => {
        const t = i / (ticks - 1);
        const a = startA + t * totalA;
        const major = i % 5 === 0;
        const inner = polar(radius - (major ? 16 : 8), a);
        const outer = polar(radius, a);
        return (
          <line
            key={i}
            x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke="hsl(var(--foreground))"
            strokeOpacity={major ? 0.6 : 0.25}
            strokeWidth={major ? 1.25 : 1}
          />
        );
      })}

      {/* major tick labels (monospace numerals via SVG text) */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const a = startA + t * totalA;
        const p = polar(radius - 30, a);
        return (
          <text
            key={i}
            x={p.x} y={p.y}
            fill="hsl(var(--foreground))"
            fillOpacity="0.5"
            fontSize="9"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {Math.round(t * 100)}
          </text>
        );
      })}

      {/* inner ring */}
      <circle cx={cx} cy={cy} r={radius - 50} fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.1" strokeDasharray="2 4" />

      {/* needle — sweeps then settles */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values={`${startA + 90} ${cx} ${cy}; ${startA + totalA * 0.78 + 90} ${cx} ${cy}; ${startA + totalA * 0.62 + 90} ${cx} ${cy}; ${startA + totalA * 0.72 + 90} ${cx} ${cy}; ${startA + 90} ${cx} ${cy}`}
          keyTimes="0; 0.35; 0.55; 0.75; 1"
          dur="7s"
          repeatCount="indefinite"
        />
        <line
          x1={cx} y1={cy}
          x2={cx} y2={cy - (radius - 18)}
          stroke="hsl(var(--accent))"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy - (radius - 18)} r="3" fill="hsl(var(--accent))" />
      </g>

      {/* hub */}
      <circle cx={cx} cy={cy} r="6" fill="hsl(var(--foreground))" />
      <circle cx={cx} cy={cy} r="10" fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.4" />

      {/* readout */}
      <text
        x={cx} y={cy + 50}
        fill="hsl(var(--foreground))"
        fillOpacity="0.85"
        fontSize="11"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        textAnchor="middle"
        letterSpacing="2"
      >
        COVERAGE
      </text>
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
