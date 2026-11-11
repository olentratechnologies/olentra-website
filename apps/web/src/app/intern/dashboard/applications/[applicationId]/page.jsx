import data from "@/data/intern-dashboard.json";
import ApplicantDetailPage from "@/components/intern/dashboard/ApplicantDetailPage";

export async function generateMetadata({ params }) {
  const { applicationId } = await params;
  const application = data.applications.find((item) => item.id === applicationId);
  return {
    title: application
      ? `${application.name} · Application`
      : "Applicant Details",
  };
}
export default async function Page({ params }) {
  const { applicationId } = await params;
  return <ApplicantDetailPage applicationId={applicationId} />;
}
