import { getWeddingConfig } from "@/lib/wedding-config-server";
import { getFeaturedGalleryMedia } from "@/lib/wedding-gallery-server";
import WeddingPage from "@/components/wedding/WeddingPage";

export default async function PaginaPrincipal({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [config, galleryMedia, rawSearchParams] = await Promise.all([
    getWeddingConfig(), getFeaturedGalleryMedia(), searchParams,
  ]);
  return <WeddingPage config={config} galleryMedia={galleryMedia} rawSearchParams={rawSearchParams} />;
}
