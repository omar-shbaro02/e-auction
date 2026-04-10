"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Listing, ShowcaseCategory } from "@/lib/data";
import { formatCurrency } from "@/lib/data";
import { searchListings } from "@/lib/search";

type Props = {
  activeCategory: string;
  listings: Listing[];
  mode: string;
  query: string;
  showcaseCategories: ShowcaseCategory[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function filterListings(
  listings: Listing[],
  query: string,
  activeCategory: string,
  mode: string
) {
  const normalizedCategory = normalize(activeCategory);
  const normalizedMode = normalize(mode);
  const searched = query.trim() ? searchListings(listings, query) : listings;

  return searched.filter((listing) => {
    const matchesCategory = !normalizedCategory
      ? true
      : listing.category.toLowerCase() === normalizedCategory;

    const matchesMode =
      !normalizedMode || normalizedMode === "all"
        ? true
        : normalizedMode === "auction"
          ? listing.mode === "auction" || listing.mode === "hybrid"
          : normalizedMode === "purchase"
            ? listing.mode === "buy-now" || listing.mode === "hybrid"
            : true;

    return matchesCategory && matchesMode;
  });
}

export function CategoryBrowser({
  activeCategory,
  listings,
  mode,
  query,
  showcaseCategories
}: Props) {
  const filteredListings = useMemo(
    () => filterListings(listings, query, activeCategory, mode),
    [activeCategory, listings, mode, query]
  );

  return (
    <main className="site-shell category-page">
      <section className="category-page-hero">
        <div>
          <span className="eyebrow">Marketplace navigation</span>
          <h1>Browse lots by category, then narrow by search.</h1>
          <p>
            Use category filters and the header search together to move between auction inventory,
            buy-now stock, and hybrid lots with a cleaner buyer flow.
          </p>
        </div>
        <div className="category-hero-stats">
          <article className="detail-card">
            <small className="muted">Active category</small>
            <h3>{activeCategory || "All categories"}</h3>
          </article>
          <article className="detail-card">
            <small className="muted">Marketplace mode</small>
            <h3>{mode || "All lots"}</h3>
          </article>
        </div>
      </section>

      <section className="page-section">
        <div className="category-filter-row">
          <Link
            className={!activeCategory ? "category-filter active" : "category-filter"}
            href={{ pathname: "/categories" }}
          >
            All
          </Link>
          {showcaseCategories.map((category) => (
            <Link
              className={activeCategory === category.name ? "category-filter active" : "category-filter"}
              href={{ pathname: "/categories", query: { category: category.name } }}
              key={category.name}
            >
              {category.name}
            </Link>
          ))}
        </div>
        <div className="category-mode-row">
          <Link
            className={!mode || mode === "all" ? "category-filter active" : "category-filter"}
            href={{
              pathname: "/categories",
              query: {
                ...(activeCategory ? { category: activeCategory } : {}),
                ...(query ? { q: query } : {})
              }
            }}
          >
            All lots
          </Link>
          <Link
            className={mode === "auction" ? "category-filter active" : "category-filter"}
            href={{
              pathname: "/categories",
              query: {
                ...(activeCategory ? { category: activeCategory } : {}),
                ...(query ? { q: query } : {}),
                mode: "auction"
              }
            }}
          >
            E-auction
          </Link>
          <Link
            className={mode === "purchase" ? "category-filter active" : "category-filter"}
            href={{
              pathname: "/categories",
              query: {
                ...(activeCategory ? { category: activeCategory } : {}),
                ...(query ? { q: query } : {}),
                mode: "purchase"
              }
            }}
          >
            Purchase
          </Link>
        </div>
      </section>

      <section className="page-section">
        <div className="section-title-row">
          <h2>{filteredListings.length} Matching Lots</h2>
          <span className="muted">
            {query ? `Search: "${query}"` : "Showing the full showcase catalog"}
          </span>
        </div>

        <div className="showcase-product-grid">
          {filteredListings.map((listing) => (
            <article className="showcase-product-card" key={listing.slug}>
              <div
                className="showcase-product-art"
                style={{ ["--card-gradient" as string]: listing.gradient }}
              >
                <span>{listing.category}</span>
              </div>

              <div className="showcase-product-copy">
                <div className="showcase-chip-row">
                  <span className="showcase-chip">{listing.mode}</span>
                  <span className="showcase-chip">{listing.grade}</span>
                </div>

                <h3>{listing.title}</h3>
                <p>{listing.summary}</p>

                <div className="showcase-price-row">
                  <strong>{formatCurrency(listing.buyNowPrice ?? listing.currentBid ?? 0)}</strong>
                  <span>{listing.buyNowPrice ? "Buy now available" : `Current bid - ${listing.endsIn}`}</span>
                </div>

                <div className="showcase-meta">
                  <span>{listing.location}</span>
                  <span>{listing.shipping}</span>
                </div>

                <Link className="auction-button" href={`/products/${listing.slug}`}>
                  Open lot
                </Link>
              </div>
            </article>
          ))}
        </div>

        {!filteredListings.length ? (
          <div className="category-empty-state detail-card">
            <h3>No lots match that filter yet.</h3>
            <p>Try a broader search term or switch back to all categories.</p>
            <Link className="auction-button" href={{ pathname: "/categories" }}>
              Reset filters
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
