import { getWeddingConfig } from "@/lib/wedding-config-server";
import DatosBodaView from "@/components/admin/DatosBodaView";

export default async function DatosPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const config = await getWeddingConfig();

  return <DatosBodaView inviteCode={inviteCode} config={config} />;
}
