import { useState, useMemo } from "react";

/* ============================================================
   OneTrace visual library
   Linear-style: 1px strokes, monochrome, single accent,
   no in-canvas text. Every variant encodes a real product concept.
   ============================================================ */

type Variant =
  | "cascade"        // PRD → Epic → Story → AC → Test
  | "coverage"       // AC × Test matrix
  | "drift"          // requirements vs code fault line
  | "sync"           // Jira ↔ OneTrace ↔ GitHub
  | "funnel"         // context → prompt
  | "river"          // lineage as tributaries
  | "circuit"        // agent pipeline as circuit
  | "gauge"          // coverage %
  | "genome"         // requirement ↔ implementation helix
  | "overlay"        // drift overlay (ghost vs current)
  | "stack"          // version history
  | "constellation"; // workspaces & projects

const VARIANTS: { id: Variant; label: string; caption: string }[] = [
  { id: "cascade",       label: "Cascade",       caption: "From product brief to passing test." },
  { id: "coverage",      label: "Coverage",      caption: "Every requirement, accounted for." },
  { id: "drift",         label: "Drift",         caption: "Catch the gap before it ships." },
  { id: "sync",          label: "Sync",          caption: "Jira, GitHub, and truth — in lockstep." },
  { id: "funnel",        label: "Context",       caption: "The right context, compressed." },
  { id: "river",         label: "Lineage",       caption: "Trace any artifact to its source." },
  { id: "circuit",       label: "Agents",        caption: "Pipelines that build themselves." },
  { id: "gauge",         label: "Signal",        caption: "Coverage you can read at a glance." },
  { id: "genome",        label: "Genome",        caption: "Requirements paired to code, base by base." },
  { id: "overlay",       label: "Diff",          caption: "See what changed. See what broke." },
  { id: "stack",         label: "Versions",      caption: "Every artifact, every revision." },
  { id: "constellation", label: "Workspaces",    caption: "One graph per team. Many teams." },
];

/* ----------------------------- SHARED CHROME --------------------------- */

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

// Stroke palette
const STROKE = "hsl(var(--foreground))";
const ACCENT = "hsl(var(--accent))";
const BG = "hsl(var(--background))";

