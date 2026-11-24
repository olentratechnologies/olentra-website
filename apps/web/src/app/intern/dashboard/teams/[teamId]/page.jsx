import TeamDetailPage from "@/components/intern/dashboard/TeamDetailPage";

export const metadata = { title: "Team" };

export default async function Page({ params, searchParams }) {
  const { teamId } = await params;
  const { tab } = await searchParams;
  return <TeamDetailPage key={teamId} teamId={teamId} initialTab={typeof tab === "string" ? tab : "overview"} />;
}
