"use client";

import { useId, useState } from "react";
import { monotoneLinePath } from "../../../lib/intern/monotone-line-path.mjs";

const tones = {
  pink: { light: "#ffb4d3", mid: "#f6659c", dark: "#d42c74", halo: "#ffe1ed" },
  blue: { light: "#8ae8ff", mid: "#2485ff", dark: "#1946e9", halo: "#cce5ff" },
  green: { light: "#a7f4df", mid: "#31c6a5", dark: "#098f79", halo: "#cff0e8" },
  purple: {
    light: "#ceacff",
    mid: "#8b4eff",
    dark: "#5620eb",
    halo: "#e5d9ff",
  },
  orange: {
    light: "#ffd697",
    mid: "#ffa42c",
    dark: "#e57b08",
    halo: "#ffead9",
  },
};

function useSvgId(prefix) {
  return `${prefix}-${useId().replace(/:/g, "")}`;
}

export function PlanetArtwork({ className, variant = "default" }) {
  const id = useSvgId("planet");
  return (
    <svg
      className={className}
      viewBox="0 0 240 160"
      fill="none"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id={`${id}-body`} cx="28%" cy="18%" r="88%">
          <stop stopColor="#8af3ff" />
          <stop offset=".2" stopColor="#2f99ed" />
          <stop offset=".44" stopColor="#3044ca" />
          <stop offset=".7" stopColor="#151d6c" />
          <stop offset="1" stopColor="#071c49" />
        </radialGradient>
        <linearGradient
          id={`${id}-ring`}
          x1="24"
          y1="104"
          x2="215"
          y2="51"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#bc51ff" />
          <stop offset=".3" stopColor="#897dff" />
          <stop offset=".68" stopColor="#39bfff" />
          <stop offset="1" stopColor="#a4f0ff" />
        </linearGradient>
        <linearGradient
          id={`${id}-shine`}
          x1="90"
          y1="32"
          x2="133"
          y2="116"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#baf6ff" stopOpacity=".8" />
          <stop offset=".4" stopColor="#3f8cff" stopOpacity="0" />
          <stop offset="1" stopColor="#3ba6ff" stopOpacity=".8" />
        </linearGradient>
        <radialGradient id={`${id}-aura`}>
          <stop stopColor="#297dff" stopOpacity=".34" />
          <stop offset="1" stopColor="#267bff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <clipPath id={`${id}-front`}>
          <path d="M 0 98 L 240 25 L 240 160 L 0 160 Z" />
        </clipPath>
      </defs>
      <ellipse cx="121" cy="91" rx="115" ry="66" fill={`url(#${id}-aura)`} />
      <g transform="rotate(-22 120 82)">
        <ellipse
          cx="120"
          cy="82"
          rx="105"
          ry="23"
          stroke={`url(#${id}-ring)`}
          strokeWidth="5"
          opacity=".7"
          filter={`url(#${id}-glow)`}
        />
        <ellipse
          cx="120"
          cy="82"
          rx="103"
          ry="22"
          stroke={`url(#${id}-ring)`}
          strokeWidth="4"
          opacity=".7"
        />
        <ellipse
          cx="120"
          cy="82"
          rx="94"
          ry="17"
          stroke="#88c9ff"
          strokeWidth=".7"
          opacity=".5"
        />
        <ellipse
          cx="120"
          cy="82"
          rx="77"
          ry="40"
          stroke="#689bff"
          strokeWidth=".7"
          opacity=".38"
          transform="rotate(43 120 82)"
        />
      </g>
      <circle
        cx="120"
        cy="79"
        r="45"
        fill={`url(#${id}-body)`}
        stroke="#76c4ff"
        strokeOpacity=".65"
        strokeWidth=".7"
      />
      <path
        d="M 89 47 C 101 29 125 30 139 39"
        stroke="#aff2ff"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity=".8"
      />
      <circle cx="120" cy="79" r="44" fill={`url(#${id}-shine)`} />
      <path
        d="M 152 49 C 168 78 156 105 136 117"
        stroke="#1597fa"
        strokeOpacity=".5"
        strokeWidth="2"
      />
      <g clipPath={`url(#${id}-front)`}>
        <g transform="rotate(-22 120 82)">
          <ellipse
            cx="120"
            cy="82"
            rx="103"
            ry="22"
            stroke={`url(#${id}-ring)`}
            strokeWidth="6"
            opacity=".4"
            filter={`url(#${id}-glow)`}
          />
          <ellipse
            cx="120"
            cy="82"
            rx="103"
            ry="22"
            stroke={`url(#${id}-ring)`}
            strokeWidth="4"
          />
          <ellipse
            cx="120"
            cy="82"
            rx="98"
            ry="19"
            stroke="#d8c8ff"
            strokeWidth=".7"
            opacity=".8"
          />
          <ellipse
            cx="120"
            cy="82"
            rx="91"
            ry="16"
            stroke="#2f63fe"
            strokeWidth="1.3"
            opacity=".6"
          />
        </g>
      </g>
      <path
        d="M 159 29 V 39 M 154 34 H 164"
        stroke="#d0f4ff"
        strokeWidth="1"
        opacity={variant === "small" ? ".5" : ".8"}
      />
      <circle
        cx="159"
        cy="34"
        r="3"
        fill="#b0f6ff"
        opacity=".8"
        filter={`url(#${id}-glow)`}
      />
      <circle cx="56" cy="117" r="1.2" fill="#cda6ff" />
      <circle cx="182" cy="89" r="1" fill="#9ad5ff" />
    </svg>
  );
}

