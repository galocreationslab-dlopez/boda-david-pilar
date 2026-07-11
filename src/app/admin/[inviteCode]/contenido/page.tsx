import { getWeddingConfig } from "@/lib/wedding-config-server";
import ContenidoView from "@/components/admin/ContenidoView";

export default async function ContenidoPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const config = await getWeddingConfig();

  return <ContenidoView inviteCode={inviteCode} config={config} />;
}