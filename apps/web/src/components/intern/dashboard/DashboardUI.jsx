"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { MetricGlyph, Sparkline } from "./DashboardVisuals";
import styles from "./pages.module.css";
import dashboardStyles from "./dashboard.module.css";
import { csvCell } from "@/lib/csv-cell.mjs";

export const formatDate = (value) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" },
      )
    : "—";
export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant] || ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function PageHeader({ title, description, children }) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className={styles.actions}>{children}</div>
    </div>
  );
}
export function Panel({ children, className = "", ...props }) {
  return (
    <section className={`${styles.panel} ${className}`} {...props}>
      {children}
    </section>
  );
}
export function StatCards({ items }) {
  return (
    <div className={styles.statGrid}>
      {items.map((item) => (
        <article
          className={styles.statCard}
          data-tone={item.tone || "blue"}
          key={item.id || item.label}
        >
          <MetricGlyph
            type={item.icon || "users"}
            tone={item.tone || "blue"}
            className={styles.statGlyph}
          />
          <div>
            <strong>
              {typeof item.value === "number"
                ? item.value.toLocaleString("en-US")
                : item.value}
            </strong>
            <span>{item.label}</span>
          </div>
          {item.change != null && (
            <small data-negative={item.change < 0}>
              {item.change < 0 ? (
                <ArrowDown size={12} />
              ) : (
                <ArrowUp size={12} />
              )}{" "}
              {item.change > 0 ? "+" : ""}
              {item.change}%
            </small>
          )}
          <div className={styles.statSpark}>
            <Sparkline
              values={item.trend || []}
              color={
                {
                  blue: "#2583ff",
                  green: "#11b98b",
                  purple: "#9954ff",
                  orange: "#f4a249",
                  pink: "#ee668e",
                }[item.tone] || "#2583ff"
              }
            />
          </div>
        </article>
      ))}
    </div>
  );
}
export function Tabs({ items, value, onChange, label = "Page sections" }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => {
            if (
              ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        items.length) %
                      items.length;
              onChange(items[next].id);
              event.currentTarget.parentElement.children[next]?.focus();
            }
          }}
          tabIndex={value === item.id ? 0 : -1}
        >
          {item.label}
          {item.count != null && (
            <span> ({Number(item.count).toLocaleString("en-US")})</span>
          )}
        </button>
      ))}
    </div>
  );
}
export function Avatar({ person, size = 32 }) {
  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.3),
        "--avatar-color": person?.avatarColor || "#b8cefb",
      }}
      aria-hidden="true"
    >
      {person?.initials ||
        person?.name
          ?.split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join("") ||
        "IN"}
    </span>
  );
}
export function TrackBadge({ programId, label }) {
  return (
    <span className={styles.trackBadge} data-track={programId}>
      {label || "Software Engineer Intern"}
    </span>
  );
}
export function StatusBadge({ status }) {
  return (
    <span
      className={styles.statusBadge}
      data-status={status?.toLowerCase().replaceAll(" ", "-")}
    >
      {status}
    </span>
  );
}
export function SearchBox({ value, onChange, placeholder = "Search..." }) {
  return (
    <label className={styles.searchBox}>
      <Search size={17} />
      <input
        type="search"
        aria-label={placeholder.replace(/\.+$/, "")}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
export function FilterMenu({ children }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button>
          <Filter size={15} /> Filter{" "}
          <ChevronRight size={13} style={{ transform: "rotate(90deg)" }} />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={`${dashboardStyles.popover} ${styles.filterPopover}`}
          align="end"
          sideOffset={8}
          collisionPadding={14}
        >
          <h3>Filter results</h3>
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
export function RowMenu({ items }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={styles.rowMenuTrigger}
          type="button"
          aria-label="Row actions"
        >
          <MoreHorizontal size={19} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={`${dashboardStyles.popover} ${styles.rowMenu}`}
          align="end"
          sideOffset={5}
        >
          {items.map((item, index) =>
            item.href ? (
              <DropdownMenu.Item asChild key={index}>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item
                key={index}
                onSelect={item.onClick}
                className={item.danger ? styles.dangerText : ""}
              >
                {item.label}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
export function Pagination({ page, pageSize, total, onChange }) {
  const count = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, count);
  const pages = [
    ...new Set(
      [1, current - 1, current, current + 1, count].filter(
        (number) => number >= 1 && number <= count,
      ),
    ),
  ];
  return (
    <div className={styles.pagination}>
      <span>
        {total
          ? `Showing ${((current - 1) * pageSize + 1).toLocaleString("en-US")}–${Math.min(current * pageSize, total).toLocaleString("en-US")} of ${total.toLocaleString("en-US")}`
          : "No results"}
      </span>
      <div>
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onChange(current - 1)}
          disabled={current <= 1}
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((number, index) => (
          <span key={number}>
            {index > 0 && number > pages[index - 1] + 1 && <i>…</i>}
            <button
              type="button"
              aria-label={`Page ${number}`}
              aria-current={number === current ? "page" : undefined}
              onClick={() => onChange(number)}
            >
              {number}
            </button>
          </span>
        ))}
        <button
          type="button"
          aria-label="Next page"
          onClick={() => onChange(current + 1)}
          disabled={current >= count}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function EmptyState({
  title = "No results found",
  description = "Try another search or adjust your filters.",
}) {
  return (
    <div className={styles.emptyState}>
      <SearchX size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = "",
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={dashboardStyles.dialogOverlay} />
        <Dialog.Content
          className={`${dashboardStyles.dialogContent} ${styles.modal} ${className}`}
        >
          <Dialog.Close
            className={dashboardStyles.dialogClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </Dialog.Close>
          <Dialog.Title className={dashboardStyles.dialogTitle}>
            {title}
          </Dialog.Title>
          <Dialog.Description className={dashboardStyles.dialogDescription}>
            {description || "Manage your Olentra internship program."}
          </Dialog.Description>
          <div className={styles.modalBody}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function exportCsv(filename, headers, rows) {
  downloadFile(
    filename,
    "\uFEFF" +
      [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n"),
    "text/csv;charset=utf-8;",
  );
}
export function downloadFile(
  filename,
  content,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
