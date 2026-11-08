"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { worldLandPath } from "./world-land";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, X, ArrowUpRight, Check, Inbox } from "lucide-react";

export { useDataset as useLocalState } from "./data-hooks";

export function Button({ href, variant = "default", icon: Icon, children, className = "", type = "button", ...props }) {
  const classes = ["ad-button", "ad-button-" + variant, className].filter(Boolean).join(" ");
  const content = <>{Icon && <Icon size={16} aria-hidden="true" />}{children}</>;
  return href ? <Link href={href} className={classes} {...props}>{content}</Link> : <button type={type} className={classes} {...props}>{content}</button>;
}
export function Badge({ tone = "muted", children, className = "" }) { return <span className={"ad-badge ad-badge-" + tone + " " + className}>{children}</span>; }
export function PageHeader({ title, description, actions, eyebrow }) { return <div className="ad-page-header"><div>{eyebrow && <div className="ad-eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="ad-actions">{actions}</div>}</div>; }
export function Panel({ title, description, actions, className = "", children, ...props }) { return <section className={"ad-panel " + className} {...props}>{(title || actions) && <div className="ad-panel-header"><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{actions && <div className="ad-actions">{actions}</div>}</div>}<div className="ad-panel-body">{children}</div></section>; }
export function Field({ label, hint, children, className = "" }) {
  const id = useId(); let controlId = id, found = false;
  const connect = nodes => React.Children.map(nodes, child => {
    if (!React.isValidElement(child)) return child;
    const nativeControl = typeof child.type === "string" && /^(input|select|textarea)$/.test(child.type);
    const customControl = child.type === Input || child.type === Select || (typeof child.type !== "string" && ("value" in child.props || "defaultValue" in child.props || "onChange" in child.props));
    if (!found && (nativeControl || customControl)) {
      found = true; controlId = child.props.id || id;
      return React.cloneElement(child, { id: controlId, "aria-describedby": hint ? id + "-hint" : child.props["aria-describedby"] });
    }
    return child.props.children ? React.cloneElement(child, {}, connect(child.props.children)) : child;
  });
  const controls = connect(children);
  return <div className={"ad-field " + className}><label htmlFor={found ? controlId : undefined}>{label}</label>{controls}{hint && <small id={id + "-hint"}>{hint}</small>}</div>;
}
export function Input({ className = "", ...props }) { return <input className={"ad-input " + className} {...props} />; }
export function Select({ options = [], className = "", children, ...props }) { return <select className={"ad-input ad-select " + className} {...props}>{options.map((option, index) => typeof option === "string" ? <option key={option} value={option}>{option}</option> : <option key={option.value ?? index} value={option.value}>{option.label}</option>)}{children}</select>; }
export function Switch({ checked = false, onChange, label, description, disabled, className = "", ...props }) { const control = <button type="button" role="switch" aria-checked={Boolean(checked)} aria-label={typeof label === "string" ? label : props["aria-label"] || "Toggle setting"} disabled={disabled} onClick={() => onChange?.(!checked)} className={"ad-switch " + (checked ? "is-on " : "") + className} {...props}><span /></button>; return label || description ? <div className="ad-switch-field"><div><strong>{label}</strong>{description && <p>{description}</p>}</div>{control}</div> : control; }
export function Tabs({ items = [], value, onChange, className = "" }) { return <div className={"ad-tabs " + className} role="tablist">{items.map(item => { const label = typeof item === "string" ? item : item.label; const key = typeof item === "string" ? item : item.value; return <button key={key} role="tab" aria-selected={value === key} type="button" className={value === key ? "active" : ""} onClick={() => onChange?.(key)}>{label}</button>; })}</div>; }
export function SearchInput({ value, onChange, placeholder = "Search…", ...props }) { return <div className="ad-search"><Search size={17} /><input type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={event => onChange?.(event.target.value)} {...props} />{value && <button type="button" aria-label="Clear search" onClick={() => onChange?.("")}><X size={14} /></button>}</div>; }
export function DataTable({ columns = [], rows = [], onRowClick, emptyMessage = "No matching records", className = "" }) { return <div className={"ad-table-wrap " + className}><table className="ad-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={row.id ?? index} className={onRowClick ? "ad-clickable" : ""} tabIndex={onRowClick ? 0 : undefined} onKeyDown={onRowClick ? event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onRowClick(row); } } : undefined} onClick={onRowClick ? () => onRowClick(row) : undefined}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row[column.key], row) : row[column.key]}</td>)}</tr>) : <tr><td colSpan={columns.length}><EmptyState title={emptyMessage} /></td></tr>}</tbody></table></div>; }
export function Progress({ value = 0, className = "" }) { return <div className={"ad-progress " + className} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: Math.max(0, Math.min(100, value)) + "%" }} /></div>; }
export function Sparkline({ values = [], color = "#3b82f6" }) { if (!values.length) return null; const min = Math.min(...values), max = Math.max(...values); const points = values.map((n, i) => (i * 100 / Math.max(1, values.length - 1)) + "," + (28 - ((n - min) / (max - min || 1)) * 23)).join(" "); return <svg viewBox="0 0 100 32" className="ad-spark" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
export function Stat({ label, value, icon: Icon, change, color = "#3b82f6", spark = false }) { return <div className="ad-stat">{Icon && <span className="ad-stat-icon" style={{ color }}><Icon size={25} /></span>}<div><p>{label}</p><strong>{value}</strong>{change && <small style={String(change).startsWith("-") ? { color: "#f4a5b8" } : undefined}><ArrowUpRight size={12} style={String(change).startsWith("-") ? { transform: "rotate(90deg)" } : undefined} />{change}</small>}</div>{spark && <Sparkline color={color} />}</div>; }
export function LineChart({ values = [], labels = [], height = 230, color = "#3b82f6" }) {
  const id = useId().replace(/:/g, ""), max = Math.max(0,...values) * 1.15 || 1;
  const axes = Number(height) > 140;
  const points = values.map((n, i) => [i * (650 / Math.max(1, values.length - 1)), 165 - n / max * 165]);
  const path = points.map(p => p.join(",")).join(" ");
  return <div className={"ad-chart " + (axes ? "ad-chart-with-axes" : "")} style={{ height }}><div className="ad-chart-plot">{axes && <div className="ad-chart-y" aria-hidden="true">{[0,1,2,3,4].map(i => <span key={i}>{Math.round(max * (1 - i / 4))}</span>)}</div>}<svg viewBox="0 0 650 165" preserveAspectRatio="none" role="img" aria-label="Activity chart"><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".34" /><stop offset="100%" stopColor={color} stopOpacity=".015" /></linearGradient></defs>{axes && [0,1,2,3,4].map(i => <line key={i} x1="0" x2="650" y1={i * 41.25} y2={i * 41.25} stroke="#2a3748" strokeDasharray="3 4" />)}<polygon points={"0,165 " + path + " 650,165"} fill={"url(#" + id + ")"} /><polyline points={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />{points.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#c7e0ff" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />)}</svg></div>{axes && <div className="ad-chart-labels">{labels.map((label,i) => <span key={i}>{label}</span>)}</div>}</div>;
}
export function MiniMap() { return <svg className="ad-map" viewBox="0 0 460 235" role="img" aria-label="Global monitoring regions"><path d={worldLandPath} fill="#34455c" />{[[100, 67], [244, 51], [350, 93]].map(([x, y]) => <g key={x}><circle cx={x} cy={y} r="17" fill="#22c55e" opacity=".08" /><circle cx={x} cy={y} r="10" fill="#22c55e" opacity=".16" /><circle cx={x} cy={y} r="4" fill="#34d399" /></g>)}</svg>; }
export function EmptyState({ title = "Nothing here yet", description, action }) { return <div className="ad-empty"><Inbox size={28} /><h3>{title}</h3>{description && <p>{description}</p>}{action}</div>; }
export function Modal({ open, onClose, title, children, description }) { return <Dialog.Root open={Boolean(open)} onOpenChange={value => { if (!value) onClose?.(); }}><Dialog.Portal><Dialog.Overlay className="ad-modal-overlay" /><Dialog.Content className="ad-modal" aria-describedby={description ? undefined : undefined}><div className="ad-modal-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close className="ad-icon-button" aria-label="Close dialog"><X size={19} /></Dialog.Close></div>{description && <Dialog.Description>{description}</Dialog.Description>}<div className="ad-modal-body">{children}</div></Dialog.Content></Dialog.Portal></Dialog.Root>; }
export function CheckItem({ children, checked = true }) { return <div className="ad-check-item"><span className={checked ? "ad-check-done" : "ad-check-pending"}>{checked && <Check size={13} />}</span>{children}</div>; }
