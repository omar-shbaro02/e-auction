import "server-only";

import { cache } from "react";
import { featuredListings, formatCurrency, type Listing } from "@/lib/data";
import { getStoredItemBySlug, listStoredItems } from "@/lib/server-db";

export const getMarketplaceListings = cache(async (): Promise<Listing[]> => {
  return await listStoredItems();
});

export const getMarketplaceListingBySlug = cache(async (slug: string): Promise<Listing | null> => {
  return await getStoredItemBySlug(slug);
});

export async function serializeMarketplaceCatalogForAssistant() {
  const listings = await getMarketplaceListings();

  return listings
    .map((listing) => {
      const priceInfo = [
        listing.currentBid ? `Current bid: ${formatCurrency(listing.currentBid)}.` : "",
        listing.buyNowPrice ? `Buy now: ${formatCurrency(listing.buyNowPrice)}.` : "",
        listing.endsIn ? `Ends in ${listing.endsIn}.` : ""
      ]
        .filter(Boolean)
        .join(" ");

      return `${listing.title} in ${listing.category}. ${listing.summary} ${priceInfo} Shipping: ${listing.shipping}. Condition: ${listing.grade}.`;
    })
    .join("\n");
}

export function getSeedListings() {
  return featuredListings;
}
