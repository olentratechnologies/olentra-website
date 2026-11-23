"use client";

import { useState } from "react";
import Link from "next/link";
import { BookmarkToggle, RowMenu } from "./DashboardUI";
import { Video } from "lucide-react";
import { useInternQuery } from "../useInternQuery";
import { BOARD_COLUMNS, canMoveCard } from "@/lib/intern/board.mjs";
import styles from "./board.module.css";
import { internScheduleLabel } from "@/lib/intern/opportunities.mjs";

const PER_COLUMN = 20;

function Column({ status, queryParams, isAdmin, dragging, onDragStart, onDrop, onMove, onDelete, refreshKey, bookmarks, canBookmark }) {
  const query = useInternQuery("application.list", { ...queryParams, status, page: 1, pageSize: PER_COLUMN, sortField: "appliedOn", sortDirection: "desc", refreshKey });
  const items = query.data?.items || [];
  const total = query.data?.total ?? 0;
  const droppable = dragging && canMoveCard(dragging.status, status, { isAdmin });
  return (
    <section
      className={`${styles.column} ${droppable ? styles.droppable : ""}`}
      aria-label={`${status}, ${total} applications`}
      onDragOver={(event) => { if (droppable) event.preventDefault(); }}
      onDrop={(event) => { event.preventDefault(); if (droppable) onDrop(status); }}
    >
      <header><h3>{status}</h3><span>{total}</span></header>
      <ol>
        {items.map((application) => (
          <li
            key={application.id}
            className={styles.card}
            draggable
            onDragStart={() => onDragStart(application)}
            onDragEnd={() => onDragStart(null)}
          >
            <div className={styles.cardHead}>
              <Link href={`/intern/dashboard/applications/${application.id}`} className={styles.cardName}>{application.name}</Link>
              {bookmarks && (
                <BookmarkToggle
                  className={styles.cardStar}
                  size={14}
                  bookmarked={bookmarks.isBookmarked(application)}
                  name={application.name}
                  by={application.bookmarkedByName}
                  on={application.bookmarkedOn}
                  canEdit={canBookmark}
                  busy={bookmarks.isBusy(application)}
                  onToggle={(next) => void bookmarks.setBookmarked([application], next)}
                />
              )}
            </div>
            {isAdmin && onDelete && <RowMenu items={[{ label: "Delete application", danger: true, onClick: () => onDelete(application) }]} />}
            <small>{application.program}{application.hasVideo ? <span className={styles.video}><Video size={11} aria-hidden="true" /> video</span> : null}</small>
            <small>{internScheduleLabel(application.schedule)}</small>
            {typeof application.score === "number" && <small>Score {application.score.toFixed(1)}</small>}
            <select
              aria-label={`Move ${application.name}`}
              value=""
              onChange={(event) => { if (event.target.value) onMove(application, event.target.value); }}
            >
              <option value="">Move to…</option>
              {BOARD_COLUMNS.filter((next) => canMoveCard(application.status, next, { isAdmin })).map((next) => <option key={next} value={next}>{next}</option>)}
            </select>
          </li>
        ))}
      </ol>
      {total > items.length && <p className={styles.more}>+{total - items.length} more. Use the table to see all.</p>}
      {!items.length && !query.loading && <p className={styles.empty}>None</p>}
    </section>
  );
}

/** Kanban view of the pipeline. Moves use the normal status update and its rules. */
export default function ApplicationsBoard({ queryParams, isAdmin, commands, notify, onChanged, onDelete, bookmarks, canBookmark }) {
  const [dragging, setDragging] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  async function move(application, status) {
    if (!canMoveCard(application.status, status, { isAdmin })) { notify("Only an admin can make that decision."); return; }
    const result = await commands.setApplicationStatus(application.id, status, application.version);
    if (!result.ok) { notify(typeof result.error === "string" ? result.error : "Couldn't move this application. Someone may have just changed it."); }
    else notify(`${application.name} moved to ${status.toLowerCase()}.`);
    setRefreshKey((value) => value + 1);
    onChanged?.();
  }
  return (
    <div className={styles.board}>
      {BOARD_COLUMNS.map((status) => (
        <Column key={status} status={status} queryParams={queryParams} isAdmin={isAdmin} dragging={dragging} refreshKey={refreshKey}
          onDragStart={setDragging} onMove={move} onDelete={onDelete} bookmarks={bookmarks} canBookmark={canBookmark}
          onDrop={(next) => { const card = dragging; setDragging(null); if (card) void move(card, next); }} />
      ))}
    </div>
  );
}
