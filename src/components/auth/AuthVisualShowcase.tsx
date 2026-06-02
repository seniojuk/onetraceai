import { useState, useMemo } from "react";

type Variant = "blueprint" | "pointcloud" | "mesh" | "schematic";

const VARIANTS: { id: Variant; label: string; caption: string }[] = [
  { id: "blueprint", label: "Specimen", caption: "Engineered to spec. Down to the pixel." },
  { id: "pointcloud", label: "Lineage", caption: "A million data points. One source of truth." },
  { id: "mesh", label: "Graph", caption: "Every artifact, connected. Always." },
  { id: "schematic", label: "Pipeline", caption: "Idea to release. One unbroken thread." },
];

/* ----------------------------- SHARED CHROME --------------------------- */

const CornerMarks = () => (
  <g stroke="hsl(var(--foreground))" strokeOpacity="0.35" strokeWidth="0.75">
    {[[20, 20], [380, 20], [20, 380], [380, 380]].map(([x, y], i) => (
      <g key={i}>
        <line x1={x - 6} y1={y} x2={x + 6} y2={y} />
        <line x1={x} y1={y - 6} x2={x} y2={y + 6} />
      </g>
    ))}
  </g>
);

const GridBg = ({ id = "gd-grid" }: { id?: string }) => (
  <>
    <defs>
      <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.035" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="400" height="400" fill={`url(#${id})`} />
  </>
);

const Spot = ({ id, cx = 200, cy = 200, r = "55%", opacity = 0.1 }: { id: string; cx?: number; cy?: number; r?: string; opacity?: number }) => (
  <>
    <defs>
      <radialGradient id={id} cx="50%" cy="50%" r={r}>
        <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={opacity} />
        <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx={cx} cy={cy} r="180" fill={`url(#${id})`} />
  </>
);

const MonoLabel = ({
  x, y, children, size = 7, opacity = 0.5, anchor = "middle", spacing = 1.5,
}: {
  x: number; y: number; children: React.ReactNode;
  size?: number; opacity?: number; anchor?: "start" | "middle" | "end"; spacing?: number;
}) => (
  <text
    x={x} y={y}
    fill="hsl(var(--foreground))" fillOpacity={opacity}
    fontSize={size} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
    textAnchor={anchor} dominantBaseline="middle" letterSpacing={spacing}
  >
    {children}
  </text>
);

// Tag = bracketed corner label like Linear uses ([ TEMP ])
const Tag = ({ x, y, children, w = 44 }: { x: number; y: number; children: React.ReactNode; w?: number }) => (
  <g>
    <rect x={x} y={y} width={w} height={14} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeOpacity="0.35" strokeWidth="0.75" />
    <MonoLabel x={x + w / 2} y={y + 7} size={7} opacity={0.7} spacing={1.2}>
      {children}
    </MonoLabel>
  </g>
);

// Dimension line with arrows on both ends and a centered label
const Dim = ({
  x1, y1, x2, y2, label, side = "above", offset = 10,
}: {
  x1: number; y1: number; x2: number; y2: number; label: string;
  side?: "above" | "below" | "left" | "right"; offset?: number;
}) => {
  const horiz = y1 === y2;
  const a = horiz
    ? { x1, y1: y1 + (side === "below" ? offset : -offset), x2, y2: y2 + (side === "below" ? offset : -offset) }
    : { x1: x1 + (side === "right" ? offset : -offset), y1, x2: x2 + (side === "right" ? offset : -offset), y2 };
  const lx = horiz ? (a.x1 + a.x2) / 2 : a.x1 + (side === "right" ? 4 : -4);
  const ly = horiz ? a.y1 + (side === "below" ? 8 : -4) : (a.y1 + a.y2) / 2;
  const tick = 4;
  return (
    <g stroke="hsl(var(--foreground))" strokeOpacity="0.4" strokeWidth="0.75" fill="none">
      {/* extension lines */}
      {horiz ? (
        <>
          <line x1={x1} y1={y1} x2={a.x1} y2={a.y1} />
          <line x1={x2} y1={y2} x2={a.x2} y2={a.y2} />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1} x2={a.x1} y2={a.y1} />
          <line x1={x2} y1={y2} x2={a.x2} y2={a.y2} />
        </>
      )}
      <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} />
      {/* end ticks */}
      {horiz ? (
        <>
          <line x1={a.x1} y1={a.y1 - tick / 2} x2={a.x1} y2={a.y1 + tick / 2} />
          <line x1={a.x2} y1={a.y2 - tick / 2} x2={a.x2} y2={a.y2 + tick / 2} />
        </>
      ) : (
        <>
          <line x1={a.x1 - tick / 2} y1={a.y1} x2={a.x1 + tick / 2} y2={a.y1} />
          <line x1={a.x2 - tick / 2} y1={a.y2} x2={a.x2 + tick / 2} y2={a.y2} />
        </>
      )}
      <MonoLabel x={lx} y={ly} size={7} opacity={0.7} anchor={horiz ? "middle" : side === "right" ? "start" : "end"}>
        {label}
      </MonoLabel>
    </g>
  );
};