export function MetricGlyph({ type = "users", tone = "blue", className }) {
  const id = useSvgId("metric");
  const color = tones[tone] || tones.blue;
  return (
    <svg
      className={className}
      viewBox="0 0 76 76"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-halo`} cx="37%" cy="30%" r="76%">
          <stop stopColor={color.halo} stopOpacity=".5" />
          <stop offset="1" stopColor={color.halo} />
        </radialGradient>
        <linearGradient
          id={`${id}-fill`}
          x1="24"
          y1="22"
          x2="47"
          y2="55"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={color.light} />
          <stop offset=".45" stopColor={color.mid} />
          <stop offset="1" stopColor={color.dark} />
        </linearGradient>
        <linearGradient
          id={`${id}-highlight`}
          x1="20"
          y1="18"
          x2="51"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity=".9" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter
          id={`${id}-shadow`}
          x="-60%"
          y="-40%"
          width="220%"
          height="220%"
        >
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="3"
            floodColor={color.dark}
            floodOpacity=".23"
          />
        </filter>
      </defs>
      <circle cx="38" cy="37" r="33" fill={`url(#${id}-halo)`} />
      <g filter={`url(#${id}-shadow)`}>
        {type === "check" ? (
          <>
            <circle
              cx="38"
              cy="36"
              r="19"
              fill={`url(#${id}-fill)`}
              stroke="#c1fff0"
              strokeWidth="1"
            />
            <path
              d="M 28 36 L 35 43 L 48 29"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 25 27 C 29 20 39 17 46 22"
              stroke={`url(#${id}-highlight)`}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        ) : type === "trophy" ? (
          <>
            <path
              d="M 25 24 H 19 V 31 C 19 37 24 41 30 41 M 51 24 H 57 V 31 C 57 37 52 41 46 41"
              stroke={color.mid}
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M 26 19 H 50 V 33 C 50 42 45 47 38 47 C 31 47 26 42 26 33 Z"
              fill={`url(#${id}-fill)`}
              stroke="#ffe0ac"
              strokeWidth="1"
            />
            <path
              d="M 35 46 H 41 V 53 H 35 Z M 29 53 H 47 V 57 H 29 Z"
              fill={`url(#${id}-fill)`}
            />
            <path
              d="M 30 24 V 32 C 30 36 31 38 33 40"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              opacity=".65"
            />
            <path
              d="M 38 26 L 39.5 30 L 44 30.2 L 40.5 33 L 41.5 37.5 L 38 35 L 34.5 37.5 L 35.5 33 L 32 30.2 L 36.5 30 Z"
              fill="#fff3d0"
            />
          </>
        ) : (
          <>
            <circle
              cx="48"
              cy="29"
              r="7"
              fill={`url(#${id}-fill)`}
              stroke={color.light}
              strokeWidth="1"
            />
            <path
              d="M 47 39 C 54 38 60 43 60 50 V 53 H 46 Z"
              fill={`url(#${id}-fill)`}
              stroke={color.light}
              strokeWidth="1"
            />
            <circle
              cx="32"
              cy="27"
              r="9"
              fill={`url(#${id}-fill)`}
              stroke={color.light}
              strokeWidth="1"
            />
            <path
              d="M 18 54 V 50 C 18 41 24 37 32 37 C 40 37 46 41 46 50 V 54 Z"
              fill={`url(#${id}-fill)`}
              stroke={color.light}
              strokeWidth="1"
            />
            <path
              d="M 25 23 C 26 20 30 19 33 20 M 22 46 C 23 42 27 41 31 41"
              stroke={`url(#${id}-highlight)`}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        )}
      </g>
    </svg>
  );
}

export function InsightGlyph({ type = "rocket", className }) {
  const id = useSvgId("insight");
  const star = type === "star";
  return (
    <svg
      className={className}
      viewBox="0 0 52 52"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-halo`}>
          <stop stopColor={star ? "#fff2dc" : "#eff7ff"} />
          <stop
            offset="1"
            stopColor={star ? "#ffdfb2" : "#cfe7ff"}
            stopOpacity=".75"
          />
        </radialGradient>
        <linearGradient
          id={`${id}-fill`}
          x1="15"
          y1="12"
          x2="34"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={star ? "#ffe4a6" : "#57d5ff"} />
          <stop offset=".5" stopColor={star ? "#ffc344" : "#187fff"} />
          <stop offset="1" stopColor={star ? "#ec8b0b" : "#3338f0"} />
        </linearGradient>
        <filter
          id={`${id}-shadow`}
          x="-50%"
          y="-50%"
          width="200%"
          height="220%"
        >
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="2"
            floodColor={star ? "#e3931d" : "#4a83f5"}
            floodOpacity=".3"
          />
        </filter>
      </defs>
      <circle cx="26" cy="26" r="22" fill={`url(#${id}-halo)`} />
      <g filter={`url(#${id}-shadow)`}>
        {star ? (
          <path
            d="M 26 10 L 30.8 20.1 L 42 21.6 L 33.8 29.4 L 35.8 40.5 L 26 35.2 L 16.2 40.5 L 18.2 29.4 L 10 21.6 L 21.2 20.1 Z"
            fill={`url(#${id}-fill)`}
            stroke="#fff6dd"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        ) : type === "clock" ? (
          <>
            <circle
              cx="26"
              cy="25"
              r="15"
              fill={`url(#${id}-fill)`}
              stroke="#d4f4ff"
            />
            <circle cx="26" cy="25" r="11.3" fill="#e6f4ff" />
            <path
              d="M 26 17 V 25 H 32"
              stroke="#0873dc"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 17 16 C 19 14 22 13 25 13"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path
              d="M 20 24 L 12 23 L 8 31 L 19 33 M 29 33 L 30 43 L 38 39 L 38 29"
              fill="#2654ee"
            />
            <path
              d="M 18 28 C 20 16 29 9 42 9 C 43 22 36 32 26 35 Z"
              fill={`url(#${id}-fill)`}
              stroke="#c0eeff"
              strokeWidth="1"
            />
            <circle cx="32" cy="19" r="4" fill="#c9f7ff" stroke="#fff" />
            <path
              d="M 19 33 L 24 38 M 16 37 L 12 42"
              stroke="#5fd4ff"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 23 21 C 26 16 30 13 35 12"
              stroke="white"
              strokeOpacity=".75"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </>
        )}
      </g>
    </svg>
  );
}

export function Sparkline({
  values = [],
  color = "#2583ff",
  id: suppliedId,
  className,
}) {
  const generatedId = useSvgId("sparkline");
  const id = suppliedId || generatedId;
  if (!values.length) return null;
  const minimum = Math.min(...values);
  const difference = Math.max(...values) - minimum || 1;
  const points = values.map((value, index) => ({
    x: (index * 300) / Math.max(values.length - 1, 1),
    y: 42 - ((value - minimum) / difference) * 35,
  }));
  const path = monotoneLinePath(points);
  return (
    <svg
      className={className}
      viewBox="0 0 300 48"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={color} stopOpacity=".23" />
          <stop offset="1" stopColor={color} stopOpacity=".01" />
        </linearGradient>
      </defs>
      <path d={`${path} L 300 48 L 0 48 Z`} fill={`url(#${id}-fill)`} />
      <path
        d={path}
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function ApplicationsAreaChart({ period, className }) {
  const id = useSvgId("applications");
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const points = period?.points || [];
  const maximum = period?.maxValue || 2000;
  const plot = { left: 44, right: 588, top: 12, bottom: 198 };
  const x = (index) =>
    plot.left +
    (index / Math.max(points.length - 1, 1)) * (plot.right - plot.left);
  const y = (value) =>
    Math.max(
      plot.top,
      Math.min(plot.bottom, plot.bottom - (value / maximum) * (plot.bottom - plot.top)),
    );
  const explorerPath = monotoneLinePath(
    points.map((point, index) => ({ x: x(index), y: y(point.explorer) })),
  );
  const innovatorPath = monotoneLinePath(
    points.map((point, index) => ({ x: x(index), y: y(point.innovator) })),
  );
  const axisLabels =
    period?.axisLabels ||
    points
      .map((point, index) => ({ index, label: point.label }))
      .filter(
        (_, index) => index % Math.max(1, Math.ceil(points.length / 5)) === 0,
      );
  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 0,
      }}
    >
      <svg
        viewBox="0 0 600 230"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        fill="none"
        role="img"
        aria-label="Applications over time for Software Engineer Intern"
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setHoveredIndex(null)}
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const position = ((event.clientX - bounds.left) / bounds.width) * 600;
          setHoveredIndex(
            Math.max(
              0,
              Math.min(
                points.length - 1,
                Math.round(
                  ((position - plot.left) / (plot.right - plot.left)) *
                    (points.length - 1),
                ),
              ),
            ),
          );
        }}
      >
        <title>Applications overview: Software Engineer Intern</title>
        <defs>
          <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--ad-chart-fill-1, #438cff)" stopOpacity=".3" />
            <stop offset="1" stopColor="var(--ad-chart-fill-1, #5798ff)" stopOpacity=".03" />
          </linearGradient>
          <linearGradient id={`${id}-purple`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--ad-chart-fill-2, #a36bff)" stopOpacity=".43" />
            <stop offset="1" stopColor="var(--ad-chart-fill-2, #ad91ff)" stopOpacity=".23" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((index) => {
          const value = (maximum * index) / 4;
          return (
            <g key={index}>
              <line
                x1={plot.left}
                x2={plot.right}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--ad-chart-grid, #bdcff5)"
                strokeOpacity=".62"
                strokeWidth=".7"
                strokeDasharray={index ? "2 2" : undefined}
              />
              <text
                x="21"
                y={y(value) + 4}
                textAnchor="middle"
                fill="var(--ad-muted, #344c8a)"
                fontFamily="Arial, sans-serif"
                fontSize="12"
              >
                {value >= 1000 ? `${value / 1000}K` : value}
              </text>
            </g>
          );
        })}
        {axisLabels.map((tick, index) => (
          <g key={`${tick.index}-${index}`}>
            <line
              x1={x(tick.index)}
              x2={x(tick.index)}
              y1={plot.top}
              y2={plot.bottom}
              stroke="var(--ad-chart-grid, #bdcff5)"
              strokeOpacity=".55"
              strokeWidth=".7"
              strokeDasharray="2 2"
            />
            <text
              x={x(tick.index)}
              y="224"
              textAnchor={
                index === axisLabels.length - 1
                  ? "end"
                  : index === 0
                    ? "middle"
                    : "middle"
              }
              fill="var(--ad-muted, #344c8a)"
              fontFamily="Arial, sans-serif"
              fontSize="12"
            >
              {tick.label}
            </text>
          </g>
        ))}
        <line
          x1={plot.left}
          x2={plot.left}
          y1={plot.top}
          y2={plot.bottom}
          stroke="var(--ad-chart-grid, #bbcef6)"
          strokeWidth="1"
        />
        {points.length > 0 && (
          <>
            <path
              d={`${explorerPath} L ${plot.right} ${plot.bottom} L ${plot.left} ${plot.bottom} Z`}
              fill={`url(#${id}-blue)`}
            />
            <path
              d={`${innovatorPath} L ${plot.right} ${plot.bottom} L ${plot.left} ${plot.bottom} Z`}
              fill={`url(#${id}-purple)`}
            />
            <path
              d={explorerPath}
              stroke="var(--ad-chart-series-1, #237cff)"
              strokeWidth="2.3"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={innovatorPath}
              stroke="var(--ad-chart-series-2, #9c5bff)"
              strokeWidth="2.3"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        {hovered && (
          <g>
            <line
              x1={x(hoveredIndex)}
              x2={x(hoveredIndex)}
              y1={plot.top}
              y2={plot.bottom}
              stroke="var(--ad-subtle, #6b8cda)"
              strokeDasharray="4 4"
            />
            <circle
              cx={x(hoveredIndex)}
              cy={y(hovered.explorer)}
              r="4"
              fill="var(--ad-chart-series-1, #237cff)"
              stroke="var(--ad-panel, white)"
              strokeWidth="2"
            />
            <circle
              cx={x(hoveredIndex)}
              cy={y(hovered.innovator)}
              r="4"
              fill="var(--ad-chart-series-2, #9c5bff)"
              stroke="var(--ad-panel, white)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
      {hovered && (
        <div
          style={{
            position: "absolute",
            pointerEvents: "none",
            top: 4,
            left: `${Math.min(66, Math.max(8, x(hoveredIndex) / 6 - 9))}%`,
            border: "1px solid var(--ad-border, #d6e1ff)",
            borderRadius: 9,
            padding: "9px 12px",
            background: "var(--ad-panel, rgba(255,255,255,.96))",
            color: "var(--ad-text, #152451)",
            boxShadow: "0 6px 18px #294c9b18",
            fontSize: 11,
            zIndex: 2,
            lineHeight: 1.65,
            whiteSpace: "nowrap",
          }}
        >
          <strong>{hovered.label}</strong>
          <div style={{ color: "var(--ad-link, #237cff)" }}>
            Explorer: {hovered.explorer.toLocaleString()}
          </div>
          <div style={{ color: "var(--ad-purple, #9355ed)" }}>
            Innovator: {hovered.innovator.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProgramDonut({ programs = [], className }) {
  const id = useSvgId("donut");
  const first = programs[0] || {
    share: 68,
    name: "Software Engineer Intern",
    color: "#2583ff",
  };
  const second = programs[1] || {
    share: 32,
    name: "Tech Innovator",
    color: "#9454ff",
  };
  const circumference = 2 * Math.PI * 64;
  return (
    <svg
      className={className}
      viewBox="0 0 180 180"
      fill="none"
      role="img"
      aria-label={`${first.name}: ${first.share}%; ${second.name}: ${second.share}%`}
    >
      <title>{`Program split: ${first.share}% Tech Explorer, ${second.share}% Tech Innovator`}</title>
      <defs>
        <linearGradient
          id={`${id}-purple`}
          x1="15"
          y1="36"
          x2="90"
          y2="156"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ad71ff" />
          <stop offset="1" stopColor="#7f3aff" />
        </linearGradient>
        <linearGradient
          id={`${id}-blue`}
          x1="105"
          y1="16"
          x2="156"
          y2="151"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2279ff" />
          <stop offset="1" stopColor="#298eff" />
        </linearGradient>
      </defs>
      <circle
        cx="90"
        cy="90"
        r="64"
        stroke={`url(#${id}-purple)`}
        strokeWidth="24"
      />
      <circle
        cx="90"
        cy="90"
        r="64"
        stroke={`url(#${id}-blue)`}
        strokeWidth="24"
        strokeDasharray={`${(circumference * first.share) / 100} ${circumference}`}
        transform="rotate(-90 90 90)"
      />
      <path
        d="M 90 14 V 38"
        stroke="white"
        strokeOpacity=".55"
        strokeWidth="1"
      />
      <text
        x="90"
        y="94"
        textAnchor="middle"
        fill="var(--ad-text, #0a164c)"
        fontFamily="Inter, Arial, sans-serif"
        fontWeight="750"
        fontSize="27"
        letterSpacing="-1"
      >
        {first.share}%
      </text>
      <text
        x="90"
        y="112"
        textAnchor="middle"
        fill="var(--ad-muted, #172655)"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="12.5"
      >
        Explorer
      </text>
    </svg>
  );
}
