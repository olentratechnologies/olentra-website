import { InternProfilePage } from "@/components/admin/content-pages";

export default async function Page({ params }) {
  const { internId } = await params;
  return <InternProfilePage internId={internId} />;
}
