import { PageEditorPage } from "@/components/admin/content-pages";

export default async function Page({ params }) {
  const { pageId } = await params;
  return <PageEditorPage pageId={pageId} />;
}
