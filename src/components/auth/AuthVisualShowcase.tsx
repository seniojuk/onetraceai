import { useState, useMemo } from "react";

/* ============================================================
   OneTrace visual library
   Linear-style: 1px strokes, monochrome, single accent.
   Ambient motion: eased, layered, slow. No alert-pulses.
   Techniques used throughout:
     - stroke-dashoffset flow on connection paths
     - staggered particle trails (multiple, eased)
     - slow opacity "breathing" instead of expanding rings
     - keySplines easing on every animate
     - subtle parallax on background structures
   ============================================================ */

type Variant =
  | "cascade" | "coverage" | "drift" | "sync"
  | "funnel" | "river" | "circuit" | "gauge"
  | "genome" | "overlay" | "stack" | "constellation";

const VARIANTS: { id: Variant; label: string; caption: string }[] = [
  { id: "cascade",       label: "Cascade",     caption: "From product brief to passing test." },
  { id: "coverage",      label: "Coverage",    caption: "Every requirement, accounted for." },
  { id: "drift",         label: "Drift",       caption: "Catch the gap before it ships." },
  { id: "sync",          label: "Sync",        caption: "Jira, GitHub, and truth — in lockstep." },
  { id: "funnel",        label: "Context",     caption: "The right context, compressed." },
  { id: "river",         label: "Lineage",     caption: "Trace any artifact to its source." },
  { id: "circuit",       label: "Agents",      caption: "Pipelines that build themselves." },
  { id: "gauge",         label: "Signal",      caption: "Coverage you can read at a glance." },
  { id: "genome",        label: "Genome",      caption: "Requirements paired to code, base by base." },
  { id: "overlay",       label: "Diff",        caption: "See what changed. See what broke." },
  { id: "stack",         label: "Versions",    caption: "Every artifact, every revision." },
  { id: "constellation", label: "Workspaces",  caption: "One graph per team. Many teams." },
];

/* ----------------------------- SHARED CHROME --------------------------- */

const EASE = "0.4 0 0.2 1";        // Linear's standard ease
const EASE_OUT = "0.16 1 0.3 1";   // expressive ease-out
const SPLINES_3 = `${EASE_OUT};${EASE_OUT};${EASE_OUT}`;

const CornerMarks = () => (
  <g stroke="hsl(var(--foreground))" strokeOpacity="0.3" strokeWidth="0.75">
    {[[20, 20], [380, 20], [20, 380], [380, 380]].map(([x, y], i) => (
      <g key={i}>
        <line x1={x - 6} y1={y} x2={x + 6} y2={y} />
        <line x1={x} y1={y - 6} x2={x} y2={y + 6} />
      </g>
    ))}
  </g>
);

const GridBg = ({ id }: { id: string }) => (
  <>
    <defs>
      <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.035" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="400" height="400" fill={`url(#${id})`} />
  </>
);

const Spot = ({ id, opacity = 0.08 }: { id: string; opacity?: number }) => (
  <>
    <defs>
      <radialGradient id={id} cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={opacity} />
        <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="200" cy="200" r="180" fill={`url(#${id})`} />
  </>
);

const BracketBox = ({ x, y, w, h, c = 5, opacity = 0.7 }: { x: number; y: number; w: number; h: number; c?: number; opacity?: number }) => (
  <g stroke="hsl(var(--foreground))" strokeOpacity={opacity} strokeWidth="0.9" fill="none">
    <path d={`M ${x} ${y + c} L ${x} ${y} L ${x + c} ${y}`} />
    <path d={`M ${x + w - c} ${y} L ${x + w} ${y} L ${x + w} ${y + c}`} />
    <path d={`M ${x + w} ${y + h - c} L ${x + w} ${y + h} L ${x + w - c} ${y + h}`} />
    <path d={`M ${x + c} ${y + h} L ${x} ${y + h} L ${x} ${y + h - c}`} />
  </g>
);

/* Soft "breathing" opacity — replaces alert-style expanding rings */
const Breathe = ({ values = "0.4;0.9;0.4", dur = 4, begin = 0 }: { values?: string; dur?: number; begin?: number }) => (
  <animate
    attributeName="opacity"
    values={values}
    keyTimes="0;0.5;1"
    keySplines={`${EASE};${EASE}`}
    calcMode="spline"
    dur={`${dur}s`}
    begin={`${begin}s`}
    repeatCount="indefinite"
  />
);

const STROKE = "hsl(var(--foreground))";
const ACCENT = "hsl(var(--accent))";
const BG = "hsl(var(--background))";

