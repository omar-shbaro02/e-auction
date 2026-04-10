import { HomeMarketplace } from "@/components/home-marketplace";
import { shortcutCategories, showcaseCategories } from "@/lib/data";
import { getMarketplaceListings } from "@/lib/marketplace";
import { organizationJsonLd } from "@/lib/seo";

type Props = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const jsonLd = organizationJsonLd();
  const params = await searchParams;
  const featuredListings = await getMarketplaceListings();

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
      <HomeMarketplace
        activeCategory={params.category ?? ""}
        featuredListings={featuredListings}
        query={params.q ?? ""}
        shortcutCategories={shortcutCategories}
        showcaseCategories={showcaseCategories}
      />
    </>
  );
}
