/**
 * app/admin/[inviteCode]/configuracion/page.tsx
 * Editor de configuración de la web.
 */

import { getWeddingConfig } from "@/lib/wedding-config-server";
import { getFeaturedGalleryMedia } from "@/lib/wedding-gallery-server";
import ConfiguracionView from "@/components/admin/ConfiguracionView";

export default async function ConfiguracionPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const [config, galleryMedia] = await Promise.all([getWeddingConfig(), getFeaturedGalleryMedia()]);

  return <ConfiguracionView inviteCode={inviteCode} config={config} galleryMedia={galleryMedia} />;
}
