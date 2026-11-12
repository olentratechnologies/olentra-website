import type { Document } from "mongodb";

/** True when the applicant shared an intro video link. Stored as `hasVideo` for indexing and sorting. */
export const hasVideoLink = (videoUrl: unknown) => typeof videoUrl === "string" && videoUrl.trim() !== "";

/** `video` list param: "with" | "without" | anything else (no filter). */
export function videoFilter(video: unknown): Document {
  if (video === "with") return { hasVideo: true };
  if (video === "without") return { hasVideo: { $ne: true } };
  return {};
}

/** Sort spec for application lists; "videos first" keeps the chosen order as the tiebreaker. */
export function applicationSort(sortField: string, direction: 1 | -1, videosFirst: unknown): Document {
  return { ...(videosFirst === true || videosFirst === "true" ? { hasVideo: -1 } : {}), [sortField]: direction, _id: direction };
}

/** One-time backfill for rows created before `hasVideo` existed. */
export const HAS_VIDEO_BACKFILL = {
  filter: { hasVideo: { $exists: false }, videoUrl: { $type: "string", $nin: [""] } },
  update: { $set: { hasVideo: true } },
} as const;
