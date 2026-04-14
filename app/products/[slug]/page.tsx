import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductAuctionView } from "@/components/product-auction-view";
import { getSeedListings } from "@/lib/marketplace";
import { getMarketplaceListingBySlug } from "@/lib/marketplace";
import { absoluteUrl, listingJsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getSeedListings().map((listing) => ({ slug: listing.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getMarketplaceListingBySlug(slug);

  if (!listing) {
    return {};
  }

  return {
    title: listing.title,
    description: listing.seoDescription,
    openGraph: {
      title: listing.title,
      description: listing.seoDescription,
      url: absoluteUrl(`/products/${listing.slug}`)
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const listing = await getMarketplaceListingBySlug(slug);

  if (!listing) {
    notFound();
  }

  const jsonLd = listingJsonLd(listing);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
      <ProductAuctionView listing={listing} />
    </>
  );
}
