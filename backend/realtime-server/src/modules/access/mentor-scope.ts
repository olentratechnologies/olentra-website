import type { Collection, Document } from "mongodb";
import type { Principal } from "../../shared/principal";

/**
 * Staff with the built-in "mentor" role only see the interns assigned to
 * them. Returns their interns' application ids, or null when the person
 * isn't limited this way (admins and every other role).
 */
export async function mentorScope(actor: Principal | null, interns: Collection<Document & { _id: string }>): Promise<string[] | null> {
  if (actor?.role !== "company" || (actor as Principal & { staffRole?: string }).staffRole !== "mentor") return null;
  const rows = await interns.find({ mentorId: actor.id }, { projection: { applicationId: 1 } }).limit(1000).toArray();
  return rows.map(row => String(row.applicationId));
}
