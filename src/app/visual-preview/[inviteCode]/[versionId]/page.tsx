import { notFound } from "next/navigation";
import WeddingPage from "@/components/wedding/WeddingPage";
import { getFeaturedGalleryMedia } from "@/lib/wedding-gallery-server";
import { buildCssOverrides } from "@/lib/wedding-config-server";
import { applyVisualSnapshot } from "@/lib/visual-versions";
import { loadVisualContext, loadVisualVersion, VisualVersionError } from "@/lib/visual-versions-server";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function VisualPreviewPage({
  params, searchParams,
}: {
  params: Promise<{ inviteCode: string; versionId: string }>;
  searchParams: Promise<{ revision?: string; seccion?: string }>;
}) {
  const { inviteCode, versionId } = await params;
  const rawSearchParams = await searchParams;
  const { revision } = rawSearchParams;
  const context = await loadVisualContext(inviteCode).catch((error: unknown) => {
    if (error instanceof VisualVersionError && (error.status === 403 || error.status === 404)) notFound();
    throw error;
  });
  if (revision !== context.revision) return <p role="alert">La configuracion ha cambiado. Vuelve a previsualizar desde el panel.</p>;
  const config = versionId === "current" ? context.config
    : applyVisualSnapshot(context.config, (await loadVisualVersion(context, versionId)).snapshot).config;
  const galleryMedia = await getFeaturedGalleryMedia();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: buildCssOverrides(config) }} />
      <WeddingPage config={config} galleryMedia={galleryMedia} preview rawSearchParams={rawSearchParams}
        homePath={`/visual-preview/${encodeURIComponent(inviteCode)}/${versionId}`} />
    </>
  );
}
