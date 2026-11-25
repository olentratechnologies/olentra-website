import { DomainError } from "../../shared/errors";

/**
 * Every offer the program has generated, one row per offer version, for the
 * admin "Offers" page: formal offers, instant offers and direct enrolments,
 * including schedule revisions.
 */
export type OfferType = "formal" | "instant" | "direct";
export type OfferStatus = "Open" | "Accepted" | "Declined" | "Expired" | "Withdrawn" | "Superseded";
export const OFFER_STATUSES: OfferStatus[] = ["Open", "Accepted", "Declined", "Expired", "Withdrawn", "Superseded"];
export const OFFER_TYPES: OfferType[] = ["formal", "instant", "direct"];

export type OfferRow = {
  id: string;
  applicationId: string;
  version: number;
  current: boolean;
  type: OfferType;
  status: OfferStatus;
  name: string;
  email: string;
  college: string;
  program: string;
  startOn: string | null;
  endOn: string | null;
  durationLabel: string;
  workMode: string;
  schedule: string;
  stipend: number;
  stipendPeriod: string;
  sentOn: string | null;
  issueDate: string | null;
  expiresOn: string | null;
  decidedOn: string | null;
  createdBy: string | null;
};

const text = (value: unknown) => (typeof value === "string" ? value : "");
const offerType = (row: any): OfferType => (row?.route === "direct" || row?.direct === true ? "direct" : row?.route === "instant" ? "instant" : "formal");

/** "Sent" past its deadline is Expired; "Sent" otherwise is Open. */
function liveStatus(status: unknown, expiresOn: unknown, now: number): OfferStatus {
  if (status === "Sent") return typeof expiresOn === "string" && Date.parse(expiresOn) <= now ? "Expired" : "Open";
  if (status === "Accepted" || status === "Declined" || status === "Withdrawn" || status === "Superseded") return status;
  return "Open";
}

/**
 * Builds one row per generated offer. A version's own decision wins; the
 * current version follows the applicant's offer status; an older version
 * that was never decided was replaced, so it is Superseded.
 */
export function offerRows(offers: any[], versions: any[], applications: Map<string, any>, now = Date.now()): OfferRow[] {
  const byApplication = new Map(offers.map((offer) => [String(offer.applicationId), offer]));
  const seen = new Set<string>();
  const rows: OfferRow[] = [];
  const build = (source: any, applicationId: string, version: number, status: OfferStatus, current: boolean): OfferRow => {
    const app = applications.get(applicationId) || {};
    return {
      id: `${applicationId}:v${version}`,
      applicationId,
      version,
      current,
      type: offerType(source),
      status,
      name: text(source.name) || text(app.name),
      email: text(source.email) || text(app.email),
      college: text(source.college) || text(app.college),
      program: text(source.program) || text(app.program),
      startOn: text(source.startOn) || null,
      endOn: text(source.endOn) || null,
      durationLabel: text(source.durationLabel),
      workMode: text(source.workMode) || "remote",
      schedule: text(source.schedule),
      stipend: typeof source.stipend === "number" ? source.stipend : 0,
      stipendPeriod: text(source.stipendPeriod) || "month",
      sentOn: text(source.sentOn) || text(source.issueDate) || null,
      issueDate: text(source.issueDate) || text(source.sentOn) || null,
      expiresOn: text(source.expiresOn) || null,
      decidedOn: text(source.decidedOn) || null,
      createdBy: text(source.createdBy) || null,
    };
  };
  for (const version of versions) {
    const applicationId = String(version.applicationId || ""), number = Number(version.version || 1);
    if (!applicationId) continue;
    seen.add(`${applicationId}:${number}`);
    const offer = byApplication.get(applicationId);
    const pending = Number(offer?.pendingRevision?.version || 0);
    const currentVersion = Number(offer?.currentVersion || 1);
    let status: OfferStatus, current = false;
    if (["Accepted", "Declined", "Withdrawn", "Superseded"].includes(version.decision)) {
      status = version.decision;
      current = number === currentVersion && !pending;
    } else if (pending && number === pending) {
      // A proposed schedule revision waiting for the intern.
      status = liveStatus("Sent", offer.pendingRevision.expiresOn ?? version.expiresOn, now);
      current = true;
    } else if (offer && number === currentVersion) {
      status = liveStatus(offer.status, offer.expiresOn ?? version.expiresOn, now);
      current = true;
    } else {
      status = "Superseded";
    }
    rows.push(build({ ...version, ...(current && offer && !version.decision ? { decidedOn: offer.decidedOn } : {}) }, applicationId, number, status, current));
  }
  // Offers from before versions were recorded have only their offers document.
  for (const offer of offers) {
    const applicationId = String(offer.applicationId || ""), number = Number(offer.currentVersion || 1);
    if (!applicationId || seen.has(`${applicationId}:${number}`)) continue;
    rows.push(build(offer, applicationId, number, liveStatus(offer.status, offer.expiresOn, now), true));
  }
  return rows;
}

