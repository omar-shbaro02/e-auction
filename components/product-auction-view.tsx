"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Listing } from "@/lib/data";
import { formatCurrency } from "@/lib/data";
import {
  closeAuction,
  createLiveAuctionState,
  formatAuctionCountdown,
  getNextMinimumBid,
  getRecommendedBids
} from "@/lib/auction";
import { addItemToCart } from "@/lib/cart";

type Props = {
  listing: Listing;
};

type BidEvent = {
  label: string;
  detail: string;
};

type StoredBid = {
  id: string;
  amount: number;
  maxAmount?: number;
  status?: "active" | "winning" | "outbid" | "cancelled";
  createdAt: string;
  bidderName: string;
  bidderEmail: string;
  isCurrentUser: boolean;
};

type BidNotification = {
  event: BidEvent;
  endsAt: number;
};

type WinSplash = {
  winningBid: number;
};

const BID_NOTIFICATION_DURATION_MS = 30_000;
const BID_NOTIFICATION_STEP_MS = 10_000;

function createInitialEvents(listing: Listing): BidEvent[] {
  const increment = listing.bidIncrement ?? 25;
  const openingBid = listing.currentBid ?? listing.minimumBid ?? listing.buyNowPrice ?? 0;

  if (listing.mode === "buy-now") {
    return [
      { label: "Catalog loaded", detail: `Buy now available at ${formatCurrency(openingBid)}.` },
      { label: "Dispatch profile", detail: listing.shipping }
    ];
  }

  return [
    {
      label: "Current leading bid",
      detail: `${formatCurrency(openingBid)} with ${listing.bidCount ?? 0} total bids`
    },
    {
      label: "Bid increment",
      detail: `${formatCurrency(increment)} minimum raise`
    },
    {
      label: "Reserve status",
      detail: listing.reserveMet ? "Reserve met" : "Reserve not yet met"
    }
  ];
}

function bidsToEvents(bids: StoredBid[]): BidEvent[] {
  return bids.slice(0, 6).map((bid) => ({
    label: bid.isCurrentUser ? "Your bid recorded" : `${bid.bidderName} placed a bid`,
    detail: `${formatCurrency(bid.amount)} on ${new Date(bid.createdAt).toLocaleString()}`
  }));
}

