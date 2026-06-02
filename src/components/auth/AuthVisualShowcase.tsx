import { useState } from "react";

type Variant = "spotlight" | "gauge" | "schematic" | "matrix" | "sync";

const VARIANTS: { id: Variant; label: string; caption: string }[] = [
  { id: "schematic", label: "Pipeline", caption: "Idea to release. One unbroken thread." },
  { id: "matrix", label: "Coverage", caption: "Every requirement, accounted for." },
  { id: "sync", label: "Sync", caption: "OneTrace ↔ Jira. Always reconciled." },
  { id: "spotlight", label: "Focus", caption: "One source of truth, in focus." },
  { id: "gauge", label: "Signal", caption: "Precision. Measured continuously." },
];

/* ---------------------- SPOTLIGHT (icon-tile grid) --------------------- */
const Spotlight = () => {
  const cols = 5;
  const rows = 5;
  const size = 56;
  const gap = 14;
  const totalW = cols * size + (cols - 1) * gap;
  const totalH = rows * size + (rows - 1) * gap;
  const offsetX = (400 - totalW) / 2;
  const offsetY = (400 - totalH) / 2;
  const cx = 2, cy = 2;

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

      <circle cx="200" cy="200" r="170" fill="url(#sp-spot)">
        <animate attributeName="r" values="160;185;160" dur="6s" repeatCount="indefinite" />
      </circle>

      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const dist = Math.hypot(c - cx, r - cy);
          const maxDist = Math.hypot(cx, cy);
          const t = dist / maxDist;
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
                  <rect x={x} y={y} width={size} height={size} rx="12" fill="url(#sp-core)" />
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

/* ---------------------------- GAUGE ------------------------------------ */
const Gauge = () => {
  const cx = 200, cy = 230;
  const radius = 140;
  const startA = -210;
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

      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const a = startA + t * totalA;
        const p = polar(radius - 30, a);
        return (
          <text
            key={i}
            x={p.x} y={p.y}
            fill="hsl(var(--foreground))" fillOpacity="0.5"
            fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            textAnchor="middle" dominantBaseline="middle"
          >
            {Math.round(t * 100)}
          </text>
        );
      })}

      <circle cx={cx} cy={cy} r={radius - 50} fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.1" strokeDasharray="2 4" />

      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values={`${startA + 90} ${cx} ${cy}; ${startA + totalA * 0.78 + 90} ${cx} ${cy}; ${startA + totalA * 0.62 + 90} ${cx} ${cy}; ${startA + totalA * 0.72 + 90} ${cx} ${cy}; ${startA + 90} ${cx} ${cy}`}
          keyTimes="0; 0.35; 0.55; 0.75; 1"
          dur="7s"
          repeatCount="indefinite"
        />
        <line x1={cx} y1={cy} x2={cx} y2={cy - (radius - 18)} stroke="hsl(var(--accent))" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy - (radius - 18)} r="3" fill="hsl(var(--accent))" />
      </g>

      <circle cx={cx} cy={cy} r="6" fill="hsl(var(--foreground))" />
      <circle cx={cx} cy={cy} r="10" fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.4" />

      <text x={cx} y={cy + 50} fill="hsl(var(--foreground))" fillOpacity="0.85" fontSize="11"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" textAnchor="middle" letterSpacing="2">
        COVERAGE
      </text>
    </svg>
  );
};

