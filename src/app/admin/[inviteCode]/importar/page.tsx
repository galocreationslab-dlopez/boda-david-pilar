/**
 * app/admin/[inviteCode]/importar/page.tsx
 * Importación de invitaciones desde CSV dentro del panel admin.
 */

import ImportarAdminView from "@/components/admin/ImportarAdminView";

export default async function ImportarPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  return <ImportarAdminView inviteCode={inviteCode} />;
}