/* ------------------------- 1. CASCADE --------------------------------- */
const Cascade = () => {
  const tiers = [
    { y: 70,  nodes: [{ x: 200, satisfied: true }] },
    { y: 130, nodes: [{ x: 140 }, { x: 260 }] },
    { y: 195, nodes: [{ x: 90 }, { x: 170 }, { x: 230 }, { x: 310 }] },
    { y: 260, nodes: [{ x: 70 }, { x: 120 }, { x: 170 }, { x: 220, gap: true }, { x: 270 }, { x: 330 }] },
    { y: 325, nodes: [{ x: 60 }, { x: 105 }, { x: 150 }, { x: 195 }, { x: 240 }, { x: 285 }, { x: 330 }] },
  ];
  const edges: { x1: number; y1: number; x2: number; y2: number; tier: number }[] = [];
  for (let t = 0; t < tiers.length - 1; t++) {
    const a = tiers[t], b = tiers[t + 1];
    b.nodes.forEach((nb, i) => {
      const parent = a.nodes[Math.floor((i / b.nodes.length) * a.nodes.length)];
      edges.push({ x1: parent.x, y1: a.y, x2: nb.x, y2: b.y, tier: t });
    });
  }
  // collect all node coords for staggered fade-in shimmer
  const allNodes = tiers.flatMap((t, ti) => t.nodes.map((n, ni) => ({ ...n, y: t.y, ti, ni })));

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="cs-grid" /><Spot id="cs-spot" /><CornerMarks />

      {/* edges — flowing dash from parent to child, eased loop */}
      <g fill="none" strokeWidth="0.75">
        {edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={STROKE} strokeOpacity="0.3"
            strokeDasharray="2 4">
            <animate attributeName="stroke-dashoffset"
              values="12;0" dur="6s"
              keyTimes="0;1" keySplines="0.65 0 0.35 1" calcMode="spline"
              repeatCount="indefinite" />
          </line>
        ))}
      </g>

      {/* nodes with cascading shimmer */}
      {allNodes.map((n: any, idx) => {
        const r = n.ti === 0 ? 7 : n.ti === 1 ? 5.5 : n.ti === 2 ? 4.5 : n.ti === 3 ? 3.5 : 2.8;
        const filled = n.ti < 3 || (n.ti === 3 && !n.gap);
        const delay = (n.ti * 0.4 + n.ni * 0.05) % 5;
        return (
          <g key={idx}>
            {n.ti === 0 && (
              <rect x={n.x - r - 3} y={n.y - r - 3} width={(r + 3) * 2} height={(r + 3) * 2}
                fill="none" stroke={STROKE} strokeOpacity="0.4" strokeWidth="0.6" />
            )}
            <circle cx={n.x} cy={n.y} r={r}
              fill={filled ? STROKE : BG}
              fillOpacity={filled ? 0.85 : 1}
              stroke={STROKE} strokeOpacity="0.85" strokeWidth="0.9">
              <animate attributeName="opacity"
                values="0.55;1;0.55" keyTimes="0;0.5;1"
                keySplines={`${EASE};${EASE}`} calcMode="spline"
                dur="5s" begin={`${delay}s`} repeatCount="indefinite" />
            </circle>
            {n.gap && (
              <circle cx={n.x} cy={n.y} r={r + 4}
                fill="none" stroke={ACCENT} strokeWidth="0.8" strokeOpacity="0.7"
                strokeDasharray="2 3">
                <animateTransform attributeName="transform" type="rotate"
                  from={`0 ${n.x} ${n.y}`} to={`360 ${n.x} ${n.y}`}
                  dur="14s" repeatCount="indefinite" />
                <Breathe values="0.3;0.8;0.3" dur={3.6} />
              </circle>
            )}
          </g>
        );
      })}

      {/* layered trace particles — 3 staggered down the spine */}
      {[0, 1.8, 3.6].map((d, i) => (
        <circle key={i} cx="200" r="2" fill={ACCENT}>
          <animate attributeName="cy"
            values="70;325" keyTimes="0;1"
            keySplines="0.5 0 0.5 1" calcMode="spline"
            dur="5.4s" begin={`${d}s`} repeatCount="indefinite" />
          <animate attributeName="opacity"
            values="0;1;1;0" keyTimes="0;0.12;0.88;1"
            dur="5.4s" begin={`${d}s`} repeatCount="indefinite" />
          <animate attributeName="r"
            values="1;2.2;1" keyTimes="0;0.5;1"
            dur="5.4s" begin={`${d}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
};

/* ------------------------- 2. COVERAGE MATRIX ------------------------- */
const Coverage = () => {
  const cols = 16, rows = 12;
  const cell = 18;
  const w = cols * cell, h = rows * cell;
  const x0 = (400 - w) / 2, y0 = (400 - h) / 2;
  const filled = useMemo(() => {
    let s = 11;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const list: { c: number; r: number; delay: number }[] = [];
    for (let i = 0; i < Math.round(cols * rows * 0.42); i++) {
      list.push({ c: Math.floor(r() * cols), r: Math.floor(r() * rows), delay: r() * 6 });
    }
    return list;
  }, []);
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="cv-grid" /><Spot id="cv-spot" /><CornerMarks />
      {/* axis ticks */}
      <g stroke={STROKE} strokeOpacity="0.4" strokeWidth="0.6">
        {Array.from({ length: cols }).map((_, i) => (
          <line key={`c${i}`} x1={x0 + i * cell + cell / 2} y1={y0 - 6} x2={x0 + i * cell + cell / 2} y2={y0 - 2} />
        ))}
        {Array.from({ length: rows }).map((_, i) => (
          <line key={`r${i}`} x1={x0 - 6} y1={y0 + i * cell + cell / 2} x2={x0 - 2} y2={y0 + i * cell + cell / 2} />
        ))}
      </g>
      {/* empty cells */}
      <g>
        {Array.from({ length: rows }).map((_, ry) =>
          Array.from({ length: cols }).map((_, cx) => (
            <rect key={`${cx}-${ry}`}
              x={x0 + cx * cell + 1} y={y0 + ry * cell + 1}
              width={cell - 2} height={cell - 2}
              fill="none" stroke={STROKE} strokeOpacity={0.14} strokeWidth="0.5" />
          ))
        )}
      </g>
      {/* filled cells — each shimmers on its own staggered cadence */}
      <g>
        {filled.map((f, i) => (
          <rect key={i}
            x={x0 + f.c * cell + 1} y={y0 + f.r * cell + 1}
            width={cell - 2} height={cell - 2}
            fill={STROKE} fillOpacity="0.78">
            <animate attributeName="fill-opacity"
              values="0.55;0.88;0.55" keyTimes="0;0.5;1"
              keySplines={`${EASE};${EASE}`} calcMode="spline"
              dur="6s" begin={`${f.delay}s`} repeatCount="indefinite" />
          </rect>
        ))}
      </g>
      {/* frame */}
      <rect x={x0} y={y0} width={w} height={h} fill="none" stroke={STROKE} strokeOpacity="0.6" strokeWidth="0.8" />

      {/* scan line — single direction, eased, fades at edges */}
      <g>
        <line x1={x0} y1={y0} x2={x0} y2={y0 + h} stroke={ACCENT} strokeWidth="1" strokeOpacity="0">
          <animate attributeName="x1"
            values={`${x0};${x0 + w}`} keyTimes="0;1"
            keySplines={`${EASE}`} calcMode="spline"
            dur="7s" repeatCount="indefinite" />
          <animate attributeName="x2"
            values={`${x0};${x0 + w}`} keyTimes="0;1"
            keySplines={`${EASE}`} calcMode="spline"
            dur="7s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity"
            values="0;0.7;0.7;0" keyTimes="0;0.1;0.9;1"
            dur="7s" repeatCount="indefinite" />
        </line>
        {/* trailing soft band */}
        <rect x={x0} y={y0} width="40" height={h} fill="url(#cv-trail)" opacity="0.5">
          <animate attributeName="x"
            values={`${x0 - 40};${x0 + w}`} keyTimes="0;1"
            keySplines={`${EASE}`} calcMode="spline"
            dur="7s" repeatCount="indefinite" />
        </rect>
        <defs>
          <linearGradient id="cv-trail" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0.18" />
          </linearGradient>
        </defs>
      </g>
      {/* focus bracket — soft breathe */}
      <g>
        <BracketBox x={x0 + 5 * cell - 1} y={y0 + 7 * cell - 1} w={cell + 2} h={cell + 2} c={3} opacity={0.9} />
      </g>
    </svg>
  );
};

/* ------------------------- 3. DRIFT FAULT ----------------------------- */
const Drift = () => {
  const upperY = 130, lowerY = 270;
  const upperNodes = [70, 120, 170, 220, 270, 330];
  const lowerNodes = [60, 115, 175, 230, 285, 340];
  const links: { i: number; j: number; kind: "ok" | "missing" | "mismatch" }[] = [
    { i: 0, j: 0, kind: "ok" }, { i: 1, j: 1, kind: "ok" },
    { i: 2, j: 2, kind: "mismatch" }, { i: 3, j: 3, kind: "missing" },
    { i: 4, j: 4, kind: "ok" }, { i: 5, j: 5, kind: "ok" },
  ];
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="df-grid" /><Spot id="df-spot" /><CornerMarks />
      {/* strata rails — subtle parallax breathe */}
      <g stroke={STROKE} strokeOpacity="0.3" strokeWidth="0.75">
        <line x1="50" y1={upperY - 30} x2="350" y2={upperY - 30} />
        <line x1="50" y1={upperY + 30} x2="350" y2={upperY + 30} />
        <line x1="50" y1={lowerY - 30} x2="350" y2={lowerY - 30} />
        <line x1="50" y1={lowerY + 30} x2="350" y2={lowerY + 30} />
      </g>

      {/* fault — flowing dash drift */}
      <path
        d="M 50 200 L 110 198 L 130 204 L 180 196 L 210 210 L 260 199 L 295 207 L 350 200"
        fill="none" stroke={STROKE} strokeOpacity="0.55" strokeWidth="0.75" strokeDasharray="3 2"
      >
        <animate attributeName="stroke-dashoffset"
          values="0;-20" dur="8s" repeatCount="indefinite" />
      </path>

      {/* drift marker — gentle breathing dot, no harsh ring */}
      <g transform="translate(220 203)">
        <circle r="2.2" fill={ACCENT}>
          <Breathe values="0.6;1;0.6" dur={2.8} />
        </circle>
        <circle r="6" fill="none" stroke={ACCENT} strokeOpacity="0.4" strokeWidth="0.6">
          <Breathe values="0.2;0.6;0.2" dur={2.8} begin={0.3} />
        </circle>
      </g>

      {/* OK links — flowing data dashes */}
      {links.map((l, i) => {
        const x1 = upperNodes[l.i], x2 = lowerNodes[l.j];
        if (l.kind === "ok") {
          return (
            <line key={i} x1={x1} y1={upperY + 6} x2={x2} y2={lowerY - 6}
              stroke={STROKE} strokeOpacity="0.5" strokeWidth="0.8"
              strokeDasharray="1 5">
              <animate attributeName="stroke-dashoffset"
                values="0;-30" dur={`${5 + i * 0.3}s`} repeatCount="indefinite" />
            </line>
          );
        }
        if (l.kind === "mismatch") {
          return (
            <line key={i} x1={x1} y1={upperY + 6} x2={x2} y2={lowerY - 6}
              stroke={STROKE} strokeOpacity="0.45" strokeWidth="0.8" strokeDasharray="1 2">
              <Breathe values="0.2;0.5;0.2" dur={3.2} />
            </line>
          );
        }
        // missing — accent dashed traveling
        return (
          <line key={i} x1={x1} y1={upperY + 6} x2={x2} y2={lowerY - 6}
            stroke={ACCENT} strokeOpacity="0.75" strokeWidth="0.9" strokeDasharray="2 4">
            <animate attributeName="stroke-dashoffset"
              values="0;-24" dur="3s" repeatCount="indefinite" />
          </line>
        );
      })}

      {/* upper nodes */}
      {upperNodes.map((x, i) => (
        <rect key={`u${i}`} x={x - 5} y={upperY - 5} width="10" height="10"
          fill={STROKE} fillOpacity="0.85" stroke={STROKE} strokeOpacity="0.9" strokeWidth="0.6">
          <Breathe values="0.7;1;0.7" dur={4 + (i % 3) * 0.5} begin={i * 0.3} />
        </rect>
      ))}
      {/* lower nodes */}
      {lowerNodes.map((x, i) => (
        <circle key={`l${i}`} cx={x} cy={lowerY} r="5.5"
          fill={i === 3 ? "none" : STROKE}
          fillOpacity={i === 3 ? 0 : 0.85}
          stroke={STROKE} strokeOpacity="0.9" strokeWidth="0.6">
          <Breathe values="0.7;1;0.7" dur={4 + (i % 3) * 0.5} begin={i * 0.3 + 0.2} />
        </circle>
      ))}
    </svg>
  );
};

/* ------------------------- 4. SYNC ------------------------------------ */
const Sync = () => {
  const cx = 200, cy = 200;
  const L = { x: 80, y: 200 }, R = { x: 320, y: 200 };
  const arcTop = `M ${L.x} ${L.y - 4} Q ${cx} ${cy - 60} ${R.x} ${R.y - 4}`;
  const arcBot = `M ${R.x} ${R.y + 4} Q ${cx} ${cy + 60} ${L.x} ${L.y + 4}`;
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="sy-grid" /><Spot id="sy-spot" /><CornerMarks />

      {/* orbital rings — slow rotation around the core */}
      <g fill="none" stroke={STROKE} strokeOpacity="0.18" strokeWidth="0.6">
        <g>
          <ellipse cx={cx} cy={cy} rx="120" ry="38" />
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
            dur="60s" repeatCount="indefinite" />
        </g>
        <g>
          <ellipse cx={cx} cy={cy} rx="120" ry="38" transform={`rotate(35 ${cx} ${cy})`} />
          <animateTransform attributeName="transform" type="rotate"
            from={`35 ${cx} ${cy}`} to={`395 ${cx} ${cy}`}
            dur="80s" repeatCount="indefinite" />
        </g>
        <g>
          <ellipse cx={cx} cy={cy} rx="120" ry="38" transform={`rotate(-35 ${cx} ${cy})`} />
          <animateTransform attributeName="transform" type="rotate"
            from={`-35 ${cx} ${cy}`} to={`-395 ${cx} ${cy}`}
            dur="90s" repeatCount="indefinite" />
        </g>
      </g>

      {/* arcs with flowing dash */}
      <g fill="none" strokeWidth="0.9">
        <path d={arcTop} stroke={STROKE} strokeOpacity="0.45" strokeDasharray="2 5">
          <animate attributeName="stroke-dashoffset" values="0;-21" dur="4s" repeatCount="indefinite" />
        </path>
        <path d={arcBot} stroke={STROKE} strokeOpacity="0.45" strokeDasharray="2 5">
          <animate attributeName="stroke-dashoffset" values="0;21" dur="4s" repeatCount="indefinite" />
        </path>

        {/* packets — two trails each direction, staggered */}
        {[0, 1.6].map((d, i) => (
          <circle key={`tt-${i}`} r="2.2" fill={ACCENT}>
            <animateMotion dur="3.6s" begin={`${d}s`} repeatCount="indefinite"
              keyPoints="0;1" keyTimes="0;1"
              keySplines="0.45 0 0.55 1" calcMode="spline"
              path={arcTop} />
            <animate attributeName="opacity" values="0;1;1;0"
              keyTimes="0;0.1;0.9;1" dur="3.6s" begin={`${d}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {[0.8, 2.4].map((d, i) => (
          <circle key={`tb-${i}`} r="2.2" fill={ACCENT}>
            <animateMotion dur="3.6s" begin={`${d}s`} repeatCount="indefinite"
              keyPoints="0;1" keyTimes="0;1"
              keySplines="0.45 0 0.55 1" calcMode="spline"
              path={arcBot} />
            <animate attributeName="opacity" values="0;1;1;0"
              keyTimes="0;0.1;0.9;1" dur="3.6s" begin={`${d}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </g>

      {/* Jira mark — official two-chevron "A" silhouette */}
      <g transform={`translate(${L.x} ${L.y})`}>
        <circle r="22" fill={BG} stroke={STROKE} strokeOpacity="0.7" strokeWidth="0.9" />
        <path
          transform="translate(-12 -12) scale(1)"
          fill={STROKE}
          fillOpacity="0.95"
          d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.001-1.005zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"
        >
          <animate attributeName="fill-opacity" values="0.7;1;0.7" dur="3.4s" repeatCount="indefinite" />
        </path>
      </g>
      {/* GitHub mark — Octocat silhouette */}
      <g transform={`translate(${R.x} ${R.y})`}>
        <circle r="22" fill={BG} stroke={STROKE} strokeOpacity="0.7" strokeWidth="0.9" />
        <path
          transform="translate(-12 -12) scale(0.024)"
          fill={STROKE}
          fillOpacity="0.95"
          d="M499.953 0C223.701 0 0 223.748 0 499.953c0 220.917 143.214 408.426 341.851 474.554 24.99 4.589 34.131-10.857 34.131-24.064 0-11.857-.428-43.297-.666-85.018-139.06 30.219-168.413-67.039-168.413-67.039-22.731-57.738-55.49-73.114-55.49-73.114-45.32-30.98 3.444-30.362 3.444-30.362 50.146 3.515 76.531 51.474 76.531 51.474 44.559 76.342 116.918 54.275 145.413 41.496 4.493-32.281 17.43-54.299 31.701-66.776-110.985-12.62-227.685-55.49-227.685-247.033 0-54.561 19.521-99.169 51.426-134.149-5.184-12.62-22.302-63.451 4.85-132.293 0 0 41.924-13.421 137.292 51.236 39.829-11.072 82.51-16.62 124.954-16.81 42.397.19 85.113 5.738 124.99 16.81 95.273-64.657 137.149-51.236 137.149-51.236 27.224 68.842 10.105 119.673 4.945 132.293 32.001 34.98 51.379 79.588 51.379 134.149 0 192.018-116.89 234.27-228.21 246.652 17.93 15.42 33.926 45.892 33.926 92.518 0 66.81-.619 120.681-.619 137.077 0 13.326 9.022 28.891 34.36 24.016C856.83 908.331 1000 720.846 1000 499.953 1000 223.748 776.275 0 499.953 0z"
        >
          <animate attributeName="fill-opacity" values="0.7;1;0.7" dur="3.4s" begin="1.2s" repeatCount="indefinite" />
        </path>
      </g>
      {/* center */}
      <g transform={`translate(${cx} ${cy})`}>
        <rect x="-28" y="-28" width="56" height="56" rx="10"
          fill={BG} stroke={STROKE} strokeOpacity="0.85" strokeWidth="1.1" />
        <g stroke={STROKE} strokeOpacity="0.9" strokeWidth="4.5" strokeLinecap="square">
          <line x1="-22" y1="-6" x2="22" y2="-6" />
          <line x1="-22" y1="6" x2="22" y2="6" />
        </g>
        <circle cx="18" cy="-18" r="2" fill={ACCENT}>
          <Breathe values="0.3;1;0.3" dur={2.4} />
        </circle>
      </g>
    </svg>
  );
};

/* ------------------------- 5. CONTEXT FUNNEL -------------------------- */
const Funnel = () => {
  const frags = useMemo(() => {
    let s = 23;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 14 }).map(() => ({
      x: 80 + r() * 240, y: 60 + r() * 40, w: 14 + r() * 22, delay: r() * 5,
    }));
  }, []);
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="fn-grid" /><Spot id="fn-spot" /><CornerMarks />

      {/* fragments — each glints on its own cadence */}
      {frags.map((f, i) => (
        <g key={i}>
          <rect x={f.x} y={f.y} width={f.w} height="6" fill="none"
            stroke={STROKE} strokeOpacity="0.5" strokeWidth="0.6">
            <Breathe values="0.25;0.65;0.25" dur={5 + (i % 4)} begin={f.delay} />
          </rect>
          <line x1={f.x + 2} y1={f.y + 3} x2={f.x + f.w - 2} y2={f.y + 3}
            stroke={STROKE} strokeOpacity="0.35" strokeWidth="0.5" />
        </g>
      ))}

      {/* funnel sides */}
      <g fill="none" stroke={STROKE} strokeOpacity="0.55" strokeWidth="0.9">
        <line x1="70" y1="130" x2="180" y2="240" />
        <line x1="330" y1="130" x2="220" y2="240" />
        <line x1="70" y1="130" x2="330" y2="130" />
      </g>

      {/* compression hatch — sequential reveal wave */}
      <g stroke={STROKE} strokeOpacity="0.22" strokeWidth="0.5">
        {Array.from({ length: 8 }).map((_, i) => {
          const t = i / 8;
          const y = 130 + t * 110;
          const xL = 70 + t * 110;
          const xR = 330 - t * 110;
          return (
            <line key={i} x1={xL} y1={y} x2={xR} y2={y}>
              <animate attributeName="stroke-opacity"
                values="0.1;0.4;0.1" keyTimes="0;0.5;1"
                keySplines={`${EASE};${EASE}`} calcMode="spline"
                dur="4s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            </line>
          );
        })}
      </g>

      {/* continuous falling tokens — 5 streams, eased */}
      {[
        { x: 110, d: 0 }, { x: 160, d: 0.6 }, { x: 200, d: 1.2 },
        { x: 240, d: 1.8 }, { x: 290, d: 2.4 },
      ].map((s, i) => (
        <circle key={i} r="1.6" fill={ACCENT}>
          <animateMotion dur="3.6s" begin={`${s.d}s`} repeatCount="indefinite"
            keyPoints="0;1" keyTimes="0;1"
            keySplines="0.5 0 0.6 1" calcMode="spline"
            path={`M ${s.x} 95 L 200 232`} />
          <animate attributeName="opacity" values="0;1;1;0"
            keyTimes="0;0.15;0.85;1" dur="3.6s" begin={`${s.d}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* output rail */}
      <g stroke={STROKE} strokeOpacity="0.6" strokeWidth="0.9" fill="none">
        <rect x="180" y="240" width="40" height="18" />
        <line x1="200" y1="258" x2="200" y2="300" strokeOpacity="0.5" />
        <rect x="120" y="300" width="160" height="48" rx="3" strokeOpacity="0.75" />
        <g stroke={STROKE} strokeOpacity="0.4" strokeWidth="0.6">
          <line x1="130" y1="312" x2="270" y2="312" />
          <line x1="130" y1="322" x2="250" y2="322" />
          <line x1="130" y1="332" x2="265" y2="332" />
        </g>
      </g>
      <circle cx="200" cy="324" r="2" fill={ACCENT}>
        <Breathe values="0.3;1;0.3" dur={2.2} />
      </circle>
    </svg>
  );
};

/* ------------------------- 6. LINEAGE RIVER --------------------------- */
const River = () => {
  const Path = ({ d, op = 0.4, w = 0.8, flow, dur = 7 }: { d: string; op?: number; w?: number; flow?: boolean; dur?: number }) => (
    <path d={d} fill="none" stroke={STROKE} strokeOpacity={op} strokeWidth={w}
      strokeDasharray={flow ? "1 6" : undefined}>
      {flow && <animate attributeName="stroke-dashoffset"
        values="0;-21" dur={`${dur}s`} repeatCount="indefinite" />}
    </path>
  );
  const deltaPaths = [
    "M 240 200 C 290 180 320 150 360 130",
    "M 240 200 C 290 195 320 180 360 170",
    "M 240 200 C 290 205 320 220 360 230",
    "M 240 200 C 290 220 320 250 360 270",
    "M 240 200 C 290 235 320 285 360 320",
  ];
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="rv-grid" /><Spot id="rv-spot" /><CornerMarks />

      {/* spine + tributaries — all flowing */}
      <Path d="M 60 200 C 150 200 180 200 240 200" op={0.6} w={1} flow dur={6} />
      <Path d="M 50 120 C 110 130 130 170 160 195" flow dur={8} />
      <Path d="M 50 280 C 110 270 130 230 160 205" flow dur={8} />
      <Path d="M 80 90 C 130 110 150 160 175 195" flow dur={9} />
      <Path d="M 80 310 C 130 290 150 240 175 205" flow dur={9} />
      {deltaPaths.map((d, i) => (
        <Path key={i} d={d} op={0.5} flow dur={7 + i * 0.4} />
      ))}

      {/* sources */}
      <g fill={STROKE} fillOpacity="0.85">
        {[[50,120],[50,280],[80,90],[80,310]].map(([x,y], i) => (
          <circle key={i} cx={x} cy={y} r="3">
            <Breathe values="0.55;0.95;0.55" dur={4 + i * 0.4} begin={i * 0.7} />
          </circle>
        ))}
      </g>

      {/* confluence */}
      <g>
        <circle cx="240" cy="200" r="9" fill={BG} stroke={STROKE} strokeOpacity="0.8" strokeWidth="1" />
        <circle cx="240" cy="200" r="4" fill={STROKE} fillOpacity="0.9">
          <Breathe values="0.7;1;0.7" dur={3.2} />
        </circle>
      </g>

      {/* endpoints */}
      {[{x:360,y:130},{x:360,y:170},{x:360,y:230},{x:360,y:270},{x:360,y:320}].map((p, i) => (
        <rect key={i} x={p.x - 3} y={p.y - 3} width="6" height="6"
          fill={i === 2 ? STROKE : "none"} fillOpacity="0.85"
          stroke={STROKE} strokeOpacity="0.8" strokeWidth="0.7" />
      ))}

      {/* multiple flow particles fanning into each delta arm */}
      {deltaPaths.map((d, i) => (
        <circle key={`fp-${i}`} r="1.6" fill={ACCENT}>
          <animateMotion dur="5s" begin={`${i * 0.5}s`} repeatCount="indefinite"
            keyPoints="0;1" keyTimes="0;1"
            keySplines="0.4 0 0.6 1" calcMode="spline"
            path={`M 60 200 C 150 200 180 200 240 200 ${d.replace("M 240 200", "")}`} />
          <animate attributeName="opacity" values="0;1;1;0"
            keyTimes="0;0.12;0.88;1" dur="5s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
};

/* ------------------------- 7. CIRCUIT --------------------------------- */
const Circuit = () => {
  const chips = [
    { x: 90,  y: 130, w: 50, h: 34 },
    { x: 175, y: 130, w: 50, h: 34 },
    { x: 260, y: 130, w: 50, h: 34 },
    { x: 132, y: 240, w: 50, h: 34 },
    { x: 220, y: 240, w: 50, h: 34 },
  ];
  const Pin = ({ x, y }: { x: number; y: number }) => (
    <rect x={x - 1} y={y - 1} width="2" height="2" fill={STROKE} fillOpacity="0.9" />
  );
  const traces = [
    "M 140 147 L 175 147",
    "M 225 147 L 260 147",
    "M 115 164 L 115 200 L 157 200 L 157 240",
    "M 200 164 L 200 200 L 245 200 L 245 240",
    "M 285 164 L 285 220 L 270 220 L 270 257",
    "M 182 257 L 220 257",
    "M 245 274 L 245 310 L 200 310",
  ];
  const masterPath = "M 140 147 L 175 147 L 225 147 L 260 147 L 285 164 L 285 220 L 270 220 L 270 257 L 245 274 L 245 310 L 200 310";
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="ct-grid" /><Spot id="ct-spot" /><CornerMarks />

      {/* board traces — each carries a slow dash flow */}
      <g fill="none" stroke={STROKE} strokeOpacity="0.4" strokeWidth="0.8" strokeDasharray="1 4">
        {traces.map((d, i) => (
          <path key={i} d={d}>
            <animate attributeName="stroke-dashoffset"
              values="0;-20" dur={`${6 + (i % 3)}s`} repeatCount="indefinite" />
          </path>
        ))}
      </g>

      <g>
        {chips.flatMap((c, ci) =>
          [-1, 1].flatMap((sy) =>
            Array.from({ length: 4 }).map((_, i) => (
              <Pin key={`${ci}-${sy}-${i}`}
                x={c.x + 8 + i * ((c.w - 16) / 3)}
                y={c.y + (sy === -1 ? 0 : c.h)} />
            ))
          )
        )}
      </g>

      {chips.map((c, i) => (
        <g key={i}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="2"
            fill={BG} stroke={STROKE} strokeOpacity="0.85" strokeWidth="0.9" />
          <circle cx={c.x + 5} cy={c.y + 5} r="1.4" fill="none"
            stroke={STROKE} strokeOpacity="0.6" strokeWidth="0.5" />
          <rect x={c.x + 10} y={c.y + 10} width={c.w - 20} height={c.h - 20}
            fill={STROKE} fillOpacity="0.06" stroke={STROKE} strokeOpacity="0.3" strokeWidth="0.5">
            <Breathe values="0.04;0.12;0.04" dur={4 + i * 0.3} begin={i * 0.5} />
          </rect>
          {/* LED — each chip its own heartbeat */}
          <circle cx={c.x + c.w - 6} cy={c.y + 6} r="2"
            fill={i <= 2 ? ACCENT : "none"}
            stroke={STROKE} strokeOpacity="0.7" strokeWidth="0.5">
            {i <= 2 && <Breathe values="0.4;1;0.4" dur={1.8 + i * 0.4} begin={i * 0.3} />}
          </circle>
        </g>
      ))}

      {/* signal pulses — 3 trailing particles along the master path */}
      {[0, 1.4, 2.8].map((d, i) => (
        <circle key={i} r="2" fill={ACCENT}>
          <animateMotion dur="5s" begin={`${d}s`} repeatCount="indefinite"
            keyPoints="0;1" keyTimes="0;1"
            keySplines="0.45 0 0.55 1" calcMode="spline"
            path={masterPath} />
          <animate attributeName="opacity" values="0;1;1;0"
            keyTimes="0;0.08;0.92;1" dur="5s" begin={`${d}s`} repeatCount="indefinite" />
        </circle>
      ))}

      <g stroke={STROKE} strokeOpacity="0.6" strokeWidth="0.8" fill="none">
        <circle cx="70" cy="147" r="4" /><line x1="74" y1="147" x2="90" y2="147" />
        <circle cx="200" cy="330" r="4">
          <Breathe values="0.55;1;0.55" dur={3} />
        </circle>
      </g>
    </svg>
  );
};

/* ------------------------- 8. GAUGE ----------------------------------- */
const Gauge = () => {
  const cx = 200, cy = 230, R = 130;
  const start = -Math.PI, end = 0;
  const ticks = Array.from({ length: 41 }).map((_, i) => {
    const t = i / 40;
    const a = start + (end - start) * t;
    const major = i % 5 === 0;
    const r1 = R + 2, r2 = R + (major ? 12 : 7);
    return { x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1,
             x2: cx + Math.cos(a) * r2, y2: cy + Math.sin(a) * r2, major, t };
  });
  // needle oscillates between 68% and 78% — looks like live data
  const lo = 0.68, hi = 0.78;
  const angAt = (p: number) => start + (end - start) * p;
  const ptAt = (p: number) => ({ x: cx + Math.cos(angAt(p)) * R, y: cy + Math.sin(angAt(p)) * R });
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="gg-grid" /><Spot id="gg-spot" /><CornerMarks />
      {/* full arc */}
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none" stroke={STROKE} strokeOpacity="0.35" strokeWidth="0.9" />
      {/* progress arc — animated stroke-dash */}
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none" stroke={STROKE} strokeOpacity="0.9" strokeWidth="1.4"
        pathLength="1" strokeDasharray="1 1">
        <animate attributeName="stroke-dashoffset"
          values={`${1 - lo};${1 - hi};${1 - lo}`}
          keyTimes="0;0.5;1"
          keySplines={`${EASE};${EASE}`} calcMode="spline"
          dur="6s" repeatCount="indefinite" />
      </path>
      {/* ticks — sequential subtle shimmer along the arc */}
      <g>
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={STROKE} strokeWidth={t.major ? 0.9 : 0.6} strokeOpacity="0.35">
            <animate attributeName="stroke-opacity"
              values="0.3;0.85;0.3" keyTimes="0;0.5;1"
              keySplines={`${EASE};${EASE}`} calcMode="spline"
              dur="3.6s" begin={`${(i / 40) * 3.6}s`} repeatCount="indefinite" />
          </line>
        ))}
      </g>
      {/* needle */}
      {(() => {
        const a = ptAt(lo), b = ptAt(hi);
        return (
          <g>
            <line x1={cx} y1={cy} x2={a.x} y2={a.y} stroke={STROKE} strokeOpacity="0.9" strokeWidth="1.2">
              <animate attributeName="x2"
                values={`${a.x};${b.x};${a.x}`}
                keyTimes="0;0.5;1"
                keySplines={`${EASE};${EASE}`} calcMode="spline"
                dur="6s" repeatCount="indefinite" />
              <animate attributeName="y2"
                values={`${a.y};${b.y};${a.y}`}
                keyTimes="0;0.5;1"
                keySplines={`${EASE};${EASE}`} calcMode="spline"
                dur="6s" repeatCount="indefinite" />
            </line>
            <circle cx={cx} cy={cy} r="6" fill={BG} stroke={STROKE} strokeOpacity="0.9" strokeWidth="1" />
            <circle cx={cx} cy={cy} r="2" fill={STROKE} />
            <circle r="3" fill={ACCENT}>
              <animate attributeName="cx"
                values={`${a.x};${b.x};${a.x}`}
                keyTimes="0;0.5;1"
                keySplines={`${EASE};${EASE}`} calcMode="spline"
                dur="6s" repeatCount="indefinite" />
              <animate attributeName="cy"
                values={`${a.y};${b.y};${a.y}`}
                keyTimes="0;0.5;1"
                keySplines={`${EASE};${EASE}`} calcMode="spline"
                dur="6s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      })()}
      {/* outer AC ring */}
      <g>
        {Array.from({ length: 20 }).map((_, i) => {
          const a = start + (end - start) * (i / 19);
          const r = R + 26;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          const filled = (i / 19) <= 0.73;
          return (
            <circle key={i} cx={x} cy={y} r="2"
              fill={filled ? STROKE : "none"} fillOpacity="0.85"
              stroke={STROKE} strokeOpacity="0.6" strokeWidth="0.6">
              {filled && <Breathe values="0.5;1;0.5" dur={4} begin={i * 0.15} />}
            </circle>
          );
        })}
      </g>
      <line x1={cx - R - 30} y1={cy} x2={cx + R + 30} y2={cy}
        stroke={STROKE} strokeOpacity="0.25" strokeWidth="0.5" />
    </svg>
  );
};

/* ------------------------- 9. GENOME ---------------------------------- */
const Genome = () => {
  const cy = 200, amp = 70, len = 280, x0 = 60;
  const N = 28;
  // Time-shifted helix: instead of rotating, advance phase to look like flowing helix
  const sample = (t: number, phase: number, shift = 0) => ({
    x: x0 + t * len,
    y: cy + Math.sin(t * Math.PI * 4 + phase + shift) * amp,
  });
  const buildPath = (phase: number) => {
    const pts = Array.from({ length: 80 }).map((_, i) => sample(i / 79, phase));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  };
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="gn-grid" /><Spot id="gn-spot" /><CornerMarks />

      {/* base pairs — wave of dimming along length */}
      <g stroke={STROKE} strokeOpacity="0.35" strokeWidth="0.7">
        {Array.from({ length: N }).map((_, i) => {
          const t = i / (N - 1);
          const a = sample(t, 0), b = sample(t, Math.PI);
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}>
              <animate attributeName="stroke-opacity"
                values="0.15;0.55;0.15" keyTimes="0;0.5;1"
                keySplines={`${EASE};${EASE}`} calcMode="spline"
                dur="4s" begin={`${(i / N) * 4}s`} repeatCount="indefinite" />
            </line>
          );
        })}
      </g>

      {/* strands */}
      <path d={buildPath(0)} fill="none" stroke={STROKE} strokeOpacity="0.8" strokeWidth="1.1" />
      <path d={buildPath(Math.PI)} fill="none" stroke={STROKE} strokeOpacity="0.8" strokeWidth="1.1" />

      {/* paired markers */}
      {Array.from({ length: N }).map((_, i) => {
        const t = i / (N - 1);
        const a = sample(t, 0), b = sample(t, Math.PI);
        const front = a.y < b.y;
        const A = front ? a : b, B = front ? b : a;
        return (
          <g key={i}>
            <circle cx={B.x} cy={B.y} r="2" fill={BG} stroke={STROKE} strokeOpacity="0.5" strokeWidth="0.6" />
            <circle cx={A.x} cy={A.y} r="2.5" fill={STROKE} fillOpacity="0.9">
              <Breathe values="0.6;1;0.6" dur={4} begin={(i / N) * 4} />
            </circle>
          </g>
        );
      })}

      {/* accent traveler — a single highlighted pair that walks the helix */}
      <g>
        <circle r="3" fill={ACCENT}>
          <animate attributeName="cx"
            values={Array.from({ length: 40 }).map((_, i) => sample(i / 39, 0).x.toFixed(1)).join(";")}
            dur="8s" repeatCount="indefinite" />
          <animate attributeName="cy"
            values={Array.from({ length: 40 }).map((_, i) => sample(i / 39, 0).y.toFixed(1)).join(";")}
            dur="8s" repeatCount="indefinite" />
        </circle>
        <circle r="3" fill={ACCENT}>
          <animate attributeName="cx"
            values={Array.from({ length: 40 }).map((_, i) => sample(i / 39, Math.PI).x.toFixed(1)).join(";")}
            dur="8s" repeatCount="indefinite" />
          <animate attributeName="cy"
            values={Array.from({ length: 40 }).map((_, i) => sample(i / 39, Math.PI).y.toFixed(1)).join(";")}
            dur="8s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
};

/* ------------------------- 10. DIFF OVERLAY --------------------------- */
const Overlay = () => {
  const a = [
    { x: 110, y: 140 }, { x: 175, y: 120 }, { x: 250, y: 145 },
    { x: 140, y: 220 }, { x: 215, y: 215 }, { x: 285, y: 230 },
    { x: 180, y: 295 }, { x: 250, y: 300 },
  ];
  const b = a.map((p, i) => ({ x: p.x + (i % 3 === 0 ? 12 : -6), y: p.y + (i % 2 === 0 ? -8 : 14) }));
  const edgesA: [number, number][] = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],[3,6],[4,6],[5,7],[6,7]];
  const orphan = { x: 320, y: 90 };
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="ov-grid" /><Spot id="ov-spot" /><CornerMarks />

      {/* ghost cross-fade between A and B */}
      <g>
        <g opacity="0">
          <g stroke={STROKE} strokeOpacity="0.45" strokeWidth="0.6" fill="none" strokeDasharray="2 3">
            {edgesA.map(([i, j], k) => (
              <line key={k} x1={b[i].x} y1={b[i].y} x2={b[j].x} y2={b[j].y} />
            ))}
          </g>
          {b.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="none" stroke={STROKE} strokeOpacity="0.5" strokeWidth="0.6" />
          ))}
          <animate attributeName="opacity"
            values="0.4;0.05;0.4" keyTimes="0;0.5;1"
            keySplines={`${EASE};${EASE}`} calcMode="spline"
            dur="6s" repeatCount="indefinite" />
        </g>
      </g>

      {/* current state */}
      <g stroke={STROKE} strokeOpacity="0.55" strokeWidth="0.8" fill="none">
        {edgesA.map(([i, j], k) => (
          <line key={k} x1={a[i].x} y1={a[i].y} x2={a[j].x} y2={a[j].y} />
        ))}
      </g>
      {a.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={STROKE} fillOpacity="0.9"
          stroke={STROKE} strokeOpacity="0.9" strokeWidth="0.7">
          <Breathe values="0.7;1;0.7" dur={4 + (i % 3) * 0.4} begin={i * 0.25} />
        </circle>
      ))}

      {/* missing edge in accent — flowing dash */}
      <line x1={a[2].x} y1={a[2].y} x2={a[6].x} y2={a[6].y}
        stroke={ACCENT} strokeOpacity="0.75" strokeWidth="0.9" strokeDasharray="2 4">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="3.6s" repeatCount="indefinite" />
      </line>

      {/* orphan node — soft pulse + bracket */}
      <g>
        <circle cx={orphan.x} cy={orphan.y} r="4" fill="none"
          stroke={ACCENT} strokeOpacity="0.85" strokeWidth="1">
          <Breathe values="0.55;1;0.55" dur={3} />
        </circle>
        <circle cx={orphan.x} cy={orphan.y} r="9" fill="none"
          stroke={ACCENT} strokeOpacity="0.5" strokeWidth="0.6">
          <Breathe values="0.15;0.5;0.15" dur={3} begin={0.4} />
        </circle>
        <BracketBox x={orphan.x - 16} y={orphan.y - 16} w={32} h={32} c={4} opacity={0.6} />
      </g>

      {/* diff sweep — eased, with soft trailing band */}
      <defs>
        <linearGradient id="ov-trail" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <rect y="50" width="50" height="300" fill="url(#ov-trail)">
        <animate attributeName="x"
          values="0;350" keyTimes="0;1"
          keySplines={`${EASE_OUT}`} calcMode="spline"
          dur="7s" repeatCount="indefinite" />
        <animate attributeName="opacity"
          values="0;1;1;0" keyTimes="0;0.1;0.9;1"
          dur="7s" repeatCount="indefinite" />
      </rect>
      <line y1="50" y2="350" stroke={ACCENT} strokeWidth="0.6" strokeOpacity="0.5">
        <animate attributeName="x1"
          values="50;400" keyTimes="0;1"
          keySplines={`${EASE_OUT}`} calcMode="spline"
          dur="7s" repeatCount="indefinite" />
        <animate attributeName="x2"
          values="50;400" keyTimes="0;1"
          keySplines={`${EASE_OUT}`} calcMode="spline"
          dur="7s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity"
          values="0;0.6;0.6;0" keyTimes="0;0.1;0.9;1"
          dur="7s" repeatCount="indefinite" />
      </line>
    </svg>
  );
};

