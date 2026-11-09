import { PortalProjectDetail } from "@/components/intern/portal/PortalProjects";
export const metadata = { title: "My Project" };
export default async function Page({ params }) {
  const { projectId } = await params;
  return <PortalProjectDetail projectId={projectId} />;
}