/* ----------------------- 1. BLUEPRINT (specimen) ----------------------- */
const Blueprint = () => {
  // OneTrace mark sized at 138 × 138, centered on a precision grid with full dimension annotations.
  const size = 138;
  const cx = 200, cy = 200;
  const x = cx - size / 2;
  const y = cy - size / 2;

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="bp-grid" />
      <Spot id="bp-spot" opacity={0.07} />
      <CornerMarks />

      {/* header tags */}
      <Tag x={28} y={28} w={66}>SPEC.OT-001</Tag>
      <Tag x={306} y={28} w={66}>SCALE 1:1</Tag>

      {/* ID coordinates strip */}
      <MonoLabel x={200} y={48} size={7} opacity={0.45} spacing={2}>
        ID 235.215.235 — REV.04
      </MonoLabel>

      {/* construction guides through center */}
      <g stroke="hsl(var(--foreground))" strokeOpacity="0.12" strokeWidth="0.5" strokeDasharray="2 3">
        <line x1={cx} y1={70} x2={cx} y2={330} />
        <line x1={70} y1={cy} x2={330} y2={cy} />
      </g>

      {/* 45° guide */}
      <line
        x1={cx - size / 2} y1={cy - size / 2}
        x2={cx + size / 2} y2={cy + size / 2}
        stroke="hsl(var(--foreground))" strokeOpacity="0.18" strokeWidth="0.5" strokeDasharray="1 2"
      />

      {/* the mark — geometric "trace" glyph: rounded square + three diagonal traces */}
      <g>
        {/* shell */}
        <rect
          x={x} y={y} width={size} height={size} rx="22"
          fill="hsl(var(--background))"
          stroke="hsl(var(--foreground))" strokeOpacity="0.7" strokeWidth="1.25"
        />
        {/* fill subtle */}
        <rect x={x} y={y} width={size} height={size} rx="22" fill="hsl(var(--foreground))" fillOpacity="0.04" />
        {/* three diagonal trace bars, clipped to the rounded square */}
        <defs>
          <clipPath id="bp-clip">
            <rect x={x} y={y} width={size} height={size} rx="22" />
          </clipPath>
        </defs>
        <g clipPath="url(#bp-clip)" stroke="hsl(var(--foreground))" strokeOpacity="0.9" strokeWidth="11" strokeLinecap="square">
          <line x1={x - 10} y1={y + 50} x2={x + size + 10} y2={y + 50 - size} />
          <line x1={x - 10} y1={y + 90} x2={x + size + 10} y2={y + 90 - size} />
          <line x1={x - 10} y1={y + 130} x2={x + size + 10} y2={y + 130 - size} />
        </g>
        {/* a single accent tick */}
        <circle cx={x + size - 14} cy={y + 14} r="2.5" fill="hsl(var(--accent))">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* dimensions */}
      <Dim x1={x} y1={y} x2={x + size} y2={y} side="above" offset={22} label={`${size}px`} />
      <Dim x1={x + size} y1={y} x2={x + size} y2={y + size} side="right" offset={22} label={`${size}px`} />

      {/* corner radius callout */}
      <g>
        <line x1={x + 22} y1={y + 22} x2={x - 18} y2={y - 18}
          stroke="hsl(var(--foreground))" strokeOpacity="0.5" strokeWidth="0.75" />
        <circle cx={x + 22} cy={y + 22} r="2" fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.6" />
        <Tag x={x - 60} y={y - 26} w={42}>R 22</Tag>
      </g>

      {/* angle callout 45° */}
      <g transform={`translate(${cx} ${cy})`}>
        <path d="M 18 0 A 18 18 0 0 0 12.7 12.7"
          fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.55" strokeWidth="0.75" />
        <MonoLabel x={26} y={10} size={7} opacity={0.7} anchor="start">45°</MonoLabel>
      </g>

      {/* sweeping measurement cursor */}
      <g>
        <line x1={x} y1={y} x2={x} y2={y + size}
          stroke="hsl(var(--accent))" strokeOpacity="0.7" strokeWidth="0.75">
          <animate attributeName="x1" values={`${x};${x + size};${x}`} dur="8s" repeatCount="indefinite" />
          <animate attributeName="x2" values={`${x};${x + size};${x}`} dur="8s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0;0.6;0.6;0" keyTimes="0;0.1;0.9;1" dur="8s" repeatCount="indefinite" />
        </line>
      </g>

      {/* footer */}
      <MonoLabel x={200} y={362} size={7} opacity={0.45} spacing={2.5}>
        ONETRACE / IDENTITY / SHEET 01 OF 04
      </MonoLabel>
    </svg>
  );
};

