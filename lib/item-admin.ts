import "server-only";

import type { Listing, ListingMode, ListingStatus } from "@/lib/data";

export type AdminItemInput = {
  slug?: string;
  title: string;
  category: string;
  summary: string;
  mode: ListingMode;
  status?: ListingStatus;
  location: string;
  shipping: string;
  currentBid?: number | null;
  buyNowPrice?: number | null;
  minimumBid?: number | null;
  reservePrice?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  stock?: number | null;
  grade: string;
  gradient?: string;
  highlights?: string[] | string | null;
  seoDescription?: string;
  currencyCode?: string;
  bidIncrement?: number | null;
  bidCount?: number | null;
  watchers?: number | null;
  reserveMet?: boolean | null;
  seller?: string | null;
  lotNumber?: string | null;
  imageUrls?: string[] | string | null;
  heroImageUrl?: string | null;
};

export type AdminItemRecord = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  mode: ListingMode;
  status: ListingStatus;
  location: string;
  shipping: string;
  currentBid: number | null;
  buyNowPrice: number | null;
  minimumBid: number | null;
  reservePrice: number | null;
  startAt: string | null;
  endAt: string | null;
  stock: number;
  grade: string;
  gradient: string;
  highlights: string[];
  seoDescription: string;
  currencyCode: string;
  bidIncrement: number | null;
  bidCount: number | null;
  watchers: number | null;
  reserveMet: boolean | null;
  seller: string | null;
  lotNumber: string | null;
  imageUrls: string[];
  heroImageUrl: string | null;
};

const defaultGradient = "linear-gradient(135deg, #dbe6ff 0%, #edf2ff 100%)";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(normalized) ? normalized : null;
}

function parseInteger(value: unknown) {
  const parsed = parseNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function parseDate(value: unknown) {
  if (!value) {
    return null;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeHighlights(value: AdminItemInput["highlights"]) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export function formatEndsIn(endAt?: string | null, now = Date.now()) {
  if (!endAt) {
    return undefined;
  }

  const endMs = new Date(endAt).getTime();

  if (Number.isNaN(endMs)) {
    return undefined;
  }

  const diffMs = Math.max(endMs - now, 0);
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function normalizeAdminItemInput(input: AdminItemInput): AdminItemRecord {
  const title = String(input.title || "").trim();
  const slug = slugify(input.slug || title);

  if (!title) {
    throw new Error("Title is required.");
  }

  if (!slug) {
    throw new Error("Slug could not be generated.");
  }

  const mode = input.mode;

  if (!["auction", "buy-now", "hybrid"].includes(mode)) {
    throw new Error("Mode must be auction, buy-now, or hybrid.");
  }

  const status = input.status || "draft";
  const startAt = parseDate(input.startAt);
  const endAt = parseDate(input.endAt);
  const currentBid = parseNumber(input.currentBid);
  const buyNowPrice = parseNumber(input.buyNowPrice);
  const minimumBid = parseNumber(input.minimumBid);
  const reservePrice = parseNumber(input.reservePrice);
  const bidIncrement = parseNumber(input.bidIncrement);
  const bidCount = parseInteger(input.bidCount);
  const watchers = parseInteger(input.watchers);
  const stock = parseInteger(input.stock) ?? 1;

  if ((mode === "auction" || mode === "hybrid") && !minimumBid && !currentBid) {
    throw new Error("Auction items need a minimum bid or current bid.");
  }

  if ((mode === "auction" || mode === "hybrid") && !endAt) {
    throw new Error("Auction items need an end date.");
  }

  if ((mode === "buy-now" || mode === "hybrid") && !buyNowPrice) {
    throw new Error("Buy-now and hybrid items need a buy now price.");
  }

  if (startAt && endAt && new Date(startAt).getTime() >= new Date(endAt).getTime()) {
    throw new Error("Auction start must be before auction end.");
  }

  return {
    slug,
    title,
    category: String(input.category || "").trim() || "Uncategorized",
    summary: String(input.summary || "").trim(),
    mode,
    status,
    location: String(input.location || "").trim() || "Warehouse location pending",
    shipping: String(input.shipping || "").trim() || "Shipping details pending",
    currentBid,
    buyNowPrice,
    minimumBid,
    reservePrice,
    startAt,
    endAt,
    stock: Math.max(stock, 1),
    grade: String(input.grade || "").trim() || "Unspecified",
    gradient: String(input.gradient || "").trim() || defaultGradient,
    highlights: normalizeHighlights(input.highlights),
    seoDescription:
      String(input.seoDescription || "").trim() || String(input.summary || "").trim() || title,
    currencyCode: String(input.currencyCode || "").trim() || "USD",
    bidIncrement,
    bidCount,
    watchers,
    reserveMet: typeof input.reserveMet === "boolean" ? input.reserveMet : null,
    seller: input.seller?.trim() || null,
    lotNumber: input.lotNumber?.trim() || null,
    imageUrls: normalizeHighlights(input.imageUrls),
    heroImageUrl: input.heroImageUrl?.trim() || null
  };
}

export function mapListingToAdminDraft(listing: Listing): AdminItemRecord {
  return {
    slug: listing.slug,
    title: listing.title,
    category: listing.category,
    summary: listing.summary,
    mode: listing.mode,
    status: listing.status ?? "draft",
    location: listing.location,
    shipping: listing.shipping,
    currentBid: listing.currentBid ?? null,
    buyNowPrice: listing.buyNowPrice ?? null,
    minimumBid: listing.minimumBid ?? null,
    reservePrice: listing.reservePrice ?? null,
    startAt: listing.startAt ?? null,
    endAt: listing.endAt ?? null,
    stock: listing.stock,
    grade: listing.grade,
    gradient: listing.gradient,
    highlights: listing.highlights,
    seoDescription: listing.seoDescription || listing.summary || listing.title,
    currencyCode: listing.currencyCode || "USD",
    bidIncrement: listing.bidIncrement ?? null,
    bidCount: listing.bidCount ?? null,
    watchers: listing.watchers ?? null,
    reserveMet: listing.reserveMet ?? null,
    seller: listing.seller ?? null,
    lotNumber: listing.lotNumber ?? null,
    imageUrls: listing.imageUrls ?? [],
    heroImageUrl: listing.heroImageUrl ?? null
  };
}
