import ApplicantDetailPage from "@/components/intern/dashboard/ApplicantDetailPage";

// A fixed title: applicant names stay out of browser tabs, history and shared links.
export const metadata = { title: "Applicant Details" };

export default async function Page({ params }) {
  const { applicationId } = await params;
  return <ApplicantDetailPage applicationId={applicationId} />;
}