/* ------------------------- 1. CASCADE --------------------------------- */
const Cascade = () => {
  // 5 tiers: 1 PRD → 2 Epics → 4 Stories → 6 ACs → 8 Tests
  const tiers = [
    { y: 70,  nodes: [{ x: 200, satisfied: true }] },
    { y: 130, nodes: [{ x: 140 }, { x: 260 }] },
    { y: 195, nodes: [{ x: 90 }, { x: 170 }, { x: 230 }, { x: 310 }] },
    { y: 260, nodes: [{ x: 70 }, { x: 120 }, { x: 170 }, { x: 220, gap: true }, { x: 270 }, { x: 330 }] },
    { y: 325, nodes: [{ x: 60 }, { x: 105 }, { x: 150 }, { x: 195 }, { x: 240 }, { x: 285 }, { x: 330 }] },
  ];
  // edges between successive tiers (deterministic mapping)
  const edges: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[] = [];
  for (let t = 0; t < tiers.length - 1; t++) {
    const a = tiers[t], b = tiers[t + 1];
    b.nodes.forEach((nb, i) => {
      const parent = a.nodes[Math.floor((i / b.nodes.length) * a.nodes.length)];
      edges.push({ x1: parent.x, y1: a.y, x2: nb.x, y2: b.y, dashed: t === tiers.length - 2 });
    });
  }
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="cs-grid" /><Spot id="cs-spot" /><CornerMarks />
      <g stroke={STROKE} strokeOpacity="0.35" strokeWidth="0.75" fill="none">
        {edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            strokeDasharray={e.dashed ? "2 3" : undefined}
            strokeOpacity={e.dashed ? 0.22 : 0.35} />
        ))}
      </g>
      {tiers.map((tier, ti) =>
        tier.nodes.map((n: any, i) => {
          const r = ti === 0 ? 7 : ti === 1 ? 5.5 : ti === 2 ? 4.5 : ti === 3 ? 3.5 : 2.8;
          const filled = ti < 3 || (ti === 3 && !n.gap);
          return (
            <g key={`${ti}-${i}`}>
              {ti === 0 && (
                <rect x={n.x - r - 3} y={tier.y - r - 3} width={(r + 3) * 2} height={(r + 3) * 2}
                  fill="none" stroke={STROKE} strokeOpacity="0.4" strokeWidth="0.6" />
              )}
              <circle cx={n.x} cy={tier.y} r={r}
                fill={filled ? STROKE : BG}
                fillOpacity={filled ? 0.85 : 1}
                stroke={STROKE} strokeOpacity="0.85" strokeWidth="0.9" />
              {n.gap && (
                <circle cx={n.x} cy={tier.y} r={r + 3} fill="none" stroke={ACCENT} strokeWidth="0.8" strokeOpacity="0.7">
                  <animate attributeName="r" values={`${r + 2};${r + 6};${r + 2}`} dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })
      )}
      {/* descending trace pulse along central spine */}
      {[0, 2].map((d, i) => (
        <circle key={i} cx="200" r="2.2" fill={ACCENT}>
          <animate attributeName="cy" values="70;325" dur="4.5s" begin={`${d}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="4.5s" begin={`${d}s`} repeatCount="indefinite" />
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
    const set = new Set<string>();
    for (let i = 0; i < Math.round(cols * rows * 0.42); i++) {
      set.add(`${Math.floor(r() * cols)}-${Math.floor(r() * rows)}`);
    }
    return set;
  }, []);
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="cv-grid" /><Spot id="cv-spot" /><CornerMarks />
      {/* axis ticks (no labels) */}
      <g stroke={STROKE} strokeOpacity="0.4" strokeWidth="0.6">
        {Array.from({ length: cols }).map((_, i) => (
          <line key={`c${i}`} x1={x0 + i * cell + cell / 2} y1={y0 - 6} x2={x0 + i * cell + cell / 2} y2={y0 - 2} />
        ))}
        {Array.from({ length: rows }).map((_, i) => (
          <line key={`r${i}`} x1={x0 - 6} y1={y0 + i * cell + cell / 2} x2={x0 - 2} y2={y0 + i * cell + cell / 2} />
        ))}
      </g>
      {/* cells */}
      <g>
        {Array.from({ length: rows }).map((_, ry) =>
          Array.from({ length: cols }).map((_, cx) => {
            const isFilled = filled.has(`${cx}-${ry}`);
            return (
              <rect key={`${cx}-${ry}`}
                x={x0 + cx * cell + 1} y={y0 + ry * cell + 1}
                width={cell - 2} height={cell - 2}
                fill={isFilled ? STROKE : "none"}
                fillOpacity={isFilled ? 0.78 : 0}
                stroke={STROKE} strokeOpacity={isFilled ? 0 : 0.18} strokeWidth="0.5" />
            );
          })
        )}
      </g>
      {/* frame */}
      <rect x={x0} y={y0} width={w} height={h} fill="none" stroke={STROKE} strokeOpacity="0.6" strokeWidth="0.8" />
      {/* scan line */}
      <line x1={x0} y1={y0} x2={x0} y2={y0 + h} stroke={ACCENT} strokeWidth="1" strokeOpacity="0.7">
        <animate attributeName="x1" values={`${x0};${x0 + w};${x0}`} dur="6s" repeatCount="indefinite" />
        <animate attributeName="x2" values={`${x0};${x0 + w};${x0}`} dur="6s" repeatCount="indefinite" />
      </line>
      {/* current focus cell */}
      <BracketBox x={x0 + 5 * cell - 1} y={y0 + 7 * cell - 1} w={cell + 2} h={cell + 2} c={3} opacity={0.9} />
    </svg>
  );
};

/* ------------------------- 3. DRIFT FAULT ----------------------------- */
const Drift = () => {
  // upper strata = requirements, lower = code; hairline fault grows between
  const upperY = 130, lowerY = 270;
  const upperNodes = [70, 120, 170, 220, 270, 330];
  const lowerNodes = [60, 115, 175, 230, 285, 340];
  // links — one missing (drift), one mismatched
  const links: { i: number; j: number; kind: "ok" | "missing" | "mismatch" }[] = [
    { i: 0, j: 0, kind: "ok" },
    { i: 1, j: 1, kind: "ok" },
    { i: 2, j: 2, kind: "mismatch" },
    { i: 3, j: 3, kind: "missing" },
    { i: 4, j: 4, kind: "ok" },
    { i: 5, j: 5, kind: "ok" },
  ];
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="df-grid" /><Spot id="df-spot" /><CornerMarks />
      {/* strata rails */}
      <g stroke={STROKE} strokeOpacity="0.3" strokeWidth="0.75">
        <line x1="50" y1={upperY - 30} x2="350" y2={upperY - 30} />
        <line x1="50" y1={upperY + 30} x2="350" y2={upperY + 30} />
        <line x1="50" y1={lowerY - 30} x2="350" y2={lowerY - 30} />
        <line x1="50" y1={lowerY + 30} x2="350" y2={lowerY + 30} />
      </g>
      {/* the fault — jagged path through middle */}
      <path
        d="M 50 200 L 110 198 L 130 204 L 180 196 L 210 210 L 260 199 L 295 207 L 350 200"
        fill="none" stroke={STROKE} strokeOpacity="0.55" strokeWidth="0.75" strokeDasharray="3 2"
      />
      {/* drift marker on the fault */}
      <g transform="translate(220 203)">
        <circle r="8" fill="none" stroke={ACCENT} strokeOpacity="0.7" strokeWidth="0.8">
          <animate attributeName="r" values="6;14;6" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="2.6s" repeatCount="indefinite" />
        </circle>
        <circle r="2.2" fill={ACCENT} />
      </g>
      {/* connection lines */}
      <g>
        {links.map((l, i) => {
          const x1 = upperNodes[l.i], x2 = lowerNodes[l.j];
          const stroke = l.kind === "missing" ? ACCENT : STROKE;
          const op = l.kind === "missing" ? 0.7 : l.kind === "mismatch" ? 0.45 : 0.5;
          const dash = l.kind === "missing" ? "2 4" : l.kind === "mismatch" ? "1 2" : undefined;
          return (
            <line key={i}
              x1={x1} y1={upperY + 6} x2={x2} y2={lowerY - 6}
              stroke={stroke} strokeOpacity={op} strokeWidth="0.8"
              strokeDasharray={dash}
            />
          );
        })}
      </g>
      {/* upper nodes (requirements — filled squares) */}
      {upperNodes.map((x, i) => (
        <rect key={`u${i}`} x={x - 5} y={upperY - 5} width="10" height="10"
          fill={STROKE} fillOpacity="0.85" stroke={STROKE} strokeOpacity="0.9" strokeWidth="0.6" />
      ))}
      {/* lower nodes (code — open circles, the mismatched one is hollow) */}
      {lowerNodes.map((x, i) => (
        <circle key={`l${i}`} cx={x} cy={lowerY} r="5.5"
          fill={i === 3 ? "none" : STROKE}
          fillOpacity={i === 3 ? 0 : 0.85}
          stroke={STROKE} strokeOpacity="0.9" strokeWidth="0.6" />
      ))}
    </svg>
  );
};

/* ------------------------- 4. SYNC (Jira ↔ OT ↔ GH) ------------------- */
const Sync = () => {
  const cx = 200, cy = 200;
  const L = { x: 80, y: 200 };   // jira
  const R = { x: 320, y: 200 };  // github
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="sy-grid" /><Spot id="sy-spot" /><CornerMarks />
      {/* orbital rings */}
      <g fill="none" stroke={STROKE} strokeOpacity="0.18" strokeWidth="0.6">
        <ellipse cx={cx} cy={cy} rx="120" ry="38" />
        <ellipse cx={cx} cy={cy} rx="120" ry="38" transform={`rotate(35 ${cx} ${cy})`} />
        <ellipse cx={cx} cy={cy} rx="120" ry="38" transform={`rotate(-35 ${cx} ${cy})`} />
      </g>
      {/* connecting arcs */}
      <g fill="none" strokeWidth="0.9">
        <path d={`M ${L.x} ${L.y - 4} Q ${cx} ${cy - 60} ${R.x} ${R.y - 4}`} stroke={STROKE} strokeOpacity="0.5" />
        <path d={`M ${R.x} ${R.y + 4} Q ${cx} ${cy + 60} ${L.x} ${L.y + 4}`} stroke={STROKE} strokeOpacity="0.5" />
        {/* animated packets */}
        <circle r="2.5" fill={ACCENT}>
          <animateMotion dur="3.2s" repeatCount="indefinite"
            path={`M ${L.x} ${L.y - 4} Q ${cx} ${cy - 60} ${R.x} ${R.y - 4}`} />
        </circle>
        <circle r="2.5" fill={ACCENT}>
          <animateMotion dur="3.2s" begin="1.6s" repeatCount="indefinite"
            path={`M ${R.x} ${R.y + 4} Q ${cx} ${cy + 60} ${L.x} ${L.y + 4}`} />
        </circle>
      </g>
      {/* left node — Jira-ish stacked squares */}
      <g transform={`translate(${L.x} ${L.y})`}>
        <circle r="22" fill={BG} stroke={STROKE} strokeOpacity="0.7" strokeWidth="0.9" />
        <g stroke={STROKE} strokeOpacity="0.85" strokeWidth="0.9" fill="none">
          <rect x="-9" y="-9" width="8" height="8" />
          <rect x="1" y="-9" width="8" height="8" />
          <rect x="-9" y="1" width="8" height="8" />
          <rect x="1" y="1" width="8" height="8" fill={STROKE} fillOpacity="0.85" />
        </g>
      </g>
      {/* right node — GitHub-ish branch */}
      <g transform={`translate(${R.x} ${R.y})`}>
        <circle r="22" fill={BG} stroke={STROKE} strokeOpacity="0.7" strokeWidth="0.9" />
        <g stroke={STROKE} strokeOpacity="0.85" strokeWidth="1" fill="none" strokeLinecap="round">
          <line x1="-7" y1="-9" x2="-7" y2="9" />
          <line x1="7" y1="-9" x2="7" y2="2" />
          <path d="M -7 0 Q 0 0 7 0" />
          <circle cx="-7" cy="-9" r="2" fill={STROKE} />
          <circle cx="-7" cy="9" r="2" fill={STROKE} />
          <circle cx="7" cy="2" r="2" fill={STROKE} />
        </g>
      </g>
      {/* center — OneTrace mark */}
      <g transform={`translate(${cx} ${cy})`}>
        <rect x="-28" y="-28" width="56" height="56" rx="10"
          fill={BG} stroke={STROKE} strokeOpacity="0.85" strokeWidth="1.1" />
        <g stroke={STROKE} strokeOpacity="0.9" strokeWidth="4.5" strokeLinecap="square">
          <line x1="-22" y1="-6" x2="22" y2="-6 " />
          <line x1="-22" y1="6" x2="22" y2="6" />
        </g>
        <circle cx="18" cy="-18" r="2" fill={ACCENT}>
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
};

/* ------------------------- 5. CONTEXT FUNNEL -------------------------- */
const Funnel = () => {
  // top: scattered context fragments → narrow → single output line
  const frags = useMemo(() => {
    let s = 23;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 14 }).map(() => ({
      x: 80 + r() * 240, y: 60 + r() * 40, w: 14 + r() * 22,
    }));
  }, []);
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="fn-grid" /><Spot id="fn-spot" /><CornerMarks />
      {/* context fragments */}
      {frags.map((f, i) => (
        <g key={i}>
          <rect x={f.x} y={f.y} width={f.w} height="6" fill="none"
            stroke={STROKE} strokeOpacity="0.5" strokeWidth="0.6" />
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
      {/* compression hatch */}
      <g stroke={STROKE} strokeOpacity="0.2" strokeWidth="0.5">
        {Array.from({ length: 8 }).map((_, i) => {
          const t = i / 8;
          const y = 130 + t * 110;
          const xL = 70 + t * 110;
          const xR = 330 - t * 110;
          return <line key={i} x1={xL} y1={y} x2={xR} y2={y} />;
        })}
      </g>
      {/* falling tokens */}
      {[0, 1, 2].map((i) => (
        <circle key={i} r="1.8" fill={ACCENT}>
          <animateMotion dur="3s" begin={`${i * 0.7}s`} repeatCount="indefinite"
            path={`M ${120 + i * 80} 100 L 200 230`} />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="3s" begin={`${i * 0.7}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* output rail */}
      <g stroke={STROKE} strokeOpacity="0.6" strokeWidth="0.9" fill="none">
        <rect x="180" y="240" width="40" height="18" />
        <line x1="200" y1="258" x2="200" y2="300" strokeOpacity="0.5" />
        <rect x="120" y="300" width="160" height="48" rx="3" strokeOpacity="0.75" />
        {/* prompt lines inside */}
        <g stroke={STROKE} strokeOpacity="0.4" strokeWidth="0.6">
          <line x1="130" y1="312" x2="270" y2="312" />
          <line x1="130" y1="322" x2="250" y2="322" />
          <line x1="130" y1="332" x2="265" y2="332" />
        </g>
      </g>
      {/* receiver tick */}
      <circle cx="200" cy="324" r="2" fill={ACCENT}>
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};

/* ------------------------- 6. LINEAGE RIVER --------------------------- */
const River = () => {
  // tributaries converge left → split into delta on right
  const path = (d: string, op = 0.4, w = 0.8) => (
    <path d={d} fill="none" stroke={STROKE} strokeOpacity={op} strokeWidth={w} />
  );
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="rv-grid" /><Spot id="rv-spot" /><CornerMarks />
      {/* main spine */}
      {path("M 60 200 C 150 200 180 200 240 200", 0.6, 1)}
      {/* upstream tributaries (sources/PRD) */}
      {path("M 50 120 C 110 130 130 170 160 195")}
      {path("M 50 280 C 110 270 130 230 160 205")}
      {path("M 80 90 C 130 110 150 160 175 195")}
      {path("M 80 310 C 130 290 150 240 175 205")}
      {/* delta (epics → stories → tests) */}
      {path("M 240 200 C 290 180 320 150 360 130", 0.5)}
      {path("M 240 200 C 290 195 320 180 360 170", 0.5)}
      {path("M 240 200 C 290 205 320 220 360 230", 0.5)}
      {path("M 240 200 C 290 220 320 250 360 270", 0.5)}
      {path("M 240 200 C 290 235 320 285 360 320", 0.5)}
      {/* source markers */}
      <g fill={STROKE} fillOpacity="0.85">
        <circle cx="50" cy="120" r="3" />
        <circle cx="50" cy="280" r="3" />
        <circle cx="80" cy="90" r="3" />
        <circle cx="80" cy="310" r="3" />
      </g>
      {/* confluence node (PRD) */}
      <g>
        <circle cx="240" cy="200" r="9" fill={BG} stroke={STROKE} strokeOpacity="0.8" strokeWidth="1" />
        <circle cx="240" cy="200" r="4" fill={STROKE} fillOpacity="0.9" />
      </g>
      {/* delta endpoints (tests) */}
      {[{x:360,y:130},{x:360,y:170},{x:360,y:230},{x:360,y:270},{x:360,y:320}].map((p, i) => (
        <rect key={i} x={p.x - 3} y={p.y - 3} width="6" height="6"
          fill={i === 2 ? STROKE : "none"} fillOpacity="0.85"
          stroke={STROKE} strokeOpacity="0.8" strokeWidth="0.7" />
      ))}
      {/* flow particles */}
      {[0, 1.2, 2.4].map((d, i) => (
        <circle key={i} r="1.8" fill={ACCENT}>
          <animateMotion dur="4s" begin={`${d}s`} repeatCount="indefinite"
            path="M 60 200 C 150 200 180 200 240 200 C 290 220 320 250 360 270" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="4s" begin={`${d}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
};

/* ------------------------- 7. CIRCUIT / AGENTS ------------------------ */
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
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="ct-grid" /><Spot id="ct-spot" /><CornerMarks />
      {/* board traces */}
      <g fill="none" stroke={STROKE} strokeOpacity="0.4" strokeWidth="0.8">
        <path d="M 140 147 L 175 147" />
        <path d="M 225 147 L 260 147" />
        <path d="M 115 164 L 115 200 L 157 200 L 157 240" />
        <path d="M 200 164 L 200 200 L 245 200 L 245 240" />
        <path d="M 285 164 L 285 220 L 270 220 L 270 257 " />
        <path d="M 182 257 L 220 257" />
        <path d="M 245 274 L 245 310 L 200 310" />
      </g>
      {/* solder pads */}
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
      {/* chips */}
      {chips.map((c, i) => (
        <g key={i}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="2"
            fill={BG} stroke={STROKE} strokeOpacity="0.85" strokeWidth="0.9" />
          <circle cx={c.x + 5} cy={c.y + 5} r="1.4" fill="none"
            stroke={STROKE} strokeOpacity="0.6" strokeWidth="0.5" />
          {/* internal die */}
          <rect x={c.x + 10} y={c.y + 10} width={c.w - 20} height={c.h - 20}
            fill={STROKE} fillOpacity="0.06" stroke={STROKE} strokeOpacity="0.3" strokeWidth="0.5" />
          {/* status LED */}
          <circle cx={c.x + c.w - 6} cy={c.y + 6} r="2"
            fill={i <= 2 ? ACCENT : "none"}
            stroke={STROKE} strokeOpacity="0.7" strokeWidth="0.5">
            {i === 2 && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" />}
          </circle>
        </g>
      ))}
      {/* signal pulse moving along trace */}
      <circle r="2.2" fill={ACCENT}>
        <animateMotion dur="4s" repeatCount="indefinite"
          path="M 140 147 L 175 147 L 225 147 L 260 147 L 285 164 L 285 220 L 270 220 L 270 257 L 245 274 L 245 310 L 200 310" />
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur="4s" repeatCount="indefinite" />
      </circle>
      {/* input / output terminals */}
      <g stroke={STROKE} strokeOpacity="0.6" strokeWidth="0.8" fill="none">
        <circle cx="70" cy="147" r="4" /><line x1="74" y1="147" x2="90" y2="147" />
        <circle cx="200" cy="330" r="4" />
      </g>
    </svg>
  );
};

/* ------------------------- 8. COVERAGE GAUGE -------------------------- */
const Gauge = () => {
  const cx = 200, cy = 230, R = 130;
  const start = -Math.PI, end = 0;
  const pct = 0.74;
  const ang = start + (end - start) * pct;
  const px = cx + Math.cos(ang) * R;
  const py = cy + Math.sin(ang) * R;
  // tick marks
  const ticks = Array.from({ length: 41 }).map((_, i) => {
    const t = i / 40;
    const a = start + (end - start) * t;
    const major = i % 5 === 0;
    const r1 = R + 2, r2 = R + (major ? 12 : 7);
    return { x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1,
             x2: cx + Math.cos(a) * r2, y2: cy + Math.sin(a) * r2, major, active: t <= pct };
  });
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="gg-grid" /><Spot id="gg-spot" /><CornerMarks />
      {/* arc */}
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none" stroke={STROKE} strokeOpacity="0.35" strokeWidth="0.9" />
      {/* progress arc */}
      <path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${px} ${py}`}
        fill="none" stroke={STROKE} strokeOpacity="0.85" strokeWidth="1.4"
      />
      {/* ticks */}
      <g>
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={STROKE} strokeOpacity={t.active ? 0.8 : 0.3}
            strokeWidth={t.major ? 0.9 : 0.6} />
        ))}
      </g>
      {/* needle */}
      <g>
        <line x1={cx} y1={cy} x2={px} y2={py} stroke={STROKE} strokeOpacity="0.9" strokeWidth="1.2" />
        <circle cx={cx} cy={cy} r="6" fill={BG} stroke={STROKE} strokeOpacity="0.9" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="2" fill={STROKE} />
        <circle cx={px} cy={py} r="3" fill={ACCENT} />
      </g>
      {/* mini AC node ring */}
      <g>
        {Array.from({ length: 20 }).map((_, i) => {
          const a = start + (end - start) * (i / 19);
          const r = R + 26;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          const filled = (i / 19) <= pct;
          return <circle key={i} cx={x} cy={y} r="2"
            fill={filled ? STROKE : "none"} fillOpacity="0.85"
            stroke={STROKE} strokeOpacity="0.6" strokeWidth="0.6" />;
        })}
      </g>
      {/* baseline */}
      <line x1={cx - R - 30} y1={cy} x2={cx + R + 30} y2={cy}
        stroke={STROKE} strokeOpacity="0.25" strokeWidth="0.5" />
    </svg>
  );
};

/* ------------------------- 9. GENOME / HELIX -------------------------- */
const Genome = () => {
  const cy = 200, amp = 70, len = 280, x0 = 60;
  const N = 28;
  const sample = (t: number, phase: number) => ({
    x: x0 + t * len,
    y: cy + Math.sin(t * Math.PI * 4 + phase) * amp,
  });
  const pts1 = Array.from({ length: 80 }).map((_, i) => sample(i / 79, 0));
  const pts2 = Array.from({ length: 80 }).map((_, i) => sample(i / 79, Math.PI));
  const d = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="gn-grid" /><Spot id="gn-spot" /><CornerMarks />
      {/* base pairs */}
      <g stroke={STROKE} strokeOpacity="0.35" strokeWidth="0.7">
        {Array.from({ length: N }).map((_, i) => {
          const t = i / (N - 1);
          const a = sample(t, 0), b = sample(t, Math.PI);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>
      {/* strands */}
      <path d={d(pts1)} fill="none" stroke={STROKE} strokeOpacity="0.8" strokeWidth="1.1" />
      <path d={d(pts2)} fill="none" stroke={STROKE} strokeOpacity="0.8" strokeWidth="1.1" />
      {/* paired markers */}
      {Array.from({ length: N }).map((_, i) => {
        const t = i / (N - 1);
        const a = sample(t, 0), b = sample(t, Math.PI);
        const front = a.y < b.y;
        const A = front ? a : b, B = front ? b : a;
        return (
          <g key={i}>
            <circle cx={B.x} cy={B.y} r="2" fill={BG} stroke={STROKE} strokeOpacity="0.5" strokeWidth="0.6" />
            <circle cx={A.x} cy={A.y} r="2.5" fill={STROKE} fillOpacity="0.9" />
          </g>
        );
      })}
      {/* highlighted pair */}
      <g>
        {(() => {
          const t = 0.6;
          const a = sample(t, 0), b = sample(t, Math.PI);
          return (
            <>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ACCENT} strokeOpacity="0.9" strokeWidth="1.2" />
              <circle cx={a.x} cy={a.y} r="3" fill={ACCENT} />
              <circle cx={b.x} cy={b.y} r="3" fill={ACCENT} />
            </>
          );
        })()}
      </g>
    </svg>
  );
};

/* ------------------------- 10. DRIFT OVERLAY / DIFF ------------------- */
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
      {/* ghost (previous state) */}
      <g stroke={STROKE} strokeOpacity="0.22" strokeWidth="0.6" fill="none">
        {edgesA.map(([i, j], k) => (
          <line key={k} x1={b[i].x} y1={b[i].y} x2={b[j].x} y2={b[j].y} strokeDasharray="2 3" />
        ))}
        {b.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" />)}
      </g>
      {/* current state */}
      <g stroke={STROKE} strokeOpacity="0.55" strokeWidth="0.8" fill="none">
        {edgesA.map(([i, j], k) => (
          <line key={k} x1={a[i].x} y1={a[i].y} x2={a[j].x} y2={a[j].y} />
        ))}
      </g>
      {a.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={STROKE} fillOpacity="0.9"
          stroke={STROKE} strokeOpacity="0.9" strokeWidth="0.7" />
      ))}
      {/* missing edge in accent */}
      <line x1={a[2].x} y1={a[2].y} x2={a[6].x} y2={a[6].y}
        stroke={ACCENT} strokeOpacity="0.75" strokeWidth="0.9" strokeDasharray="2 4" />
      {/* orphan node */}
      <g>
        <circle cx={orphan.x} cy={orphan.y} r="4" fill="none"
          stroke={ACCENT} strokeOpacity="0.85" strokeWidth="1" />
        <circle cx={orphan.x} cy={orphan.y} r="9" fill="none"
          stroke={ACCENT} strokeOpacity="0.5" strokeWidth="0.6">
          <animate attributeName="r" values="7;14;7" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <BracketBox x={orphan.x - 16} y={orphan.y - 16} w={32} h={32} c={4} opacity={0.6} />
      </g>
      {/* diff sweep */}
      <line x1="50" y1="50" x2="50" y2="350" stroke={ACCENT} strokeOpacity="0.4" strokeWidth="0.6">
        <animate attributeName="x1" values="50;350;50" dur="7s" repeatCount="indefinite" />
        <animate attributeName="x2" values="50;350;50" dur="7s" repeatCount="indefinite" />
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
      {/* timeline rail on the left */}
      <g stroke={STROKE} strokeOpacity="0.4" strokeWidth="0.7">
        <line x1="70" y1="60" x2="70" y2="340" />
        {cards.map((i) => (
          <g key={i}>
            <line x1="66" y1={80 + i * 45} x2="74" y2={80 + i * 45} />
            <circle cx="70" cy={80 + i * 45} r={i === 0 ? 3 : 1.6} fill={i === 0 ? ACCENT : STROKE} fillOpacity={i === 0 ? 1 : 0.7} />
          </g>
        ))}
      </g>
      {/* stacked cards (perspective via offset & opacity) */}
      {cards.slice().reverse().map((i) => {
        const depth = i; // 0 = front
        const ox = 110 + depth * 8;
        const oy = 70 + depth * 8;
        const op = depth === 0 ? 1 : 0.85 - depth * 0.12;
        return (
          <g key={i}>
            <rect x={ox} y={oy} width="220" height="200" rx="4"
              fill={BG} stroke={STROKE} strokeOpacity={0.3 + (depth === 0 ? 0.5 : 0)} strokeWidth={depth === 0 ? 1.1 : 0.7}
              opacity={op} />
            {depth === 0 && (
              <g stroke={STROKE} strokeOpacity="0.45" strokeWidth="0.6">
                {/* header bar */}
                <line x1={ox + 14} y1={oy + 22} x2={ox + 140} y2={oy + 22} strokeOpacity="0.85" strokeWidth="1.4" />
                <line x1={ox + 14} y1={oy + 44} x2={ox + 200} y2={oy + 44} />
                <line x1={ox + 14} y1={oy + 58} x2={ox + 190} y2={oy + 58} />
                <line x1={ox + 14} y1={oy + 72} x2={ox + 170} y2={oy + 72} />
                {/* AC checklist */}
                <g>
                  {[0, 1, 2, 3].map((k) => (
                    <g key={k}>
                      <rect x={ox + 14} y={oy + 100 + k * 22} width="10" height="10"
                        fill={k < 3 ? STROKE : "none"} fillOpacity={k < 3 ? 0.85 : 0} />
                      <line x1={ox + 32} y1={oy + 105 + k * 22} x2={ox + 200} y2={oy + 105 + k * 22} />
                    </g>
                  ))}
                </g>
              </g>
            )}
          </g>
        );
      })}
      {/* current marker */}
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
      {/* orbit rings */}
      <g fill="none" stroke={STROKE} strokeOpacity="0.12" strokeWidth="0.5">
        <circle cx={center.x} cy={center.y} r="100" />
        <circle cx={center.x} cy={center.y} r="130" />
      </g>
      {/* spokes + project clusters */}
      {projects.map((p, pi) => {
        const px = center.x + Math.cos(p.angle) * p.r;
        const py = center.y + Math.sin(p.angle) * p.r;
        // mini cluster around (px,py)
        const cluster = Array.from({ length: p.nodes }).map((_, i) => {
          const a = (i / p.nodes) * Math.PI * 2;
          const rr = 14 + (i % 2) * 6;
          return { x: px + Math.cos(a) * rr, y: py + Math.sin(a) * rr };
        });
        return (
          <g key={pi}>
            <line x1={center.x} y1={center.y} x2={px} y2={py}
              stroke={STROKE} strokeOpacity="0.3" strokeWidth="0.6" />
            {/* cluster edges */}
            <g stroke={STROKE} strokeOpacity="0.35" strokeWidth="0.5">
              {cluster.map((c, i) => (
                <line key={i} x1={px} y1={py} x2={c.x} y2={c.y} />
              ))}
            </g>
            {/* cluster nodes */}
            {cluster.map((c, i) => (
              <circle key={i} cx={c.x} cy={c.y} r="1.8" fill={STROKE} fillOpacity="0.75" />
            ))}
            {/* project hub */}
            <circle cx={px} cy={py} r="5" fill={BG} stroke={STROKE} strokeOpacity="0.85" strokeWidth="0.9" />
            <circle cx={px} cy={py} r="2.3" fill={STROKE} fillOpacity="0.9" />
            {/* one active project pulse */}
            {pi === 2 && (
              <circle cx={px} cy={py} r="8" fill="none" stroke={ACCENT} strokeOpacity="0.7" strokeWidth="0.8">
                <animate attributeName="r" values="6;16;6" dur="2.8s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="2.8s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}
      {/* workspace core */}
      <g>
        <circle cx={center.x} cy={center.y} r="14" fill={BG} stroke={STROKE} strokeOpacity="0.9" strokeWidth="1.1" />
        <circle cx={center.x} cy={center.y} r="6" fill={STROKE} fillOpacity="0.9" />
        <circle cx={center.x} cy={center.y} r="22" fill="none" stroke={STROKE} strokeOpacity="0.25" strokeWidth="0.5" strokeDasharray="2 3" />
      </g>
    </svg>
  );
};

/* ----------------------------- SHOWCASE -------------------------------- */
const RENDERERS: Record<Variant, () => JSX.Element> = {
  cascade: Cascade,
  coverage: Coverage,
  drift: Drift,
  sync: Sync,
  funnel: Funnel,
  river: River,
  circuit: Circuit,
  gauge: Gauge,
  genome: Genome,
  overlay: Overlay,
  stack: Stack,
  constellation: Constellation,
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
        <div className="absolute inset-0">
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
