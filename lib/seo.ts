import type { Listing } from "@/lib/data";
import { currencyCode, siteDescription, siteName } from "@/lib/data";

export function absoluteUrl(path = "/") {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(path, base).toString();
}

export function listingJsonLd(listing: Listing) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.seoDescription,
    category: listing.category,
    brand: siteName,
    offers: {
      "@type": "Offer",
      priceCurrency: currencyCode,
      price: listing.buyNowPrice ?? listing.currentBid ?? 0,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/products/${listing.slug}`)
    }
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    description: siteDescription,
    url: absoluteUrl("/"),
    sameAs: []
  };
}