/* ------------------------- 11. VERSION STACK -------------------------- */
const Stack = () => {
  const cards = Array.from({ length: 6 }).map((_, i) => i);
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="st-grid" /><Spot id="st-spot" /><CornerMarks />

      {/* timeline rail with traveling marker */}
      <g stroke={STROKE} strokeOpacity="0.4" strokeWidth="0.7">
        <line x1="70" y1="60" x2="70" y2="340" />
        {cards.map((i) => (
          <g key={i}>
            <line x1="66" y1={80 + i * 45} x2="74" y2={80 + i * 45} />
            <circle cx="70" cy={80 + i * 45} r={i === 0 ? 3 : 1.6}
              fill={i === 0 ? ACCENT : STROKE} fillOpacity={i === 0 ? 1 : 0.7}>
              {i === 0 && <Breathe values="0.6;1;0.6" dur={2.6} />}
            </circle>
          </g>
        ))}
        {/* traveling tick down the rail */}
        <circle cx="70" r="2.4" fill={ACCENT} opacity="0.7">
          <animate attributeName="cy"
            values="80;305" keyTimes="0;1"
            keySplines={`${EASE_OUT}`} calcMode="spline"
            dur="6s" repeatCount="indefinite" />
          <animate attributeName="opacity"
            values="0;0.7;0.7;0" keyTimes="0;0.1;0.9;1"
            dur="6s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* stacked cards with subtle parallax breathing */}
      {cards.slice().reverse().map((i) => {
        const depth = i;
        const ox = 110 + depth * 8;
        const oy = 70 + depth * 8;
        const op = depth === 0 ? 1 : 0.85 - depth * 0.12;
        return (
          <g key={i}>
            <g>
              <rect x={ox} y={oy} width="220" height="200" rx="4"
                fill={BG} stroke={STROKE} strokeOpacity={0.3 + (depth === 0 ? 0.5 : 0)} strokeWidth={depth === 0 ? 1.1 : 0.7}
                opacity={op} />
              {depth !== 0 && (
                <animateTransform attributeName="transform" type="translate"
                  values={`0 0;0 ${-depth * 0.6};0 0`}
                  keyTimes="0;0.5;1"
                  keySplines={`${EASE};${EASE}`} calcMode="spline"
                  dur={`${6 + depth * 0.4}s`} repeatCount="indefinite" />
              )}
            </g>
            {depth === 0 && (
              <g stroke={STROKE} strokeOpacity="0.45" strokeWidth="0.6">
                <line x1={ox + 14} y1={oy + 22} x2={ox + 140} y2={oy + 22} strokeOpacity="0.85" strokeWidth="1.4" />
                <line x1={ox + 14} y1={oy + 44} x2={ox + 200} y2={oy + 44} />
                <line x1={ox + 14} y1={oy + 58} x2={ox + 190} y2={oy + 58} />
                <line x1={ox + 14} y1={oy + 72} x2={ox + 170} y2={oy + 72} />
                <g>
                  {[0, 1, 2, 3].map((k) => (
                    <g key={k}>
                      <rect x={ox + 14} y={oy + 100 + k * 22} width="10" height="10"
                        fill={k < 3 ? STROKE : "none"} fillOpacity={k < 3 ? 0.85 : 0}>
                        {k < 3 && <Breathe values="0.6;1;0.6" dur={3.5} begin={k * 0.5} />}
                      </rect>
                      <line x1={ox + 32} y1={oy + 105 + k * 22} x2={ox + 200} y2={oy + 105 + k * 22} />
                    </g>
                  ))}
                </g>
              </g>
            )}
          </g>
        );
      })}
      <BracketBox x={108} y={68} w={224} h={204} c={6} opacity={0.8} />
    </svg>
  );
};

