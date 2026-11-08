import { FeatureConfigurationPage } from "@/components/admin/core-pages";
export default async function Page({ params }) { const { featureId } = await params; return <FeatureConfigurationPage featureId={featureId} />; }
