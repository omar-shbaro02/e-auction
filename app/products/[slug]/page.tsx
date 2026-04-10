import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductAuctionView } from "@/components/product-auction-view";
import { featuredListings, getListingBySlug } from "@/lib/data";
import { absoluteUrl, listingJsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return featuredListings.map((listing) => ({ slug: listing.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = getListingBySlug(slug);

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
  const listing = getListingBySlug(slug);

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
