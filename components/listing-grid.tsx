import Link from "next/link";
import { formatCurrency, type Listing } from "@/lib/data";

type Props = {
  listings: Listing[];
};

export function ListingGrid({ listings }: Props) {
  return (
    <div className="listing-grid">
      {listings.map((listing) => (
        <article className="listing-card" key={listing.slug}>
          <div
            className="listing-visual"
            style={{ ["--card-gradient" as string]: listing.gradient }}
          />
          <div className="listing-content">
            <div className="listing-chip-row">
              <span className="chip">{listing.mode}</span>
              <span className="chip">{listing.category}</span>
            </div>

            <div className="listing-title-row" style={{ marginTop: 14 }}>
              <h3>{listing.title}</h3>
              <small className="listing-meta">{listing.location}</small>
            </div>

            <p>{listing.summary}</p>

            <div className="price-row">
              <strong>{formatCurrency(listing.buyNowPrice ?? listing.currentBid ?? 0)}</strong>
              <small className="listing-meta">
                {listing.buyNowPrice
                  ? "Buy now"
                  : `Current bid${listing.endsIn ? ` - ${listing.endsIn}` : ""}`}
              </small>
            </div>

            <ul className="plain-list" style={{ marginTop: 16 }}>
              {listing.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <Link className="button-primary" href={`/products/${listing.slug}`}>
                View lot
              </Link>
              <Link className="button-secondary" href={`/products/${listing.slug}`}>
                View details
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
