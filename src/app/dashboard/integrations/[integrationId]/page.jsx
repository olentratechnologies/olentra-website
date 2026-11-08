import { IntegrationSettingsPage } from "@/components/admin/governance-pages";

export default async function Page({ params }) {
  const { integrationId } = await params;
  return <IntegrationSettingsPage integrationId={integrationId} />;
}
