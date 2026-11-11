import { ProgramEditorPage } from "@/components/admin/content-pages";

export default async function Page({ params }) {
  const { programId } = await params;
  return <ProgramEditorPage programId={programId} />;
}
