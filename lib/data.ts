export type ListingMode = "auction" | "buy-now" | "hybrid";

export type Listing = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  mode: ListingMode;
  location: string;
  shipping: string;
  currentBid?: number;
  buyNowPrice?: number;
  endsIn?: string;
  stock: number;
  grade: string;
  gradient: string;
  highlights: string[];
  seoDescription: string;
  bidIncrement?: number;
  bidCount?: number;
  watchers?: number;
  reserveMet?: boolean;
  seller?: string;
  lotNumber?: string;
};

export type ShowcaseCategory = {
  name: string;
  art: string;
  featuredCount: number;
};

export type ShortcutCategory = {
  icon: string;
  title: string;
  subtitle: string;
};

export const currencyCode = "USD";

export const siteName = "LotLane";
export const siteTagline = "Win Better Lots. Move Stock Faster.";
export const siteDescription =
  "LotLane blends timed auctions and direct checkout into one premium B2B resale marketplace for liquidation stock, pallets, and curated surplus inventory.";

export const shortcutCategories: ShortcutCategory[] = [
  {
    icon: "NEW",
    title: "Buy Excess & Clearance Stock",
    subtitle: "Surplus Wholesale"
  },
  {
    icon: "RET",
    title: "Buy Customer Returns Stock",
    subtitle: "Liquidation Lots"
  },
  {
    icon: "BOX",
    title: "Wholesale Boxes",
    subtitle: "Job Lot Parcels"
  },
  {
    icon: "PAL",
    title: "Wholesale Job Lot Pallets",
    subtitle: "Bulk Trade Stock"
  }
];

export const showcaseCategories: ShowcaseCategory[] = [
  { name: "Home & Kitchen", art: "PAN", featuredCount: 124 },
  { name: "Tools & DIY", art: "DRL", featuredCount: 86 },
  { name: "Electronics", art: "GME", featuredCount: 142 },
  { name: "Office", art: "RCK", featuredCount: 53 },
  { name: "Clothing", art: "COT", featuredCount: 77 },
  { name: "Beauty", art: "SKN", featuredCount: 61 }
];

export const faqEntries = [
  {
    question: "How does bidding work?",
    answer:
      "Users place increasing bids until the timed auction ends. The highest valid bid at closing wins, and checkout opens immediately."
  },
  {
    question: "Can buyers skip bidding?",
    answer:
      "Yes. Hybrid listings expose a Buy Now action, while pure retail listings can be purchased instantly with secure checkout."
  },
  {
    question: "What can the AI assistant answer?",
    answer:
      "It can explain navigation, categories, delivery terms, bidding rules, and product highlights based on the catalog data you provide."
  }
];

export const trustPoints = [
  "Role-based admin access and server-side API keys",
  "SEO-ready metadata, sitemap, and machine-readable structured data",
  "Fast browsing with clear auction countdowns and direct purchase shortcuts"
];

