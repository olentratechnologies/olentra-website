import { EnquiryDetailPage } from "@/components/admin/content-pages";

export default async function Page({ params }) {
  const { enquiryId } = await params;
  return <EnquiryDetailPage enquiryId={enquiryId} />;
}
