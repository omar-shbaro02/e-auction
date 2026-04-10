import { CategoryBrowser } from "@/components/category-browser";
import { showcaseCategories } from "@/lib/data";
import { getMarketplaceListings } from "@/lib/marketplace";

type Props = {
  searchParams: Promise<{ category?: string; mode?: string; q?: string }>;
};

export default async function CategoriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const featuredListings = await getMarketplaceListings();

  return (
    <CategoryBrowser
      activeCategory={params.category ?? ""}
      listings={featuredListings}
      mode={params.mode ?? ""}
      query={params.q ?? ""}
      showcaseCategories={showcaseCategories}
    />
  );
}