/* ------------------------- 12. CONSTELLATION -------------------------- */
const Constellation = () => {
  const center = { x: 200, y: 200 };
  const projects = [
    { angle: -Math.PI / 2, r: 110, nodes: 7 },
    { angle: -Math.PI / 6, r: 130, nodes: 5 },
    { angle:  Math.PI / 4, r: 100, nodes: 9 },
    { angle:  Math.PI * 0.75, r: 125, nodes: 6 },
    { angle: -Math.PI * 0.85, r: 105, nodes: 4 },
  ];
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="co-grid" /><Spot id="co-spot" /><CornerMarks />

      {/* orbit rings — slow counter-rotation */}
      <g fill="none" stroke={STROKE} strokeOpacity="0.12" strokeWidth="0.5">
        <g>
          <circle cx={center.x} cy={center.y} r="100" strokeDasharray="2 6" />
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${center.x} ${center.y}`} to={`360 ${center.x} ${center.y}`}
            dur="80s" repeatCount="indefinite" />
        </g>
        <g>
          <circle cx={center.x} cy={center.y} r="130" strokeDasharray="2 6" />
          <animateTransform attributeName="transform" type="rotate"
            from={`360 ${center.x} ${center.y}`} to={`0 ${center.x} ${center.y}`}
            dur="120s" repeatCount="indefinite" />
        </g>
      </g>

      {projects.map((p, pi) => {
        const px = center.x + Math.cos(p.angle) * p.r;
        const py = center.y + Math.sin(p.angle) * p.r;
        const cluster = Array.from({ length: p.nodes }).map((_, i) => {
          const a = (i / p.nodes) * Math.PI * 2;
          const rr = 14 + (i % 2) * 6;
          return { x: px + Math.cos(a) * rr, y: py + Math.sin(a) * rr };
        });
        return (
          <g key={pi}>
            {/* spoke — flowing dash */}
            <line x1={center.x} y1={center.y} x2={px} y2={py}
              stroke={STROKE} strokeOpacity="0.3" strokeWidth="0.6" strokeDasharray="1 4">
              <animate attributeName="stroke-dashoffset"
                values="0;-15" dur={`${6 + pi}s`} repeatCount="indefinite" />
            </line>
            {/* cluster edges */}
            <g stroke={STROKE} strokeOpacity="0.35" strokeWidth="0.5">
              {cluster.map((c, i) => (
                <line key={i} x1={px} y1={py} x2={c.x} y2={c.y} />
              ))}
            </g>
            {/* cluster nodes — staggered twinkle */}
            {cluster.map((c, i) => (
              <circle key={i} cx={c.x} cy={c.y} r="1.8" fill={STROKE} fillOpacity="0.75">
                <Breathe values="0.4;0.95;0.4" dur={3.6 + (i % 4) * 0.4} begin={(pi * 0.4 + i * 0.18) % 4} />
              </circle>
            ))}
            {/* project hub */}
            <circle cx={px} cy={py} r="5" fill={BG} stroke={STROKE} strokeOpacity="0.85" strokeWidth="0.9" />
            <circle cx={px} cy={py} r="2.3" fill={STROKE} fillOpacity="0.9">
              <Breathe values="0.7;1;0.7" dur={3.4} begin={pi * 0.4} />
            </circle>
            {pi === 2 && (
              <circle cx={px} cy={py} r="8" fill="none" stroke={ACCENT} strokeOpacity="0.7" strokeWidth="0.8">
                <Breathe values="0.25;0.7;0.25" dur={3.2} />
              </circle>
            )}
          </g>
        );
      })}

      {/* workspace core */}
      <g>
        <circle cx={center.x} cy={center.y} r="14" fill={BG} stroke={STROKE} strokeOpacity="0.9" strokeWidth="1.1" />
        <circle cx={center.x} cy={center.y} r="6" fill={STROKE} fillOpacity="0.9">
          <Breathe values="0.75;1;0.75" dur={3} />
        </circle>
        <g>
          <circle cx={center.x} cy={center.y} r="22" fill="none" stroke={STROKE} strokeOpacity="0.25" strokeWidth="0.5" strokeDasharray="2 3" />
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${center.x} ${center.y}`} to={`360 ${center.x} ${center.y}`}
            dur="40s" repeatCount="indefinite" />
        </g>
      </g>
    </svg>
  );
};