/* ----------------------- 2. POINTCLOUD (stippled lineage) -------------- */
const Pointcloud = () => {
  // Volumetric "lineage cloud" — thousands of tiny dots forming a soft 3D blob with detection brackets.
  const dots = useMemo(() => {
    const out: { x: number; y: number; o: number; r: number }[] = [];
    // seeded pseudo-random
    let s = 7;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const N = 1400;
    for (let i = 0; i < N; i++) {
      // ellipsoidal cloud with two lobes
      const a = rand() * Math.PI * 2;
      const r = Math.pow(rand(), 0.6) * 110;
      const lobe = rand() > 0.5 ? 1 : -1;
      const lobeShift = lobe * 30 * Math.pow(rand(), 1.5);
      const x = 200 + Math.cos(a) * r * 1.1 + lobeShift;
      const y = 200 + Math.sin(a) * r * 0.75 + (rand() - 0.5) * 20;
      // density falls off from center
      const d = Math.hypot(x - 200, y - 200) / 130;
      const o = Math.max(0.05, 0.75 * (1 - d));
      out.push({ x, y, o, r: rand() > 0.97 ? 1 : 0.65 });
    }
    return out;
  }, []);

  // detection bounding boxes on "features"
  const boxes = [
    { x: 130, y: 150, w: 32, h: 26, label: "ART.041" },
    { x: 232, y: 138, w: 38, h: 30, label: "ART.118" },
    { x: 258, y: 220, w: 30, h: 26, label: "ART.207" },
  ];

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="pc-grid" />
      <Spot id="pc-spot" opacity={0.09} />
      <CornerMarks />

      {/* header */}
      <Tag x={28} y={28} w={86}>POINT.CLOUD</Tag>
      <Tag x={286} y={28} w={86}>N = 1,400</Tag>
      <MonoLabel x={200} y={48} size={7} opacity={0.45} spacing={2}>
        LINEAGE.DENSITY — LIVE SAMPLE
      </MonoLabel>

      {/* the cloud */}
      <g fill="hsl(var(--foreground))">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fillOpacity={d.o} />
        ))}
      </g>

      {/* subtle rotation animation for life */}
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="120s" repeatCount="indefinite" />
        {/* faint orbital ring to imply 3D */}
        <ellipse cx="200" cy="200" rx="130" ry="20" fill="none"
          stroke="hsl(var(--foreground))" strokeOpacity="0.08" strokeWidth="0.5" />
      </g>

      {/* detection brackets — drawn as 4 corner Ls per box, with leader line + tag */}
      {boxes.map((b, i) => {
        const c = 5; // corner length
        const tagX = b.x + b.w + 14 > 360 ? b.x - 14 - 56 : b.x + b.w + 14;
        const tagY = b.y - 7;
        return (
          <g key={i} stroke="hsl(var(--foreground))" strokeOpacity="0.7" strokeWidth="0.9" fill="none">
            {/* 4 corner brackets */}
            <path d={`M ${b.x} ${b.y + c} L ${b.x} ${b.y} L ${b.x + c} ${b.y}`} />
            <path d={`M ${b.x + b.w - c} ${b.y} L ${b.x + b.w} ${b.y} L ${b.x + b.w} ${b.y + c}`} />
            <path d={`M ${b.x + b.w} ${b.y + b.h - c} L ${b.x + b.w} ${b.y + b.h} L ${b.x + b.w - c} ${b.y + b.h}`} />
            <path d={`M ${b.x + c} ${b.y + b.h} L ${b.x} ${b.y + b.h} L ${b.x} ${b.y + b.h - c}`} />
            {/* leader */}
            <line x1={b.x + b.w} y1={b.y} x2={tagX > b.x ? tagX : tagX + 56} y2={tagY + 7}
              stroke="hsl(var(--foreground))" strokeOpacity="0.3" strokeWidth="0.5" strokeDasharray="1 2" />
            <Tag x={tagX} y={tagY} w={56}>{b.label}</Tag>
            {/* pulsing accent on first box only */}
            {i === 0 && (
              <circle cx={b.x + b.w / 2} cy={b.y + b.h / 2} r="2" fill="hsl(var(--accent))" stroke="none">
                <animate attributeName="opacity" values="0.2;1;0.2" dur="2.4s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}

      {/* crosshair on cloud center */}
      <g stroke="hsl(var(--foreground))" strokeOpacity="0.45" strokeWidth="0.5">
        <line x1="190" y1="200" x2="210" y2="200" />
        <line x1="200" y1="190" x2="200" y2="210" />
        <circle cx="200" cy="200" r="6" fill="none" />
      </g>

      <MonoLabel x={200} y={362} size={7} opacity={0.45} spacing={2.5}>
        78% DENSITY · 3 FEATURES TRACKED · σ 0.04
      </MonoLabel>
    </svg>
  );
};

/* ----------------------- 3. MESH (graph in frames) --------------------- */
const Mesh = () => {
  // Force-directed-looking artifact graph inside two slightly rotated wireframe frames.
  const nodes = [
    { x: 110, y: 160 }, { x: 145, y: 210 }, { x: 178, y: 158 }, { x: 200, y: 210 },
    { x: 165, y: 250 }, { x: 230, y: 175 }, { x: 260, y: 220 }, { x: 295, y: 175 },
    { x: 285, y: 240 }, { x: 315, y: 200 }, { x: 240, y: 260 }, { x: 195, y: 138 },
  ];
  const edges = [
    [0, 1], [0, 2], [1, 2], [1, 3], [1, 4], [2, 3], [2, 11], [3, 5],
    [3, 4], [4, 10], [5, 6], [5, 7], [5, 11], [6, 8], [6, 10], [7, 8],
    [7, 9], [8, 9], [8, 10], [9, 7],
  ];

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="mh-grid" />
      <Spot id="mh-spot" opacity={0.08} />
      <CornerMarks />

      {/* header */}
      <Tag x={28} y={28} w={70}>GRAPH.V3</Tag>
      <Tag x={302} y={28} w={70}>12 / 20</Tag>
      <MonoLabel x={200} y={48} size={7} opacity={0.45} spacing={2}>
        ARTIFACT.RELATIONS — FORCE LAYOUT
      </MonoLabel>

      {/* wireframe frames — two overlapping rotated rectangles */}
      <g fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.4" strokeWidth="0.75">
        <g transform="rotate(-3 175 200)">
          <rect x="70" y="120" width="210" height="160" />
          <g transform="translate(78 110)">
            <rect width="56" height="14" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeOpacity="0.5" />
            <MonoLabel x={28} y={7} size={7} opacity={0.7} spacing={1.2}>CONTEXT</MonoLabel>
          </g>
        </g>
        <g transform="rotate(2 270 220)">
          <rect x="180" y="140" width="170" height="150" />
          <g transform="translate(304 130)">
            <rect width="42" height="14" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeOpacity="0.5" />
            <MonoLabel x={21} y={7} size={7} opacity={0.7} spacing={1.2}>TEMP</MonoLabel>
          </g>
        </g>
      </g>

      {/* edges */}
      <g stroke="hsl(var(--foreground))" strokeOpacity="0.35" strokeWidth="0.75">
        {edges.map(([a, b], i) => {
          const A = nodes[a], B = nodes[b];
          return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} />;
        })}
      </g>

      {/* highlighted traversal — animated dashed path along selected edges */}
      {[[0, 2, 3, 5, 7], [4, 1, 3, 5, 6, 8]].map((path, pi) => {
        const d = path.map((idx, i) => `${i === 0 ? "M" : "L"} ${nodes[idx].x} ${nodes[idx].y}`).join(" ");
        return (
          <path
            key={pi} d={d} fill="none"
            stroke="hsl(var(--accent))" strokeOpacity="0.8"
            strokeWidth="1" strokeDasharray="3 4"
          >
            <animate attributeName="stroke-dashoffset" values="0;-70" dur={`${4 + pi}s`} repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.2;0.8;0.2" dur={`${4 + pi}s`} repeatCount="indefinite" />
          </path>
        );
      })}

      {/* nodes */}
      {nodes.map((n, i) => {
        const isHub = [3, 5, 8].includes(i);
        return (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={isHub ? 4.5 : 3} fill="hsl(var(--background))"
              stroke="hsl(var(--foreground))" strokeOpacity="0.8" strokeWidth="1" />
            {isHub && (
              <circle cx={n.x} cy={n.y} r="2" fill="hsl(var(--foreground))" fillOpacity="0.85" />
            )}
          </g>
        );
      })}

      {/* highlighted node id callout */}
      <g>
        <line x1={nodes[5].x + 4} y1={nodes[5].y - 4} x2={nodes[5].x + 28} y2={nodes[5].y - 22}
          stroke="hsl(var(--foreground))" strokeOpacity="0.4" strokeWidth="0.5" />
        <Tag x={nodes[5].x + 26} y={nodes[5].y - 30} w={52}>PRD-204</Tag>
      </g>

      {/* footer */}
      <MonoLabel x={200} y={362} size={7} opacity={0.45} spacing={2.5}>
        12 NODES · 20 EDGES · 0 ORPHANS
      </MonoLabel>
    </svg>
  );
};

/* ----------------------- 4. SCHEMATIC (pipeline, refined) -------------- */
const Schematic = () => {
  const stages = [
    { id: "IDEA", x: 60 },
    { id: "PRD", x: 130 },
    { id: "EPIC", x: 200 },
    { id: "STORY", x: 270 },
    { id: "TEST", x: 340 },
  ];
  const y = 200;

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="sc-grid" />
      <Spot id="sc-spot" opacity={0.08} />
      <CornerMarks />

      <Tag x={28} y={28} w={78}>PIPELINE.LIVE</Tag>
      <Tag x={294} y={28} w={78}>5 STAGES</Tag>
      <MonoLabel x={200} y={48} size={7} opacity={0.45} spacing={2}>
        TRACE.FLOW — IDEA → SHIP
      </MonoLabel>

      {/* baseline rail with dimension */}
      <line x1={stages[0].x} y1={y} x2={stages[stages.length - 1].x} y2={y}
        stroke="hsl(var(--foreground))" strokeOpacity="0.3" strokeWidth="1" />
      <Dim x1={stages[0].x} y1={y} x2={stages[stages.length - 1].x} y2={y} side="below" offset={68} label={`${stages[stages.length - 1].x - stages[0].x}px`} />

      {/* upper artifact branches */}
      {stages.slice(1).map((s, i) => {
        const branchY = y - 50 - (i % 2) * 16;
        return (
          <g key={`b-${i}`}>
            <path d={`M ${s.x} ${y} L ${s.x} ${branchY} L ${s.x + 24} ${branchY}`}
              fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.4" strokeWidth="0.75" />
            <Tag x={s.x + 24} y={branchY - 7} w={36}>v{i + 1}.{i}</Tag>
          </g>
        );
      })}

      {/* lower test branches */}
      {stages.slice(1).map((s, i) => {
        const branchY = y + 50 + (i % 2) * 16;
        return (
          <g key={`l-${i}`}>
            <path d={`M ${s.x} ${y} L ${s.x} ${branchY} L ${s.x + 18} ${branchY}`}
              fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.25" strokeWidth="0.75" strokeDasharray="2 3" />
            <circle cx={s.x + 22} cy={branchY} r="2" fill="none"
              stroke="hsl(var(--foreground))" strokeOpacity="0.6" strokeWidth="0.75" />
          </g>
        );
      })}

      {/* stage nodes */}
      {stages.map((s, i) => (
        <g key={s.id}>
          <circle cx={s.x} cy={y} r="9" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeOpacity="0.5" strokeWidth="0.75" />
          <circle cx={s.x} cy={y} r="5" fill="hsl(var(--foreground))" fillOpacity="0.85" />
          <MonoLabel x={s.x} y={y + 24} size={7} opacity={0.75} spacing={1.5}>{s.id}</MonoLabel>
          <MonoLabel x={s.x} y={y + 35} size={6} opacity={0.4} spacing={1}>0{i + 1}</MonoLabel>
        </g>
      ))}

      {/* flowing trace dot */}
      {[0, 1.6, 3.2].map((delay, i) => (
        <circle key={i} r="2.5" fill="hsl(var(--accent))">
          <animate attributeName="cx" values={`${stages[0].x};${stages[stages.length - 1].x}`} dur="5s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="cy" values={`${y};${y}`} dur="5s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="5s" begin={`${delay}s`} repeatCount="indefinite" />
        </circle>
      ))}

      <MonoLabel x={200} y={362} size={7} opacity={0.45} spacing={2.5}>
        12 ARTIFACTS · 0 GAPS · LAST UPDATE 2s
      </MonoLabel>
    </svg>
  );
};

/* ----------------------------- SHOWCASE -------------------------------- */
export const AuthVisualShowcase = () => {
  const [active, setActive] = useState<Variant>("blueprint");
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

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card">
        <div className="absolute inset-0">
          {active === "blueprint" && <Blueprint />}
          {active === "pointcloud" && <Pointcloud />}
          {active === "mesh" && <Mesh />}
          {active === "schematic" && <Schematic />}
        </div>
      </div>

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
