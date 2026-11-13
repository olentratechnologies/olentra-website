import { DomainError } from "../../shared/errors";

export type ChecklistItem = { id: string; label: string; required: boolean };
export type DocumentEntry = { attachmentId: string; name: string; status: "Submitted" | "Approved" | "Changes requested"; note?: string; uploadedOn: string; reviewedOn?: string };

/** Checks the admin's onboarding document list: up to 10 named items. */
export function validateChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value) || value.length > 10) throw new DomainError("INVALID_REQUEST", "Use up to 10 onboarding documents.");
  const seen = new Set<string>();
  return value.map((entry: any, index) => {
    const label = typeof entry?.label === "string" ? entry.label.trim().slice(0, 60) : "";
    if (!label) throw new DomainError("INVALID_REQUEST", "Name every onboarding document.");
    const id = (typeof entry?.id === "string" && entry.id.trim() ? entry.id.trim() : label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `document-${index + 1}`).slice(0, 40);
    if (seen.has(id)) throw new DomainError("INVALID_REQUEST", "Each onboarding document needs a different name.");
    seen.add(id);
    return { id, label, required: entry?.required !== false };
  });
}

/** Required documents that aren't approved yet (empty means onboarding can be approved). */
export function missingDocuments(checklist: ChecklistItem[], documents: Record<string, DocumentEntry> | undefined) {
  return checklist.filter(item => item.required && documents?.[item.id]?.status !== "Approved");
}