/* ----------------------------- SHOWCASE -------------------------------- */
export const RENDERERS: Record<Variant, () => JSX.Element> = {
  cascade: Cascade, coverage: Coverage, drift: Drift, sync: Sync,
  funnel: Funnel, river: River, circuit: Circuit, gauge: Gauge,
  genome: Genome, overlay: Overlay, stack: Stack, constellation: Constellation,
};
export { VARIANTS };
export type { Variant };

/* Single-variant renderer for use outside the picker (e.g. auth page). */
export const AuthVisualSingle = ({
  variant,
  eyebrow,
  headline,
  subline,
}: {
  variant: Variant;
  eyebrow?: string;
  headline?: string;
  subline?: string;
}) => {
  const meta = VARIANTS.find((v) => v.id === variant)!;
  const Render = RENDERERS[variant];
  return (
    <div className="flex h-full w-full flex-col justify-center gap-8 px-12 py-16">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card">
        <div className="absolute inset-0 animate-fade-in">
          <Render />
        </div>
      </div>
      <div>
        <h2 className="font-geist text-[28px] leading-[1.1] tracking-[-0.02em] text-foreground">
          {headline ?? meta.caption}
        </h2>
        {subline && (
          <p className="mt-3 max-w-[34ch] font-geist text-[14px] leading-[1.5] text-muted-foreground">
            {subline}
          </p>
        )}
      </div>
    </div>
  );
};




export const AuthVisualShowcase = () => {
  const [active, setActive] = useState<Variant>("cascade");
  const current = VARIANTS.find((v) => v.id === active)!;
  const Render = RENDERERS[active];

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

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card">
        <div key={active} className="absolute inset-0 animate-fade-in">
          <Render />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {VARIANTS.map((v) => {
          const isActive = v.id === active;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setActive(v.id)}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
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