export function ProductAuctionView({ listing }: Props) {
  const router = useRouter();
  const [listingState, setListingState] = useState(listing);
  const [auction, setAuction] = useState(() => createLiveAuctionState(listing));
  const increment = listingState.bidIncrement ?? 25;
  const initialValue = listingState.currentBid ?? listingState.minimumBid ?? listingState.buyNowPrice ?? 0;
  const [maxBidInput, setMaxBidInput] = useState(String(initialValue + increment * 3));
  const [status, setStatus] = useState(
    listingState.mode === "buy-now"
      ? "This lot is direct purchase ready."
      : "This auction is backed by the database. Place a bid to persist it server-side."
  );
  const [events, setEvents] = useState<BidEvent[]>(createInitialEvents(listingState));
  const [bidNotification, setBidNotification] = useState<BidNotification | null>(null);
  const [winSplash, setWinSplash] = useState<WinSplash | null>(null);
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [now, setNow] = useState(Date.now());

  const isBiddable = listingState.mode !== "buy-now";
  const currentBid = auction.currentBid;
  const nextMinimumBid = getNextMinimumBid(currentBid, increment);
  const recommendedBids = useMemo(
    () => getRecommendedBids(currentBid, increment),
    [currentBid, increment]
  );
  const remainingMs = Math.max(auction.endsAt - now, 0);
  const countdownLabel = formatAuctionCountdown(remainingMs);
  const reserveGap =
    auction.reservePrice === null ? 0 : Math.max(auction.reservePrice - auction.currentBid, 0);
  const notificationRemainingMs = bidNotification ? Math.max(bidNotification.endsAt - now, 0) : 0;
  const notificationCount = bidNotification
    ? Math.max(1, Math.ceil(notificationRemainingMs / BID_NOTIFICATION_STEP_MS))
    : 0;
  const notificationSeconds = Math.ceil(notificationRemainingMs / 1000);

  const auctionPillState = useMemo(() => {
    if (listingState.mode === "buy-now") {
      return "buy-now";
    }

    if (auction.leadingBidder === "user") {
      return "leading";
    }

    return "watching";
  }, [auction.leadingBidder, listingState.mode]);

  useEffect(() => {
    setAuction(createLiveAuctionState(listingState));
    setEvents(createInitialEvents(listingState));
  }, [listingState.slug]);

  useEffect(() => {
    if (!isBiddable || auction.isClosed) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [auction.isClosed, isBiddable]);

  useEffect(() => {
    async function hydrateBidActivity() {
      if (!isBiddable) {
        return;
      }

      try {
        const response = await fetch(`/api/items/${listingState.slug}/bids`, { cache: "no-store" });
        const result = (await response.json()) as {
          ok: boolean;
          listing?: Listing;
          bids?: StoredBid[];
        };

        if (!result.ok || !result.listing) {
          return;
        }

        setListingState(result.listing);
        setAuction((current) => {
          const next = createLiveAuctionState(result.listing as Listing, Date.now());
          return {
            ...current,
            currentBid: next.currentBid,
            bidCount: next.bidCount,
            reserveMet: next.reserveMet,
            reservePrice: next.reservePrice,
            startedAt: next.startedAt,
            endsAt: next.endsAt,
            isClosed: next.isClosed
          };
        });

        if (result.bids?.length) {
          setEvents(bidsToEvents(result.bids));
        }
      } catch {
        // Keep page usable even if bid hydration fails.
      }
    }

    hydrateBidActivity();
  }, [isBiddable, listingState.slug]);

  useEffect(() => {
    if (!bidNotification || notificationRemainingMs > 0) {
      return;
    }

    setBidNotification(null);
  }, [bidNotification, notificationRemainingMs]);

  useEffect(() => {
    if (!isBiddable || auction.isClosed || remainingMs > 0) {
      return;
    }

    const finalState = closeAuction(auction);
    setAuction(finalState);
    setStatus(
      finalState.leadingBidder === "user"
        ? "Auction closed. You are the current winning bidder."
        : "Auction closed. Bidding has ended."
    );

    if (finalState.leadingBidder === "user") {
      setWinSplash({ winningBid: finalState.currentBid });
    }
  }, [auction, isBiddable, remainingMs]);

  function addEvent(event: BidEvent) {
    setEvents((current) => [event, ...current].slice(0, 6));
    setBidNotification({
      event,
      endsAt: Date.now() + BID_NOTIFICATION_DURATION_MS
    });
  }

  function handleBuyNow() {
    const price = listingState.buyNowPrice ?? listingState.currentBid ?? 0;
    addItemToCart({ slug: listingState.slug, title: listingState.title, price, quantity: 1 });
    router.push("/checkout" as Route);
  }

  function handleWinCheckout() {
    if (!winSplash) {
      return;
    }

    addItemToCart({
      slug: listingState.slug,
      title: listingState.title,
      price: winSplash.winningBid,
      quantity: 1
    });
    router.push("/checkout" as Route);
  }

  async function placeBid(targetBid: number) {
    if (!isBiddable) {
      setStatus("This lot is direct purchase only. Use Buy Now to secure the inventory.");
      return;
    }

    if (auction.isClosed) {
      setStatus("This auction has already ended.");
      return;
    }

    setIsSubmittingBid(true);

    try {
      const response = await fetch(`/api/items/${listingState.slug}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount: targetBid })
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        listing?: Listing;
        bids?: StoredBid[];
      };

      if (!response.ok || !result.ok || !result.listing) {
        setStatus(result.error || "Unable to place bid.");
        return;
      }

      setListingState(result.listing);
      setAuction((current) => ({
        ...current,
        currentBid: result.listing?.currentBid ?? current.currentBid,
        bidCount: result.listing?.bidCount ?? current.bidCount,
        reserveMet: Boolean(result.listing?.reserveMet),
        reservePrice: result.listing?.reservePrice ?? current.reservePrice,
        startedAt: result.listing?.startAt ? new Date(result.listing.startAt).getTime() : current.startedAt,
        endsAt: result.listing?.endAt ? new Date(result.listing.endAt).getTime() : current.endsAt,
        isClosed:
          result.listing?.status === "closed" ||
          result.listing?.status === "sold" ||
          result.listing?.status === "archived",
        leadingBidder: "user",
        userLastBid: result.listing?.currentBid ?? current.userLastBid,
        userMaxBid: result.listing?.currentBid ?? current.userMaxBid
      }));

      setStatus(`Bid accepted at ${formatCurrency(result.listing.currentBid ?? targetBid)}.`);
      setMaxBidInput(String((result.listing.currentBid ?? targetBid) + increment * 2));

      if (result.bids?.length) {
        setEvents(bidsToEvents(result.bids));
      }

      addEvent({
        label: "Bid accepted",
        detail: `Your bid is now leading at ${formatCurrency(result.listing.currentBid ?? targetBid)}.`
      });
    } catch {
      setStatus("Unable to place bid right now. Please try again.");
    } finally {
      setIsSubmittingBid(false);
    }
  }

  return (
    <main className="site-shell auction-page">
      {bidNotification ? (
        <div className="auction-bid-notification" aria-live="polite">
          <div className="auction-bid-notification-card">
            <span className="auction-bid-notification-kicker">Bid Alert</span>
            <strong className="auction-bid-notification-count">{notificationCount}</strong>
            <p className="auction-bid-notification-title">{bidNotification.event.label}</p>
            <p className="auction-bid-notification-detail">{bidNotification.event.detail}</p>
            <p className="auction-bid-notification-timer">
              {Math.max(notificationSeconds, 0)}s left in this 30-second bid notice
            </p>
          </div>
        </div>
      ) : null}

      {winSplash ? (
        <div className="auction-win-splash" aria-live="assertive">
          <div className="auction-win-splash-card">
            <span className="auction-win-splash-kicker">Auction Won</span>
            <h2>You won this bid</h2>
            <p className="auction-win-splash-detail">
              Your winning bid was {formatCurrency(winSplash.winningBid)}. Proceed to checkout to secure
              the lot.
            </p>
            <div className="auction-win-splash-actions">
              <button className="auction-maxbid-button" onClick={handleWinCheckout} type="button">
                Proceed to checkout
              </button>
              <button
                className="auction-secondary-cta"
                onClick={() => setWinSplash(null)}
                type="button"
              >
                Stay on page
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="auction-hero-shell">
        <div className="auction-visual-panel" style={{ ["--card-gradient" as string]: listingState.gradient }}>
          <div className="auction-visual-badge-row">
            <span className="auction-lot-badge">{listingState.category}</span>
            <span className="auction-lot-badge auction-mode-badge">{listingState.mode}</span>
          </div>
          <div className="auction-visual-floor">
            <strong>{listingState.lotNumber ?? "LOT"}</strong>
            <span>{listingState.seller ?? "Marketplace seller"}</span>
          </div>
        </div>

        <div className="auction-summary-panel">
          <div className="auction-topline">
            <span className="eyebrow">{listingState.category}</span>
            <div className={`auction-state-pill ${auctionPillState}`}>
              {listingState.mode === "buy-now"
                ? "Buy now"
                : auction.leadingBidder === "user"
                  ? "You are leading"
                  : auction.isClosed
                    ? "Auction closed"
                    : "Bidding live"}
            </div>
          </div>

          <h1>{listingState.title}</h1>
          <p className="auction-summary-copy">{listingState.summary}</p>

          <div className="listing-chip-row">
            <span className="chip">{listingState.grade}</span>
            <span className="chip">{listingState.location}</span>
            <span className="chip">{listingState.watchers ?? 0} watchers</span>
            <span className="chip">{listingState.status ?? "draft"}</span>
          </div>

          <div className="auction-metric-grid">
            <article className="detail-card auction-metric-card featured">
              <small className="muted">{isBiddable ? "Current bid" : "Buy now price"}</small>
              <h3>{formatCurrency(currentBid)}</h3>
              <p>{isBiddable ? `${auction.bidCount} bids placed` : "Ready for immediate checkout"}</p>
            </article>
            <article className="detail-card auction-metric-card">
              <small className="muted">{isBiddable ? "Bid increment" : "Purchase mode"}</small>
              <h3>{isBiddable ? formatCurrency(increment) : "Buy now"}</h3>
              <p>{isBiddable ? "Minimum raise required" : "No auction timer on this lot"}</p>
            </article>
            <article className="detail-card auction-metric-card">
              <small className="muted">Auction timing</small>
              <h3>{isBiddable ? countdownLabel : "Buy now only"}</h3>
              <p>{auction.isClosed ? "Auction finished" : auction.reserveMet ? "Reserve met" : "Reserve not met"}</p>
            </article>
            <article className="detail-card auction-metric-card">
              <small className="muted">Fulfilment</small>
              <h3>{listingState.shipping}</h3>
              <p>{listingState.stock} lot available</p>
            </article>
          </div>
        </div>
      </section>

      <section className="auction-detail-grid page-section">
        <div className="auction-bid-panel detail-card">
          <div className="auction-panel-header">
            <div>
              <small className="muted">{isBiddable ? "Server-backed bidding console" : "Direct purchase console"}</small>
              <h3>{isBiddable ? "Bid on this lot" : "Buy this lot now"}</h3>
            </div>
            {listingState.buyNowPrice ? (
              <div className="auction-buy-now-chip">Buy now {formatCurrency(listingState.buyNowPrice)}</div>
            ) : null}
          </div>

          <div className="auction-price-strip">
            <div>
              <span>{isBiddable ? "Current bid" : "Buy now price"}</span>
              <strong>{formatCurrency(currentBid)}</strong>
            </div>
            <div>
              <span>{isBiddable ? "Next minimum" : "Availability"}</span>
              <strong>{isBiddable ? formatCurrency(nextMinimumBid) : `${listingState.stock} lot`}</strong>
            </div>
          </div>

          <p className="auction-status-message">{status}</p>

          {isBiddable ? (
            <>
              <div className="auction-guidance-grid">
                <article className="auction-guidance-card">
                  <strong>Auction clock</strong>
                  <p>
                    {listingState.endAt
                      ? `Scheduled close at ${new Date(listingState.endAt).toLocaleString()}.`
                      : `Live now. This lot closes in ${countdownLabel}.`}
                  </p>
                </article>
                <article className="auction-guidance-card">
                  <strong>Bid validation</strong>
                  <p>All bids are validated and persisted server-side before the UI updates.</p>
                </article>
                <article className="auction-guidance-card">
                  <strong>Reserve tracker</strong>
                  <p>
                    {auction.reserveMet
                      ? "Reserve has been met. The lot can now sell to the highest bidder."
                      : `${formatCurrency(reserveGap)} away from reserve.`}
                  </p>
                </article>
              </div>

              <div className="auction-bid-actions">
                <button
                  className="auction-primary-cta"
                  disabled={auction.isClosed || isSubmittingBid}
                  onClick={() => placeBid(nextMinimumBid)}
                  type="button"
                >
                  {isSubmittingBid ? "Submitting..." : `Quick bid ${formatCurrency(nextMinimumBid)}`}
                </button>
                {listingState.buyNowPrice ? (
                  <button className="auction-secondary-cta" onClick={handleBuyNow} type="button">
                    Buy now {formatCurrency(listingState.buyNowPrice)}
                  </button>
                ) : null}
              </div>

              <div className="auction-bid-presets">
                {recommendedBids.map((bid) => (
                  <button
                    className="auction-bid-preset"
                    disabled={auction.isClosed || isSubmittingBid}
                    key={bid}
                    onClick={() => setMaxBidInput(String(bid))}
                    type="button"
                  >
                    {formatCurrency(bid)}
                  </button>
                ))}
              </div>

              <label className="auction-input-group">
                <span>Enter your bid</span>
                <input
                  disabled={auction.isClosed || isSubmittingBid}
                  inputMode="numeric"
                  min={nextMinimumBid}
                  onChange={(event) => setMaxBidInput(event.target.value)}
                  type="number"
                  value={maxBidInput}
                />
              </label>

              <p className="auction-input-note">
                Minimum valid bid is {formatCurrency(nextMinimumBid)}. Custom bids are rounded up to the
                next {formatCurrency(increment)} increment on the server.
              </p>

              <button className="auction-secondary-cta" type="button">
                Review bid terms
              </button>
              <button
                className="auction-maxbid-button"
                disabled={auction.isClosed || isSubmittingBid}
                onClick={() => placeBid(Number(maxBidInput))}
                type="button"
              >
                {isSubmittingBid ? "Saving..." : "Place bid"}
              </button>
            </>
          ) : (
            <div className="auction-guidance-grid">
              <article className="auction-guidance-card">
                <strong>Checkout ready</strong>
                <p>
                  This lot is available for direct purchase only. The listed price locks the inventory
                  immediately once checkout is completed.
                </p>
              </article>
              <article className="auction-guidance-card">
                <strong>Fast action</strong>
                <p>
                  Add this lot to cart from the marketplace or continue with Buy Now to reserve it
                  before another buyer does.
                </p>
                <button className="auction-maxbid-button" onClick={handleBuyNow} type="button">
                  Buy now {formatCurrency(listingState.buyNowPrice ?? currentBid)}
                </button>
              </article>
            </div>
          )}
        </div>

        <div className="auction-activity-panel detail-card">
          <div className="auction-panel-header">
            <div>
              <small className="muted">Market activity</small>
              <h3>Recent bidding</h3>
            </div>
          </div>

          <div className="auction-activity-list">
            {events.map((event, index) => (
              <article className="auction-activity-item" key={`${event.label}-${index}`}>
                <strong>{event.label}</strong>
                <p>{event.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="detail-grid">
          <article className="detail-card">
            <h3>Why this lot works</h3>
            <ul className="plain-list">
              {listingState.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </article>

          <article className="detail-card">
            <h3>Suggested buyer actions</h3>
            <ul className="plain-list">
              <li>Review the manifest and condition notes before placing a bid.</li>
              <li>
                {isBiddable
                  ? "All accepted bids are written to the database and reflected in the item snapshot."
                  : "Use Buy Now to secure the lot before inventory changes."}
              </li>
              <li>Confirm shipping and pickup terms before checkout or settlement.</li>
            </ul>
          </article>

          <article className="detail-card">
            <h3>Auction summary</h3>
            <ul className="plain-list">
              <li>Seller: {listingState.seller ?? "Marketplace seller"}</li>
              <li>Lot number: {listingState.lotNumber ?? "Unassigned"}</li>
              <li>Watchers: {listingState.watchers ?? 0}</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}

