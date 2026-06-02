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
  <g stroke="hsl(var(--foreground))" strokeOpacity="0.3" strokeWidth="0.75">
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

const Spot = ({ id, opacity = 0.1 }: { id: string; opacity?: number }) => (
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

// Pure dimension marker: extension lines + end ticks, no text
const DimMark = ({
  x1, y1, x2, y2, side = "above", offset = 14,
}: {
  x1: number; y1: number; x2: number; y2: number;
  side?: "above" | "below" | "left" | "right"; offset?: number;
}) => {
  const horiz = y1 === y2;
  const a = horiz
    ? { x1, y1: y1 + (side === "below" ? offset : -offset), x2, y2: y2 + (side === "below" ? offset : -offset) }
    : { x1: x1 + (side === "right" ? offset : -offset), y1, x2: x2 + (side === "right" ? offset : -offset), y2 };
  const tick = 4;
  return (
    <g stroke="hsl(var(--foreground))" strokeOpacity="0.4" strokeWidth="0.6" fill="none">
      <line x1={x1} y1={y1} x2={a.x1} y2={a.y1} />
      <line x1={x2} y1={y2} x2={a.x2} y2={a.y2} />
      <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} />
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
    </g>
  );
};

// Empty corner-bracket box (detection target), no label
const BracketBox = ({ x, y, w, h, c = 5, opacity = 0.7 }: { x: number; y: number; w: number; h: number; c?: number; opacity?: number }) => (
  <g stroke="hsl(var(--foreground))" strokeOpacity={opacity} strokeWidth="0.9" fill="none">
    <path d={`M ${x} ${y + c} L ${x} ${y} L ${x + c} ${y}`} />
    <path d={`M ${x + w - c} ${y} L ${x + w} ${y} L ${x + w} ${y + c}`} />
    <path d={`M ${x + w} ${y + h - c} L ${x + w} ${y + h} L ${x + w - c} ${y + h}`} />
    <path d={`M ${x + c} ${y + h} L ${x} ${y + h} L ${x} ${y + h - c}`} />
  </g>
);

/* ----------------------- 1. BLUEPRINT (specimen) ----------------------- */
const Blueprint = () => {
  const size = 138;
  const cx = 200, cy = 200;
  const x = cx - size / 2;
  const y = cy - size / 2;

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="bp-grid" />
      <Spot id="bp-spot" opacity={0.07} />
      <CornerMarks />

      {/* construction guides */}
      <g stroke="hsl(var(--foreground))" strokeOpacity="0.1" strokeWidth="0.5" strokeDasharray="2 3">
        <line x1={cx} y1={50} x2={cx} y2={350} />
        <line x1={50} y1={cy} x2={350} y2={cy} />
      </g>

      {/* 45° guide */}
      <line
        x1={cx - size / 2} y1={cy - size / 2}
        x2={cx + size / 2} y2={cy + size / 2}
        stroke="hsl(var(--foreground))" strokeOpacity="0.15" strokeWidth="0.5" strokeDasharray="1 2"
      />

      {/* the mark */}
      <g>
        <rect
          x={x} y={y} width={size} height={size} rx="22"
          fill="hsl(var(--background))"
          stroke="hsl(var(--foreground))" strokeOpacity="0.7" strokeWidth="1.25"
        />
        <rect x={x} y={y} width={size} height={size} rx="22" fill="hsl(var(--foreground))" fillOpacity="0.04" />
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
        <circle cx={x + size - 14} cy={y + 14} r="2.5" fill="hsl(var(--accent))">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* dimensions (lines + ticks only) */}
      <DimMark x1={x} y1={y} x2={x + size} y2={y} side="above" offset={26} />
      <DimMark x1={x + size} y1={y} x2={x + size} y2={y + size} side="right" offset={26} />

      {/* corner radius leader */}
      <g stroke="hsl(var(--foreground))" strokeOpacity="0.5" strokeWidth="0.6" fill="none">
        <circle cx={x + 22} cy={y + 22} r="22" strokeDasharray="1 2" strokeOpacity="0.25" />
        <line x1={x + 22} y1={y + 22} x2={x - 16} y2={y - 16} />
        <circle cx={x + 22} cy={y + 22} r="1.5" fill="hsl(var(--foreground))" fillOpacity="0.7" />
      </g>

      {/* 45° angle arc */}
      <g transform={`translate(${cx} ${cy})`}>
        <path d="M 22 0 A 22 22 0 0 0 15.56 15.56"
          fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.55" strokeWidth="0.6" />
      </g>

      {/* sweeping measurement cursor */}
      <line x1={x} y1={y} x2={x} y2={y + size}
        stroke="hsl(var(--accent))" strokeOpacity="0" strokeWidth="0.75">
        <animate attributeName="x1" values={`${x};${x + size};${x}`} dur="8s" repeatCount="indefinite" />
        <animate attributeName="x2" values={`${x};${x + size};${x}`} dur="8s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0;0.6;0.6;0" keyTimes="0;0.1;0.9;1" dur="8s" repeatCount="indefinite" />
      </line>
    </svg>
  );
};

