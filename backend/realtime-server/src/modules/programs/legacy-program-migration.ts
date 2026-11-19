import type { Collection, Document } from "mongodb";

export const PROGRAM_ID = "software-engineer";
export const PROGRAM_NAME = "Software Engineer Intern";
export const LEGACY_PROGRAM_IDS = ["explorer", "innovator"] as const;
export const LEGACY_PROGRAM_NAMES = ["Tech Explorer", "Tech Innovator"] as const;

type Row = Document & { _id: string };
type CollectionOf = (name: string) => Collection<Row>;

/** Idempotently reassign records created under the retired internship tracks. */
export async function migrateLegacyPrograms(collection: CollectionOf) {
  const legacyNames = [...LEGACY_PROGRAM_NAMES];
  const legacyIds = [...LEGACY_PROGRAM_IDS];
  const programRef = {
    $or: [
      { programId: { $in: legacyIds } },
      { program: { $in: legacyNames } },
    ],
  };

  for (const name of ["applications", "interns", "projects", "certificates", "stories"]) {
    await collection(name).updateMany(programRef, {
      $set: { programId: PROGRAM_ID, program: PROGRAM_NAME },
    });
  }

  const resources = collection("resources");
  await resources.updateMany({ programIds: { $in: legacyIds } }, { $addToSet: { programIds: PROGRAM_ID } });
  await resources.updateMany({ programIds: { $in: legacyIds } }, { $pull: { programIds: { $in: legacyIds } } } as any);

  await collection("notifications").updateMany({ audience: { $in: legacyIds } }, { $set: { audience: PROGRAM_ID } });
  await collection("views").updateMany({ "filters.programId": { $in: legacyIds } }, { $set: { "filters.programId": PROGRAM_ID } });
  await collection("programs").deleteMany({ _id: { $in: legacyIds } });
  await collection("settings").updateOne(
    { _id: "program" },
    { $unset: { explorerEnabled: "", innovatorEnabled: "" } },
  );
}