const SORTS: Record<string, (a: OfferRow, b: OfferRow) => number> = {
  newest: (a, b) => String(b.sentOn || "").localeCompare(String(a.sentOn || "")) || b.version - a.version,
  oldest: (a, b) => String(a.sentOn || "").localeCompare(String(b.sentOn || "")) || a.version - b.version,
  name: (a, b) => a.name.localeCompare(b.name) || b.version - a.version,
  start: (a, b) => String(a.startOn || "").localeCompare(String(b.startOn || "")) || a.name.localeCompare(b.name),
};

/** Filters, counts, sorts and pages offer rows. Counts ignore the status/type being filtered on. */
export function pageOfferRows(rows: OfferRow[], params: Record<string, any>) {
  const query = (typeof params.search === "string" ? params.search : "").trim().toLowerCase().slice(0, 120);
  const terms = query.split(/\s+/).filter(Boolean);
  const status = OFFER_STATUSES.includes(params.status) ? params.status as OfferStatus : null;
  const type = OFFER_TYPES.includes(params.type) ? params.type as OfferType : null;
  const currentOnly = params.currentOnly === true || params.currentOnly === "true";
  const matching = rows.filter((row) => {
    if (currentOnly && !row.current) return false;
    if (!terms.length) return true;
    const haystack = `${row.name} ${row.email} ${row.college} ${row.program} ${row.applicationId}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  const statuses: Record<string, number> = {}, types: Record<string, number> = {};
  for (const row of matching) {
    if (!type || row.type === type) statuses[row.status] = (statuses[row.status] || 0) + 1;
    if (!status || row.status === status) types[row.type] = (types[row.type] || 0) + 1;
  }
  const filtered = matching.filter((row) => (!status || row.status === status) && (!type || row.type === type));
  filtered.sort(SORTS[params.sort] || SORTS.newest);
  const pageSize = Math.max(1, Math.min(100, Math.floor(Number(params.pageSize) || 25)));
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize, counts: { statuses, types, all: matching.length } };
}

/** `offer.list`: admin only. */
export async function listOffers(collection: (name: string) => any, params: Record<string, any>, isAdminActor: boolean) {
  if (!isAdminActor) throw new DomainError("FORBIDDEN", "Only an admin can view all offers.");
  const [offers, versions] = await Promise.all([
    collection("offers").find({}).limit(20_000).toArray(),
    collection("offer_versions").find({}).limit(50_000).toArray(),
  ]);
  const ids = [...new Set([...offers, ...versions].map((row: any) => String(row.applicationId || "")).filter(Boolean))];
  const apps = await collection("applications").find({ _id: { $in: ids } }, { projection: { name: 1, email: 1, college: 1, program: 1 } }).toArray();
  return pageOfferRows(offerRows(offers, versions, new Map(apps.map((app: any) => [String(app._id), app]))), params);
}