export const featuredListings: Listing[] = [
  {
    slug: "dewalt-contractor-tool-bundle",
    title: "DeWalt Contractor Tool Bundle",
    category: "Tools & DIY",
    summary:
      "A mixed contractor lot with cordless drills, impact drivers, batteries, and chargers packed for fast resale.",
    mode: "hybrid",
    location: "Dallas, USA",
    shipping: "Pallet freight across the lower 48",
    currentBid: 2400,
    buyNowPrice: 3190,
    endsIn: "5h 10m",
    stock: 1,
    grade: "Returns A/B mix",
    gradient: "linear-gradient(135deg, #ffe1a8 0%, #f2c55f 100%)",
    highlights: ["96 units", "Manifest included", "Estimated margin 34%"],
    bidIncrement: 50,
    bidCount: 18,
    watchers: 46,
    reserveMet: true,
    seller: "Prime Surplus Supply",
    lotNumber: "TL-2048",
    seoDescription:
      "Bid or buy a DeWalt tool bundle with manifest-backed stock, clear condition notes, and pallet freight delivery."
  },
  {
    slug: "kitchen-appliance-clearance-pallet",
    title: "Kitchen Appliance Clearance Pallet",
    category: "Home & Kitchen",
    summary:
      "Air fryers, blenders, kettles, coffee machines, and countertop appliances from big-box retail overstock.",
    mode: "auction",
    location: "New Jersey, USA",
    shipping: "Warehouse pickup or arranged freight",
    currentBid: 1850,
    endsIn: "14h 45m",
    stock: 1,
    grade: "Overstock",
    gradient: "linear-gradient(135deg, #f8e7c8 0%, #fff4de 100%)",
    highlights: ["72 units", "Retail-ready packaging", "High-turn inventory"],
    bidIncrement: 25,
    bidCount: 11,
    watchers: 29,
    reserveMet: false,
    seller: "Metro Retail Recovery",
    lotNumber: "HK-1182",
    seoDescription:
      "Auction a kitchen appliance pallet featuring overstock small appliances with warehouse pickup and freight support."
  },
  {
    slug: "gaming-accessories-carton-lot",
    title: "Gaming Accessories Carton Lot",
    category: "Electronics",
    summary:
      "Controllers, headsets, charging docks, RGB keyboards, and streaming gear ideal for online marketplaces.",
    mode: "buy-now",
    location: "Los Angeles, USA",
    shipping: "Tracked ground shipping",
    buyNowPrice: 1295,
    stock: 18,
    grade: "Shelf-pull",
    gradient: "linear-gradient(135deg, #dbe6ff 0%, #edf2ff 100%)",
    highlights: ["58 units", "Serialized SKUs", "Fast dispatch"],
    watchers: 14,
    seller: "West Coast Tech Lots",
    lotNumber: "EL-3301",
    seoDescription:
      "Buy a gaming accessories carton lot with fast dispatch, clean packaging, and strong marketplace demand."
  },
  {
    slug: "designer-apparel-mixed-rack",
    title: "Designer Apparel Mixed Rack",
    category: "Clothing",
    summary:
      "A curated fashion lot of outerwear, denim, knitwear, and basics sourced from seasonal retailer clear-outs.",
    mode: "hybrid",
    location: "Miami, USA",
    shipping: "Freight or local pickup",
    currentBid: 3100,
    buyNowPrice: 4125,
    endsIn: "1d 3h",
    stock: 1,
    grade: "Department store returns",
    gradient: "linear-gradient(135deg, #ead6d3 0%, #f7ece9 100%)",
    highlights: ["210 garments", "Assorted sizes", "Boutique-ready assortment"],
    bidIncrement: 100,
    bidCount: 24,
    watchers: 67,
    reserveMet: true,
    seller: "Southline Apparel Auctions",
    lotNumber: "FA-9077",
    seoDescription:
      "Shop a designer apparel mixed rack with curated styles, assorted sizes, and flexible freight pickup."
  },
  {
    slug: "office-furniture-liquidation-set",
    title: "Office Furniture Liquidation Set",
    category: "Office",
    summary:
      "Task chairs, desks, filing cabinets, and monitor arms recovered from a modern office refit project.",
    mode: "auction",
    location: "Chicago, USA",
    shipping: "Local pickup only",
    currentBid: 4200,
    endsIn: "2d 6h",
    stock: 1,
    grade: "Used - very good",
    gradient: "linear-gradient(135deg, #dedede 0%, #f6f6f6 100%)",
    highlights: ["48 pieces", "Commercial grade", "Ideal for startups"],
    bidIncrement: 100,
    bidCount: 9,
    watchers: 18,
    reserveMet: false,
    seller: "Loop Workspace Liquidators",
    lotNumber: "OF-4410",
    seoDescription:
      "Auction an office furniture liquidation set with premium commercial pieces and organized local pickup."
  },
  {
    slug: "beauty-and-skincare-bundle",
    title: "Beauty and Skincare Bundle",
    category: "Beauty",
    summary:
      "Face serums, moisturizers, masks, and gift sets from excess seasonal inventory packed in shelf-ready cartons.",
    mode: "buy-now",
    location: "Phoenix, USA",
    shipping: "Parcel and LTL options",
    buyNowPrice: 980,
    stock: 32,
    grade: "New and sealed",
    gradient: "linear-gradient(135deg, #f7dce7 0%, #fff1f5 100%)",
    highlights: ["120 pieces", "Current expiry windows", "Beauty-store friendly"],
    watchers: 21,
    seller: "Glow Wholesale Outlet",
    lotNumber: "BT-5520",
    seoDescription:
      "Buy a beauty and skincare bundle with sealed inventory, current expiry windows, and quick parcel delivery."
  }
];

export function getListingBySlug(slug: string) {
  return featuredListings.find((listing) => listing.slug === slug);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount);
}

export function serializeCatalogForAssistant() {
  return featuredListings
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
