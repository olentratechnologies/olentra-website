"use client";

import React from "react";

/**
 * Generates a smooth cubic bezier SVG path from normalized [x, y] points
 */
function buildSmoothPath(points) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

  let path = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const cpx1 = x0 + (x1 - x0) * 0.45;
    const cpy1 = y0;
    const cpx2 = x0 + (x1 - x0) * 0.55;
    const cpy2 = y1;
    path += ` C ${cpx1.toFixed(1)} ${cpy1.toFixed(1)}, ${cpx2.toFixed(1)} ${cpy2.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return path;
}

export function DualSplineChart({
  primaryData = [],
  secondaryData = [],
  labels = [],
  height = 170,
  primaryColor = "#8B5CF6",
  secondaryColor = "#10B981",
  showDots = false,
  highlightIndex,
  highlightPrimaryLabel,
  highlightSecondaryLabel,
  yAxisLabels = ["40k", "30k", "20k", "10k", "0"],
}) {
  const uid = React.useId().replace(/:/g, "");
  const width = 520;
  const padLeft = 36;
  const padRight = 14;
  const padTop = 18;
  const padBottom = 26;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const allValues = [...primaryData, ...secondaryData, 1];
  const maxVal = Math.max(...allValues) * 1.12;

  const toCoords = (arr) =>
    arr.map((v, i) => {
      const x = padLeft + (i / Math.max(1, arr.length - 1)) * chartW;
      const y = padTop + chartH - (v / maxVal) * chartH;
      return [x, y];
    });

  const pCoords = toCoords(primaryData);
  const sCoords = toCoords(secondaryData);

  const pLine = buildSmoothPath(pCoords);
  const pArea = pCoords.length > 0 ? `${pLine} L ${pCoords[pCoords.length - 1][0].toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${pCoords[0][0].toFixed(1)} ${(padTop + chartH).toFixed(1)} Z` : "";

  const sLine = buildSmoothPath(sCoords);
  const sArea = sCoords.length > 0 ? `${sLine} L ${sCoords[sCoords.length - 1][0].toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${sCoords[0][0].toFixed(1)} ${(padTop + chartH).toFixed(1)} Z` : "";

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
      >
        <defs>
          <linearGradient id={`pGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.52" />
            <stop offset="75%" stopColor={primaryColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id={`sGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.45" />
            <stop offset="80%" stopColor={secondaryColor} stopOpacity="0.1" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.0" />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal dashed grid lines + Y-axis labels */}
        {yAxisLabels.map((lbl, idx) => {
          const y = padTop + (idx / Math.max(1, yAxisLabels.length - 1)) * chartH;
          return (
            <g key={idx}>
              <text
                x={0}
                y={y + 3}
                fill="rgba(148, 163, 184, 0.55)"
                fontSize="10"
                fontWeight="500"
              >
                {lbl}
              </text>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="rgba(255, 255, 255, 0.06)"
                strokeDasharray="3 3"
              />
            </g>
          );
        })}

        {/* Primary Area + Glowing Stroke */}
        {pArea && <path d={pArea} fill={`url(#pGrad-${uid})`} />}
        {pLine && (
          <path
            d={pLine}
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.4"
            filter={`url(#glow-${uid})`}
          />
        )}

        {/* Secondary Area + Glowing Stroke */}
        {sArea && <path d={sArea} fill={`url(#sGrad-${uid})`} />}
        {sLine && (
          <path
            d={sLine}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2.2"
            filter={`url(#glow-${uid})`}
          />
        )}

        {/* Optional Data Dots along curves */}
        {showDots &&
          pCoords.map(([x, y], i) => (
            <circle
              key={`p-${i}`}
              cx={x}
              cy={y}
              r={i === highlightIndex ? 4.5 : 3}
              fill="#131126"
              stroke={primaryColor}
              strokeWidth="2"
            />
          ))}
        {showDots &&
          sCoords.map(([x, y], i) => (
            <circle
              key={`s-${i}`}
              cx={x}
              cy={y}
              r={3}
              fill="#131126"
              stroke={secondaryColor}
              strokeWidth="2"
            />
          ))}

        {/* Highlight vertical dashed line & floating tooltips */}
        {typeof highlightIndex === "number" && pCoords[highlightIndex] && (
          <g>
            <line
              x1={pCoords[highlightIndex][0]}
              y1={padTop}
              x2={pCoords[highlightIndex][0]}
              y2={padTop + chartH}
              stroke="rgba(255, 255, 255, 0.45)"
              strokeDasharray="3 3"
              strokeWidth="1.2"
            />
            <circle
              cx={pCoords[highlightIndex][0]}
              cy={pCoords[highlightIndex][1]}
              r="4.5"
              fill="#FFFFFF"
              stroke={primaryColor}
              strokeWidth="2.5"
            />
            {sCoords[highlightIndex] && (
              <circle
                cx={sCoords[highlightIndex][0]}
                cy={sCoords[highlightIndex][1]}
                r="4"
                fill="#FFFFFF"
                stroke={secondaryColor}
                strokeWidth="2.5"
              />
            )}
            {highlightPrimaryLabel && (
              <g
                transform={`translate(${pCoords[highlightIndex][0] - 28}, ${
                  pCoords[highlightIndex][1] - 28
                })`}
              >
                <rect
                  width="58"
                  height="18"
                  rx="6"
                  fill="rgba(20, 18, 38, 0.92)"
                  stroke="rgba(139, 92, 246, 0.5)"
                />
                <circle cx="8" cy="9" r="2.5" fill={primaryColor} />
                <text
                  x="14"
                  y="12.5"
                  fill="#FFFFFF"
                  fontSize="9.5"
                  fontWeight="600"
                >
                  {highlightPrimaryLabel}
                </text>
              </g>
            )}
            {highlightSecondaryLabel && sCoords[highlightIndex] && (
              <g
                transform={`translate(${sCoords[highlightIndex][0] - 28}, ${
                  sCoords[highlightIndex][1] - 24
                })`}
              >
                <rect
                  width="54"
                  height="17"
                  rx="6"
                  fill="rgba(20, 18, 38, 0.92)"
                  stroke="rgba(16, 185, 129, 0.5)"
                />
                <circle cx="8" cy="8.5" r="2.5" fill={secondaryColor} />
                <text
                  x="14"
                  y="12"
                  fill="#E2E8F0"
                  fontSize="9"
                  fontWeight="600"
                >
                  {highlightSecondaryLabel}
                </text>
              </g>
            )}
          </g>
        )}

        {/* X-Axis Labels */}
        {labels.map((lbl, i) => {
          const x = padLeft + (i / Math.max(1, labels.length - 1)) * chartW;
          return (
            <text
              key={i}
              x={x}
              y={height - 4}
              textAnchor="middle"
              fill="rgba(148, 163, 184, 0.65)"
              fontSize="10"
              fontWeight="500"
            >
              {lbl}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function GlowingBarChart({
  values = [],
  labels,
  variant = "purple",
  height = 130,
  showTrack = false,
}) {
  const max = Math.max(...values, 100);
  const barStyle =
    variant === "cyan-mint"
      ? "linear-gradient(180deg, #34D399 0%, #38BDF8 55%, #8B5CF6 100%)"
      : variant === "emerald"
      ? "linear-gradient(180deg, #34D399 0%, #10B981 100%)"
      : "linear-gradient(180deg, #A78BFA 0%, #7C3AED 65%, #4F46E5 100%)";

  const shadowStyle =
    variant === "emerald"
      ? "0 0 14px rgba(16, 185, 129, 0.45)"
      : "0 0 16px rgba(139, 92, 246, 0.45)";

  return (
    <div className="w-full flex flex-col justify-end" style={{ height }}>
      <div className="flex-1 flex items-end justify-between gap-2 pt-2">
        {values.map((v, i) => {
          const pct = Math.max(12, Math.round((v / max) * 100));
          return (
            <div
              key={i}
              className="flex-1 h-full flex flex-col items-center justify-end group"
            >
              <div
                className={`w-full max-w-[28px] h-full flex items-end rounded-t-md ${
                  showTrack ? "bg-white/[0.05] rounded-b-md p-[1px]" : ""
                }`}
              >
                <div
                  className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-125"
                  style={{
                    height: `${pct}%`,
                    background: barStyle,
                    boxShadow: shadowStyle,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {labels && (
        <div className="flex items-center justify-between gap-2 mt-2">
          {labels.map((lbl, i) => (
            <span
              key={i}
              className="flex-1 text-center text-[10px] text-slate-400/80 font-medium truncate"
            >
              {lbl}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProgressRing({
  percent,
  size = 68,
  strokeWidth = 6,
  color = "#8B5CF6",
  secondaryColor,
  label,
  sublabel,
  icon,
}) {
  const uid = React.useId().replace(/:/g, "");
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 overflow-visible">
          <defs>
            <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={secondaryColor || color} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#ring-${uid})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: `drop-shadow(0 0 6px ${color}88)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {icon ? (
            icon
          ) : (
            <span className="text-xs font-bold text-white">{percent}%</span>
          )}
        </div>
      </div>
      {label && (
        <span className="mt-1.5 text-xs font-medium text-slate-200 text-center">
          {label}
        </span>
      )}
      {sublabel && (
        <span className="text-[10px] text-slate-400 text-center">{sublabel}</span>
      )}
    </div>
  );
}

export function MultiSegmentDonut({
  size = 136,
  strokeWidth = 14,
  centerTitle,
  centerValue,
  segments = [
    { value: 35, color: "#8B5CF6" },
    { value: 25, color: "#2DD4BF" },
    { value: 20, color: "#EC4899" },
    { value: 20, color: "#F59E0B" },
  ],
  concentric = false,
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg, i) => {
          const segLength = (seg.value / 100) * circumference;
          const gap = 5;
          const dashArray = `${Math.max(2, segLength - gap)} ${circumference}`;
          const dashOffset = -accumulated;
          accumulated += segLength;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              style={{
                filter: `drop-shadow(0 0 8px ${seg.color}66)`,
              }}
            />
          );
        })}

        {concentric && (
          <>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius - 13}
              fill="none"
              stroke="#A855F7"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${circumference * 0.62} ${circumference}`}
              style={{ filter: "drop-shadow(0 0 6px rgba(168,85,247,0.6))" }}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius - 23}
              fill="none"
              stroke="#34D399"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={`${circumference * 0.45} ${circumference}`}
              strokeDashoffset={-30}
              style={{ filter: "drop-shadow(0 0 6px rgba(52,211,153,0.6))" }}
            />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        {centerTitle && (
          <span className="text-[10px] text-slate-400 font-medium">
            {centerTitle}
          </span>
        )}
        {centerValue && (
          <span className="text-base font-bold text-white tracking-tight">
            {centerValue}
          </span>
        )}
      </div>
    </div>
  );
}

export function HolographicVisaCard({
  last4 = "2345",
  fullNumber = "1264 5243 6214 2345",
  holder = "Cameron Williamson",
  limitSpent = "₹3,500.00 spent of ₹32,346.00",
  limitPercent = 35,
  compact = false,
}) {
  return (
    <div className="w-full">
      {/* Stacked Card Wrapper with Peeking Back Card */}
      <div className="relative pt-2.5">
        {/* Peeking Back Card Strip */}
        <div
          className="mx-1.5 h-3.5 rounded-t-xl opacity-95"
          style={{
            background:
              "linear-gradient(90deg, #F97316 0%, #FB7185 32%, #34D399 66%, #38BDF8 100%)",
          }}
        />

        {/* Main Front Multi-Ribbon VISA Card */}
        <div
          className={`relative -mt-1.5 w-full rounded-xl overflow-hidden border border-white/20 shadow-[0_12px_30px_rgba(0,0,0,0.65)] ${
            compact ? "p-3" : "p-4"
          }`}
          style={{
            background:
              "linear-gradient(135deg, #2E1F5E 0%, #1F1942 45%, #191636 100%)",
          }}
        >
          {/* Diagonal Vibrant Ribbon Layers */}
          <svg
            viewBox="0 0 240 130"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <polygon
              points="0,0 135,0 75,75 0,55"
              fill="url(#cardWarm)"
              opacity="0.85"
            />
            <polygon
              points="115,0 240,0 240,75 75,55"
              fill="url(#cardCyan)"
              opacity="0.9"
            />
            <polygon
              points="40,45 195,20 240,85 110,130 0,110"
              fill="url(#cardViolet)"
              opacity="0.75"
            />
            <defs>
              <linearGradient id="cardWarm" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="55%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
              <linearGradient id="cardCyan" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
              <linearGradient id="cardViolet" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="60%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#1E1B4B" />
              </linearGradient>
            </defs>
          </svg>

          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="w-7 h-5 rounded bg-gradient-to-br from-slate-100 via-amber-200 to-slate-300 border border-white/60 flex items-center justify-center shadow-sm">
              <div className="w-4 h-3 border border-slate-600/30 rounded-[2px]" />
            </div>
            <span className="text-xs font-black italic tracking-wider text-white drop-shadow">
              VISA
            </span>
          </div>

          <div className="relative z-10 mt-3 flex items-center justify-between">
            <span className="text-[10.5px] font-mono tracking-widest text-white/95 font-semibold">
              ••••  ••••  ••••  {last4}
            </span>
          </div>
        </div>
      </div>

      {/* Cardholder & Limit details */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[10.5px] text-white font-semibold tracking-tight">
          <span>{fullNumber}</span>
          <span className="text-slate-400 font-mono text-[10px]">&lt; &gt;</span>
        </div>
        <p className="text-[9px] text-slate-400 mt-0.5">{holder}</p>

        <div className="mt-2.5 pt-2 border-t border-dashed border-white/15">
          <div className="flex items-center justify-between text-[9px] text-slate-300 mb-1.5">
            <span>Daily Transaction Limit</span>
          </div>
          <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-400 to-purple-500"
              style={{ width: `${limitPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[8.5px] text-slate-400 mt-1">
            <span>{limitSpent}</span>
            <span className="text-slate-300 font-semibold">{limitPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
