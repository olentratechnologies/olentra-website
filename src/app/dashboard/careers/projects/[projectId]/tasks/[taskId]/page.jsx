import { ProjectTaskReviewPage } from "@/components/admin/content-pages";

export default async function Page({ params }) {
  const { projectId, taskId } = await params;
  return <ProjectTaskReviewPage projectId={projectId} taskId={taskId} />;
}