/* ----------------------- SCHEMATIC (pipeline) -------------------------- */
const Schematic = () => {
  // Blueprint: IDEA → PRD → EPIC → STORY → TEST → SHIP
  // Hairline strokes, monospace labels, trace dots flowing through.
  const stages = [
    { id: "IDEA", x: 50 },
    { id: "PRD", x: 120 },
    { id: "EPIC", x: 190 },
    { id: "STORY", x: 260 },
    { id: "TEST", x: 330 },
  ];
  const y = 200;
  const nodeR = 7;

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <defs>
        <radialGradient id="sc-spot" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.10" />
          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
        </radialGradient>
        <pattern id="sc-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.04" strokeWidth="0.5" />
        </pattern>
      </defs>

      <rect width="400" height="400" fill="url(#sc-grid)" />
      <circle cx="200" cy="200" r="180" fill="url(#sc-spot)" />

      {/* corner crosshair marks */}
      {[[20, 20], [380, 20], [20, 380], [380, 380]].map(([x, yy], i) => (
        <g key={i} stroke="hsl(var(--foreground))" strokeOpacity="0.25" strokeWidth="1">
          <line x1={x - 6} y1={yy} x2={x + 6} y2={yy} />
          <line x1={x} y1={yy - 6} x2={x} y2={yy + 6} />
        </g>
      ))}

      {/* baseline */}
      <line x1={stages[0].x} y1={y} x2={stages[stages.length - 1].x} y2={y}
        stroke="hsl(var(--foreground))" strokeOpacity="0.18" strokeWidth="1" />

      {/* upper artifact branches off each stage */}
      {stages.slice(1).map((s, i) => {
        const branchY = y - 60 - (i % 2) * 14;
        return (
          <g key={`b-${i}`}>
            <path
              d={`M ${s.x} ${y} L ${s.x} ${branchY} L ${s.x + 30} ${branchY}`}
              fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.22" strokeWidth="1"
            />
            <rect x={s.x + 30} y={branchY - 8} width="34" height="16" rx="2"
              fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.35" strokeWidth="1" />
            <text x={s.x + 47} y={branchY + 1} fill="hsl(var(--foreground))" fillOpacity="0.55"
              fontSize="7" fontFamily="ui-monospace, monospace" textAnchor="middle" dominantBaseline="middle"
              letterSpacing="1">
              v{i + 1}.0
            </text>
          </g>
        );
      })}

      {/* lower test branches */}
      {stages.slice(1).map((s, i) => {
        const branchY = y + 60 + (i % 2) * 14;
        return (
          <g key={`l-${i}`}>
            <path
              d={`M ${s.x} ${y} L ${s.x} ${branchY} L ${s.x + 20} ${branchY}`}
              fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.18" strokeWidth="1"
              strokeDasharray="2 3"
            />
            <circle cx={s.x + 24} cy={branchY} r="2.5" fill="hsl(var(--foreground))" fillOpacity="0.5" />
          </g>
        );
      })}

      {/* nodes + labels */}
      {stages.map((s, i) => (
        <g key={s.id}>
          <circle cx={s.x} cy={y} r={nodeR + 4} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeOpacity="0.35" strokeWidth="1" />
          <circle cx={s.x} cy={y} r={nodeR} fill="hsl(var(--foreground))" fillOpacity="0.85" />
          <text x={s.x} y={y + 28} fill="hsl(var(--foreground))" fillOpacity="0.7"
            fontSize="8" fontFamily="ui-monospace, monospace" textAnchor="middle" letterSpacing="1.5">
            {s.id}
          </text>
          <text x={s.x} y={y + 40} fill="hsl(var(--foreground))" fillOpacity="0.35"
            fontSize="7" fontFamily="ui-monospace, monospace" textAnchor="middle" letterSpacing="1">
            0{i + 1}
          </text>
        </g>
      ))}

      {/* flowing trace dots */}
      {[0, 1.4, 2.8].map((delay, i) => (
        <circle key={i} r="2.5" fill="hsl(var(--accent))">
          <animate attributeName="cx" values={`${stages[0].x};${stages[stages.length - 1].x}`}
            dur="4.2s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="cy" values={`${y};${y}`} dur="4.2s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1"
            dur="4.2s" begin={`${delay}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* header label */}
      <text x="200" y="50" fill="hsl(var(--foreground))" fillOpacity="0.55"
        fontSize="9" fontFamily="ui-monospace, monospace" textAnchor="middle" letterSpacing="3">
        TRACE.PIPELINE — LIVE
      </text>
      <line x1="140" y1="60" x2="260" y2="60" stroke="hsl(var(--foreground))" strokeOpacity="0.2" />

      {/* footer readout */}
      <text x="200" y="350" fill="hsl(var(--foreground))" fillOpacity="0.45"
        fontSize="8" fontFamily="ui-monospace, monospace" textAnchor="middle" letterSpacing="2">
        5 STAGES · 12 ARTIFACTS · 0 GAPS
      </text>
    </svg>
  );
};

/* ----------------------- MATRIX (coverage grid) ------------------------ */
const Matrix = () => {
  // 12x12 coverage matrix, cells fill in a deterministic pattern.
  const N = 14;
  const cell = 18;
  const gap = 2;
  const total = N * (cell + gap) - gap;
  const offset = (400 - total) / 2;

  // deterministic "filled" pattern that looks dense but irregular
  const filled = (r: number, c: number) => {
    const h = (r * 31 + c * 17 + r * c) % 100;
    return h < 78; // ~78% coverage
  };
  const hot = (r: number, c: number) => ((r * 13 + c * 7) % 100) < 18;

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <defs>
        <radialGradient id="mx-spot" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.10" />
          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#mx-spot)" />

      {/* header */}
      <text x="200" y="50" fill="hsl(var(--foreground))" fillOpacity="0.55"
        fontSize="9" fontFamily="ui-monospace, monospace" textAnchor="middle" letterSpacing="3">
        REQUIREMENTS × TESTS
      </text>
      <line x1="100" y1="60" x2="300" y2="60" stroke="hsl(var(--foreground))" strokeOpacity="0.2" />

      {/* axis labels */}
      {Array.from({ length: N }).map((_, i) => i % 2 === 0 && (
        <text key={`x-${i}`} x={offset + i * (cell + gap) + cell / 2} y={offset - 6}
          fill="hsl(var(--foreground))" fillOpacity="0.35"
          fontSize="6" fontFamily="ui-monospace, monospace" textAnchor="middle">
          T{i.toString().padStart(2, "0")}
        </text>
      ))}
      {Array.from({ length: N }).map((_, i) => i % 2 === 0 && (
        <text key={`y-${i}`} x={offset - 8} y={offset + i * (cell + gap) + cell / 2 + 2}
          fill="hsl(var(--foreground))" fillOpacity="0.35"
          fontSize="6" fontFamily="ui-monospace, monospace" textAnchor="end">
          R{i.toString().padStart(2, "0")}
        </text>
      ))}

      {/* cells */}
      {Array.from({ length: N }).map((_, r) =>
        Array.from({ length: N }).map((_, c) => {
          const x = offset + c * (cell + gap);
          const y = offset + r * (cell + gap);
          const isFilled = filled(r, c);
          const isHot = isFilled && hot(r, c);
          const delay = ((r + c) * 0.04) % 2.4;
          return (
            <g key={`${r}-${c}`}>
              <rect x={x} y={y} width={cell} height={cell} rx="2"
                fill="hsl(var(--foreground))"
                fillOpacity={isFilled ? 0.18 : 0.04}
                stroke="hsl(var(--foreground))"
                strokeOpacity={isFilled ? 0.35 : 0.08}
                strokeWidth="0.75"
              />
              {isHot && (
                <rect x={x} y={y} width={cell} height={cell} rx="2"
                  fill="hsl(var(--accent))" fillOpacity="0.85">
                  <animate attributeName="fill-opacity"
                    values="0.2;0.9;0.2" dur="3.2s" begin={`${delay}s`} repeatCount="indefinite" />
                </rect>
              )}
            </g>
          );
        })
      )}

      {/* scan line sweeping across */}
      <rect x={offset} y={offset} width="2" height={total} fill="hsl(var(--accent))" opacity="0.6">
        <animate attributeName="x" values={`${offset};${offset + total};${offset}`}
          dur="6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;0.7;0.7;0" keyTimes="0;0.1;0.9;1"
          dur="6s" repeatCount="indefinite" />
      </rect>

      {/* readout */}
      <text x="200" y="370" fill="hsl(var(--foreground))" fillOpacity="0.55"
        fontSize="9" fontFamily="ui-monospace, monospace" textAnchor="middle" letterSpacing="2">
        78% COVERED · 12 GAPS · LIVE
      </text>
    </svg>
  );
};

/* --------------------------- SYNC (bi-directional) --------------------- */
const Sync = () => {
  // Two columns of records (OneTrace vs Jira) with animated sync arrows.
  const leftX = 90;
  const rightX = 310;
  const rows = [
    { y: 110, label: "PRD-204", remote: "ENG-1180", dir: "out" as const },
    { y: 160, label: "EPIC-31", remote: "ENG-1181", dir: "out" as const },
    { y: 210, label: "STORY-88", remote: "ENG-1192", dir: "in" as const },
    { y: 260, label: "STORY-89", remote: "ENG-1193", dir: "out" as const },
    { y: 310, label: "TEST-44", remote: "ENG-1201", dir: "in" as const },
  ];
  const cardW = 92;
  const cardH = 28;

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <defs>
        <radialGradient id="sy-spot" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.10" />
          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
        </radialGradient>
        <marker id="sy-arrow" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--accent))" />
        </marker>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#sy-spot)" />

      {/* column headers */}
      <text x={leftX} y="60" fill="hsl(var(--foreground))" fillOpacity="0.7"
        fontSize="10" fontFamily="ui-monospace, monospace" textAnchor="middle" letterSpacing="2">
        ONETRACE
      </text>
      <text x={rightX} y="60" fill="hsl(var(--foreground))" fillOpacity="0.7"
        fontSize="10" fontFamily="ui-monospace, monospace" textAnchor="middle" letterSpacing="2">
        JIRA
      </text>
      <line x1={leftX - 50} y1="70" x2={leftX + 50} y2="70" stroke="hsl(var(--foreground))" strokeOpacity="0.2" />
      <line x1={rightX - 50} y1="70" x2={rightX + 50} y2="70" stroke="hsl(var(--foreground))" strokeOpacity="0.2" />

      {/* rail lines */}
      <line x1={leftX} y1="85" x2={leftX} y2="335" stroke="hsl(var(--foreground))" strokeOpacity="0.1" strokeDasharray="2 4" />
      <line x1={rightX} y1="85" x2={rightX} y2="335" stroke="hsl(var(--foreground))" strokeOpacity="0.1" strokeDasharray="2 4" />

      {/* rows */}
      {rows.map((row, i) => {
        const isOut = row.dir === "out";
        const pathD = isOut
          ? `M ${leftX + cardW / 2} ${row.y} L ${rightX - cardW / 2} ${row.y}`
          : `M ${rightX - cardW / 2} ${row.y} L ${leftX + cardW / 2} ${row.y}`;
        const delay = i * 0.6;
        return (
          <g key={i}>
            {/* left card */}
            <rect
              x={leftX - cardW / 2} y={row.y - cardH / 2} width={cardW} height={cardH} rx="4"
              fill="hsl(var(--foreground))" fillOpacity="0.04"
              stroke="hsl(var(--foreground))" strokeOpacity="0.3" strokeWidth="1"
            />
            <circle cx={leftX - cardW / 2 + 10} cy={row.y} r="2.5" fill="hsl(var(--foreground))" fillOpacity="0.7" />
            <text x={leftX - cardW / 2 + 20} y={row.y + 1} fill="hsl(var(--foreground))" fillOpacity="0.8"
              fontSize="9" fontFamily="ui-monospace, monospace" dominantBaseline="middle" letterSpacing="0.5">
              {row.label}
            </text>

            {/* right card */}
            <rect
              x={rightX - cardW / 2} y={row.y - cardH / 2} width={cardW} height={cardH} rx="4"
              fill="hsl(var(--foreground))" fillOpacity="0.04"
              stroke="hsl(var(--foreground))" strokeOpacity="0.3" strokeWidth="1"
            />
            <circle cx={rightX - cardW / 2 + 10} cy={row.y} r="2.5" fill="hsl(var(--foreground))" fillOpacity="0.7" />
            <text x={rightX - cardW / 2 + 20} y={row.y + 1} fill="hsl(var(--foreground))" fillOpacity="0.8"
              fontSize="9" fontFamily="ui-monospace, monospace" dominantBaseline="middle" letterSpacing="0.5">
              {row.remote}
            </text>

            {/* connection line */}
            <line
              x1={leftX + cardW / 2} y1={row.y} x2={rightX - cardW / 2} y2={row.y}
              stroke="hsl(var(--foreground))" strokeOpacity="0.15" strokeWidth="1"
            />

            {/* animated arrow + packet */}
            <path
              d={pathD}
              fill="none" stroke="hsl(var(--accent))" strokeOpacity="0"
              strokeWidth="1.25"
              markerEnd="url(#sy-arrow)"
            >
              <animate attributeName="stroke-opacity"
                values="0;0.9;0.9;0" keyTimes="0;0.15;0.85;1"
                dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
            </path>
            <circle r="2.5" fill="hsl(var(--accent))">
              <animateMotion dur="3s" begin={`${delay}s`} repeatCount="indefinite" path={pathD} />
              <animate attributeName="opacity"
                values="0;1;1;0" keyTimes="0;0.15;0.85;1"
                dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}

      {/* footer */}
      <text x="200" y="370" fill="hsl(var(--foreground))" fillOpacity="0.55"
        fontSize="9" fontFamily="ui-monospace, monospace" textAnchor="middle" letterSpacing="2">
        BI-DIRECTIONAL · LAST SYNC 2s
      </text>
    </svg>
  );
};

/* ----------------------------- SHOWCASE -------------------------------- */
export const AuthVisualShowcase = () => {
  const [active, setActive] = useState<Variant>("schematic");
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
          {active === "spotlight" && <Spotlight />}
          {active === "gauge" && <Gauge />}
          {active === "schematic" && <Schematic />}
          {active === "matrix" && <Matrix />}
          {active === "sync" && <Sync />}
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