/* ----------------------- 2. POINTCLOUD (stippled lineage) -------------- */
const Pointcloud = () => {
  const dots = useMemo(() => {
    const out: { x: number; y: number; o: number; r: number }[] = [];
    let s = 7;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const N = 1600;
    for (let i = 0; i < N; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.pow(rand(), 0.6) * 115;
      const lobe = rand() > 0.5 ? 1 : -1;
      const lobeShift = lobe * 32 * Math.pow(rand(), 1.5);
      const x = 200 + Math.cos(a) * r * 1.1 + lobeShift;
      const y = 200 + Math.sin(a) * r * 0.78 + (rand() - 0.5) * 22;
      const d = Math.hypot(x - 200, y - 200) / 130;
      const o = Math.max(0.05, 0.78 * (1 - d));
      out.push({ x, y, o, r: rand() > 0.97 ? 1 : 0.65 });
    }
    return out;
  }, []);

  const boxes = [
    { x: 128, y: 148, w: 32, h: 26 },
    { x: 232, y: 138, w: 38, h: 30 },
    { x: 258, y: 222, w: 30, h: 26 },
  ];

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="pc-grid" />
      <Spot id="pc-spot" opacity={0.09} />
      <CornerMarks />

      {/* the cloud */}
      <g fill="hsl(var(--foreground))">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fillOpacity={d.o} />
        ))}
      </g>

      {/* faint orbital ellipse — implies volume */}
      <ellipse cx="200" cy="200" rx="130" ry="22" fill="none"
        stroke="hsl(var(--foreground))" strokeOpacity="0.08" strokeWidth="0.5" />

      {/* detection brackets — no labels */}
      {boxes.map((b, i) => (
        <g key={i}>
          <BracketBox x={b.x} y={b.y} w={b.w} h={b.h} />
          {i === 0 && (
            <circle cx={b.x + b.w / 2} cy={b.y + b.h / 2} r="2" fill="hsl(var(--accent))">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="2.4s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      ))}

      {/* center crosshair */}
      <g stroke="hsl(var(--foreground))" strokeOpacity="0.45" strokeWidth="0.5">
        <line x1="190" y1="200" x2="210" y2="200" />
        <line x1="200" y1="190" x2="200" y2="210" />
        <circle cx="200" cy="200" r="6" fill="none" />
      </g>
    </svg>
  );
};

/* ----------------------- 3. MESH (graph in frames) --------------------- */
const Mesh = () => {
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

      {/* wireframe frames — empty, no tag labels */}
      <g fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.35" strokeWidth="0.75">
        <g transform="rotate(-3 175 200)">
          <rect x="70" y="120" width="210" height="160" />
        </g>
        <g transform="rotate(2 270 220)">
          <rect x="180" y="140" width="170" height="150" />
        </g>
      </g>

      {/* edges */}
      <g stroke="hsl(var(--foreground))" strokeOpacity="0.35" strokeWidth="0.75">
        {edges.map(([a, b], i) => {
          const A = nodes[a], B = nodes[b];
          return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} />;
        })}
      </g>

      {/* animated traversals */}
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
              stroke="hsl(var(--foreground))" strokeOpacity="0.85" strokeWidth="1" />
            {isHub && (
              <circle cx={n.x} cy={n.y} r="2" fill="hsl(var(--foreground))" fillOpacity="0.85" />
            )}
          </g>
        );
      })}

      {/* selection bracket on a hub — no label */}
      <BracketBox x={nodes[5].x - 10} y={nodes[5].y - 10} w={20} h={20} c={4} opacity={0.8} />
    </svg>
  );
};

/* ----------------------- 4. SCHEMATIC (pipeline) ----------------------- */
const Schematic = () => {
  const stages = [60, 130, 200, 270, 340];
  const y = 200;

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <GridBg id="sc-grid" />
      <Spot id="sc-spot" opacity={0.08} />
      <CornerMarks />

      {/* baseline rail */}
      <line x1={stages[0]} y1={y} x2={stages[stages.length - 1]} y2={y}
        stroke="hsl(var(--foreground))" strokeOpacity="0.3" strokeWidth="1" />

      {/* dimension mark below the rail, no label */}
      <DimMark x1={stages[0]} y1={y} x2={stages[stages.length - 1]} y2={y} side="below" offset={70} />

      {/* upper artifact branches — small empty brackets at ends */}
      {stages.slice(1).map((sx, i) => {
        const branchY = y - 50 - (i % 2) * 16;
        return (
          <g key={`b-${i}`}>
            <path d={`M ${sx} ${y} L ${sx} ${branchY} L ${sx + 24} ${branchY}`}
              fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.4" strokeWidth="0.75" />
            <BracketBox x={sx + 22} y={branchY - 7} w={20} h={14} c={3} opacity={0.5} />
          </g>
        );
      })}

      {/* lower test branches — dashed with hollow circle */}
      {stages.slice(1).map((sx, i) => {
        const branchY = y + 50 + (i % 2) * 16;
        return (
          <g key={`l-${i}`}>
            <path d={`M ${sx} ${y} L ${sx} ${branchY} L ${sx + 18} ${branchY}`}
              fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.25" strokeWidth="0.75" strokeDasharray="2 3" />
            <circle cx={sx + 22} cy={branchY} r="2" fill="none"
              stroke="hsl(var(--foreground))" strokeOpacity="0.6" strokeWidth="0.75" />
          </g>
        );
      })}

      {/* stage nodes */}
      {stages.map((sx, i) => (
        <g key={i}>
          <circle cx={sx} cy={y} r="9" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeOpacity="0.55" strokeWidth="0.75" />
          <circle cx={sx} cy={y} r="5" fill="hsl(var(--foreground))" fillOpacity="0.85" />
        </g>
      ))}

      {/* flowing trace dots */}
      {[0, 1.6, 3.2].map((delay, i) => (
        <circle key={i} r="2.5" fill="hsl(var(--accent))">
          <animate attributeName="cx" values={`${stages[0]};${stages[stages.length - 1]}`} dur="5s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="cy" values={`${y};${y}`} dur="5s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="5s" begin={`${delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
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
