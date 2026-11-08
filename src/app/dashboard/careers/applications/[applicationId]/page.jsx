import { ApplicationReviewPage } from "@/components/admin/content-pages";

export default async function Page({ params }) {
  const { applicationId } = await params;
  return <ApplicationReviewPage applicationId={applicationId} />;
}
