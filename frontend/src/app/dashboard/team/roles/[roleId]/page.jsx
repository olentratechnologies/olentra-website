import { RolePermissionsPage } from "@/components/admin/operations-pages";

export default async function Page({ params }) {
  const { roleId } = await params;
  return <RolePermissionsPage key={roleId} roleId={roleId} />;
}
