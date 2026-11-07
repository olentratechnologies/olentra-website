"use client";

import { useId, useState } from "react";
import styles from "./applications-chart.module.css";

const applications = [
  { month: "Jan", count: 200 },
  { month: "Feb", count: 300 },
  { month: "Mar", count: 425 },
  { month: "Apr", count: 500 },
  { month: "May", count: 625 },
  { month: "Jun", count: 690 },
];

const plot = { left: 38, right: 355, top: 12, bottom: 118 };
const ticks = [750, 500, 250, 0];

export default function ApplicationsChart() {
  const [range, setRange] = useState("6");
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const visible = applications.slice(-Number(range));
  const points = visible.map((item, index) => ({
    ...item,
    x: plot.left + (index / (visible.length - 1)) * (plot.right - plot.left),
    y: plot.bottom - (item.count / 750) * (plot.bottom - plot.top),
  }));
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Applications Over Time</h3>
        <div className={styles.selectWrap}>
          <label className={styles.srOnly} htmlFor={`${id}-range`}>
            Application chart time range
          </label>
          <select
            id={`${id}-range`}
            className={styles.select}
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            <option value="6">Last 6 Months</option>
            <option value="3">Last 3 Months</option>
          </select>
        </div>
      </div>
      <svg
        className={styles.chart}
        viewBox="0 0 370 144"
        preserveAspectRatio="none"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>
          Illustrative internship applications over time
        </title>
        <desc id={`${id}-description`}>
          Sample application data:{" "}
          {visible.map(({ month, count }) => `${month}: ${count}`).join(", ")}.
        </desc>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#35a7ff" stopOpacity="0.17" />
            <stop offset="100%" stopColor="#35a7ff" stopOpacity="0.025" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => {
          const y = plot.bottom - (tick / 750) * (plot.bottom - plot.top);
          return (
            <g key={tick}>
              <line
                className={styles.gridLine}
                x1={plot.left}
                x2={plot.right}
                y1={y}
                y2={y}
              />
              <text className={styles.axisLabel} x="0" y={y + 3}>
                {tick}
              </text>
            </g>
          );
        })}
        {points.map(({ month, x }) => (
          <g key={month}>
            <line
              className={styles.gridLine}
              x1={x}
              x2={x}
              y1={plot.top - 3}
              y2={plot.bottom}
            />
            <text
              className={styles.axisLabel}
              x={x}
              y="139"
              textAnchor="middle"
            >
              {month}
            </text>
          </g>
        ))}
        <polygon
          points={`${plot.left},${plot.bottom} ${line} ${plot.right},${plot.bottom}`}
          fill={`url(#${id}-fill)`}
        />
        <polyline
          points={line}
          fill="none"
          stroke="#0784ff"
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map(({ month, x, y }) => (
          <circle
            key={month}
            cx={x}
            cy={y}
            r="3.5"
            fill="#087eff"
            stroke="#0872f6"
            strokeWidth="0.6"
          />
        ))}
      </svg>
    </div>
  );
}
