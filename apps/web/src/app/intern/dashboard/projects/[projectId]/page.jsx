import ProjectDetailPage from "@/components/intern/dashboard/ProjectDetailPage";

export const metadata = { title: "Project" };

export default async function Page({ params, searchParams }) {
  const { projectId } = await params;
  const { tab } = await searchParams;
  return <ProjectDetailPage key={projectId} projectId={projectId} initialTab={typeof tab === "string" ? tab : "overview"} />;
}
