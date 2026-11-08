import { IncidentDetailPage } from "@/components/admin/operations-pages";

export default async function Page({ params }) {
  const { incidentId } = await params;
  return <IncidentDetailPage incidentId={incidentId} />;
}
