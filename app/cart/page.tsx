import { CartView } from "@/components/cart-view";
import { getMarketplaceListings } from "@/lib/marketplace";

export default async function CartPage() {
  const featuredListings = await getMarketplaceListings();
  return <CartView listings={featuredListings} />;
}
