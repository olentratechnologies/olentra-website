import { ChangeReviewPage } from "@/components/admin/governance-pages";

export default async function Page({ params }) {
  const { changeId } = await params;
  return <ChangeReviewPage changeId={changeId} />;
}
