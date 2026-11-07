import data from "@/data/intern-dashboard.json";
import ApplicantDetailPage from "@/components/intern/dashboard/ApplicantDetailPage";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const application = data.applications.find((item) => item.id === id);
  return {
    title: application
      ? `${application.name} · Application`
      : "Applicant Details",
  };
}
export default async function Page({ params }) {
  const { id } = await params;
  return <ApplicantDetailPage id={id} />;
}
