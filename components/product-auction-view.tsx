"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Listing } from "@/lib/data";
import { formatCurrency } from "@/lib/data";
import {
  type BidEvent,
  closeAuction,
  createLiveAuctionState,
  formatAuctionCountdown,
  getNextMinimumBid,
  getRecommendedBids,
  normalizeBidAmount,
  placeMarketBid,
  placeUserBid
} from "@/lib/auction";
import { addItemToCart } from "@/lib/cart";

type Props = {
  listing: Listing;
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

function createInitialEvents(listing: Listing, openingBid: number): BidEvent[] {
  const increment = listing.bidIncrement ?? 25;

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

export function ProductAuctionView({ listing }: Props) {
  const router = useRouter();
  const isBiddable = listing.mode !== "buy-now";
  const increment = listing.bidIncrement ?? 25;
  const openingBid = listing.currentBid ?? listing.buyNowPrice ?? 0;
  const initialAuctionState = createLiveAuctionState(listing);

  const [auction, setAuction] = useState(initialAuctionState);
  const [maxBidInput, setMaxBidInput] = useState(String(openingBid + increment * 3));
  const [status, setStatus] = useState(
    listing.mode === "buy-now"
      ? "This lot is direct purchase ready."
      : "Place a live bid or save a maximum bid. Live bidders may answer in the next bidding window."
  );
  const [events, setEvents] = useState<BidEvent[]>(createInitialEvents(listing, openingBid));
  const [bidNotification, setBidNotification] = useState<BidNotification | null>(null);
  const [winSplash, setWinSplash] = useState<WinSplash | null>(null);

  const currentBid = auction.currentBid;
  const nextMinimumBid = getNextMinimumBid(currentBid, increment);
  const recommendedBids = useMemo(
    () => getRecommendedBids(currentBid, increment),
    [currentBid, increment]
  );
  const [now, setNow] = useState(Date.now());
  const remainingMs = Math.max(auction.endsAt - now, 0);
  const countdownLabel = formatAuctionCountdown(remainingMs);
  const reserveGap =
    auction.reservePrice === null
      ? 0
      : Math.max(auction.reservePrice - auction.currentBid, 0);
  const notificationRemainingMs = bidNotification ? Math.max(bidNotification.endsAt - now, 0) : 0;
  const notificationCount = bidNotification
    ? Math.max(1, Math.ceil(notificationRemainingMs / BID_NOTIFICATION_STEP_MS))
    : 0;
  const notificationSeconds = Math.ceil(notificationRemainingMs / 1000);

  const auctionPillState = useMemo(() => {
    if (listing.mode === "buy-now") {
      return "buy-now";
    }

    if (auction.leadingBidder === "user") {
      return "leading";
    }

    return "watching";
  }, [auction.leadingBidder, listing.mode]);

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
    if (!bidNotification || notificationRemainingMs > 0 || auction.isClosed) {
      return;
    }

    setBidNotification(null);

    const finalState = closeAuction(auction);
    setAuction(finalState);
    setStatus(
      finalState.leadingBidder === "user"
        ? "Bidding window closed. You won the lot."
        : "Bidding window closed. Another bidder finished on top."
    );

    if (finalState.leadingBidder === "user") {
      setWinSplash({ winningBid: finalState.currentBid });
    }

    addEvent(
      {
        label: "Lot closed",
        detail:
          finalState.leadingBidder === "user"
            ? `The 30-second bidding window ended with your winning bid at ${formatCurrency(finalState.currentBid)}.`
            : `The 30-second bidding window ended at ${formatCurrency(finalState.currentBid)}.`
      },
      false
    );
  }, [auction, bidNotification, notificationRemainingMs]);

  useEffect(() => {
    if (!isBiddable || auction.isClosed || bidNotification) {
      return;
    }

    if (remainingMs <= 0) {
      const finalState = closeAuction(auction);
      setAuction(finalState);
      setStatus(
        finalState.leadingBidder === "user"
          ? "Auction closed. You won the lot."
          : "Auction closed. Another bidder finished on top."
      );
      if (finalState.leadingBidder === "user") {
        setWinSplash({ winningBid: finalState.currentBid });
      }
      addEvent(
        {
        label: "Auction closed",
        detail:
          finalState.leadingBidder === "user"
            ? `You won the lot at ${formatCurrency(finalState.currentBid)}.`
            : `Winning bid closed at ${formatCurrency(finalState.currentBid)}.`
        },
        false
      );
      return;
    }

    const marketResult = placeMarketBid(auction, listing, now);

    if (!marketResult || marketResult.kind === "invalid" || marketResult.nextState === auction) {
      return;
    }

    setAuction(marketResult.nextState);
    setStatus(marketResult.status);
    addEvent(marketResult.event, true);
  }, [auction, isBiddable, listing, now, remainingMs]);

  function addEvent(event: BidEvent, showBidNotification = false) {
    setEvents((current) => [event, ...current].slice(0, 6));

    if (showBidNotification) {
      setBidNotification({
        event,
        endsAt: Date.now() + BID_NOTIFICATION_DURATION_MS
      });
    }
  }

  function handleBuyNow() {
    const price = listing.buyNowPrice ?? listing.currentBid ?? 0;
    addItemToCart({ slug: listing.slug, title: listing.title, price, quantity: 1 });
    router.push("/checkout" as Route);
  }

  function handleWinCheckout() {
    if (!winSplash) {
      return;
    }

    addItemToCart({
      slug: listing.slug,
      title: listing.title,
      price: winSplash.winningBid,
      quantity: 1
    });
    router.push("/checkout" as Route);
  }

  function placeBid(targetMaxBid: number) {
    if (!isBiddable) {
      setStatus("This lot is direct purchase only. Use Buy Now to secure the inventory.");
      return;
    }

    if (auction.isClosed) {
      setStatus("This auction has already ended.");
      return;
    }

    const result = placeUserBid(auction, listing, targetMaxBid, now);

    if (result.kind === "invalid") {
      setStatus(result.status);
      return;
    }

    const normalizedBid = normalizeBidAmount(targetMaxBid, currentBid, increment);
    const adjustmentNote =
      normalizedBid !== targetMaxBid
        ? ` Bid rounded to the next valid increment at ${formatCurrency(normalizedBid)}.`
        : "";

    setAuction(result.nextState);
    setStatus(`${result.status}${adjustmentNote}`);
    setMaxBidInput(String(Math.max(result.normalizedBid + increment * 2, nextMinimumBid + increment * 2)));
    addEvent(
      {
        label: result.event.label,
        detail: `${result.event.detail}${adjustmentNote ? " Valid increment applied automatically." : ""}`
      },
      true
    );
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
        <div className="auction-visual-panel" style={{ ["--card-gradient" as string]: listing.gradient }}>
          <div className="auction-visual-badge-row">
            <span className="auction-lot-badge">{listing.category}</span>
            <span className="auction-lot-badge auction-mode-badge">{listing.mode}</span>
          </div>
          <div className="auction-visual-floor">
            <strong>{listing.lotNumber ?? "LOT"}</strong>
            <span>{listing.seller ?? "Marketplace seller"}</span>
          </div>
        </div>

        <div className="auction-summary-panel">
          <div className="auction-topline">
            <span className="eyebrow">{listing.category}</span>
            <div className={`auction-state-pill ${auctionPillState}`}>
              {listing.mode === "buy-now"
                ? "Buy now"
                : auction.leadingBidder === "user"
                  ? "You are leading"
                  : auction.isClosed
                    ? "Auction closed"
                    : "Bidding live"}
            </div>
          </div>

          <h1>{listing.title}</h1>
          <p className="auction-summary-copy">{listing.summary}</p>

          <div className="listing-chip-row">
            <span className="chip">{listing.grade}</span>
            <span className="chip">{listing.location}</span>
            <span className="chip">{listing.watchers ?? 0} watchers</span>
          </div>

          <div className="auction-metric-grid">
            <article className="detail-card auction-metric-card featured">
              <small className="muted">{isBiddable ? "Current bid" : "Buy now price"}</small>
              <h3>{formatCurrency(currentBid)}</h3>
              <p>
                {isBiddable
                  ? `${auction.bidCount} bids placed`
                  : "Ready for immediate checkout"}
              </p>
            </article>
            <article className="detail-card auction-metric-card">
              <small className="muted">{isBiddable ? "Bid increment" : "Purchase mode"}</small>
              <h3>{isBiddable ? formatCurrency(increment) : "Buy now"}</h3>
              <p>{isBiddable ? "Minimum raise required" : "No auction timer on this lot"}</p>
            </article>
            <article className="detail-card auction-metric-card">
              <small className="muted">Auction timing</small>
              <h3>{isBiddable ? countdownLabel : "Buy now only"}</h3>
              <p>
                {auction.isClosed
                  ? "Auction finished"
                  : auction.reserveMet
                    ? "Reserve met"
                    : "Reserve not met"}
              </p>
            </article>
            <article className="detail-card auction-metric-card">
              <small className="muted">Fulfilment</small>
              <h3>{listing.shipping}</h3>
              <p>{listing.stock} lot available</p>
            </article>
          </div>
        </div>
      </section>

      <section className="auction-detail-grid page-section">
        <div className="auction-bid-panel detail-card">
          <div className="auction-panel-header">
            <div>
              <small className="muted">{isBiddable ? "Live bidding console" : "Direct purchase console"}</small>
              <h3>{isBiddable ? "Bid on this lot" : "Buy this lot now"}</h3>
            </div>
            {listing.buyNowPrice ? (
              <div className="auction-buy-now-chip">Buy now {formatCurrency(listing.buyNowPrice)}</div>
            ) : null}
          </div>

          <div className="auction-price-strip">
            <div>
              <span>{isBiddable ? "Current bid" : "Buy now price"}</span>
              <strong>{formatCurrency(currentBid)}</strong>
            </div>
            <div>
              <span>{isBiddable ? "Next minimum" : "Availability"}</span>
              <strong>{isBiddable ? formatCurrency(nextMinimumBid) : `${listing.stock} lot`}</strong>
            </div>
          </div>

          <p className="auction-status-message">{status}</p>

          {isBiddable ? (
            <>
              <div className="auction-guidance-grid">
                <article className="auction-guidance-card">
                  <strong>Auction clock</strong>
                  <p>Live now. This lot closes in {countdownLabel} and runs for 10 minutes max.</p>
                </article>
                <article className="auction-guidance-card">
                  <strong>Live market cadence</strong>
                  <p>Competing bids can appear in real time, usually every 2 to 3 minutes.</p>
                </article>
                <article className="auction-guidance-card">
                  <strong>Auto-bid cadence</strong>
                  <p>Your saved max bid only answers by the minimum increment when someone outbids you.</p>
                </article>
              </div>

              <div className="auction-bid-actions">
                <button
                  className="auction-primary-cta"
                  disabled={auction.isClosed}
                  onClick={() => placeBid(nextMinimumBid)}
                  type="button"
                >
                  Quick bid {formatCurrency(nextMinimumBid)}
                </button>
                {listing.buyNowPrice ? (
                  <button className="auction-secondary-cta" onClick={handleBuyNow} type="button">
                    Buy now {formatCurrency(listing.buyNowPrice)}
                  </button>
                ) : null}
              </div>

              <div className="auction-bid-presets">
                {recommendedBids.map((bid) => (
                  <button
                    className="auction-bid-preset"
                    disabled={auction.isClosed}
                    key={bid}
                    onClick={() => setMaxBidInput(String(bid))}
                    type="button"
                  >
                    {formatCurrency(bid)}
                  </button>
                ))}
              </div>

              <label className="auction-input-group">
                <span>Enter your max bid</span>
                <input
                  disabled={auction.isClosed}
                  inputMode="numeric"
                  min={nextMinimumBid}
                  onChange={(event) => setMaxBidInput(event.target.value)}
                  type="number"
                  value={maxBidInput}
                />
              </label>

              <p className="auction-input-note">
                Minimum valid bid is {formatCurrency(nextMinimumBid)}. We round custom bids up to the
                next {formatCurrency(increment)} increment and only auto-raise by one increment when challenged.
              </p>

              <button className="auction-secondary-cta" type="button">
                Review bid terms
              </button>
              <button
                className="auction-maxbid-button"
                disabled={auction.isClosed}
                onClick={() => placeBid(Number(maxBidInput))}
                type="button"
              >
                Save max bid
              </button>

              <div className="auction-guidance-grid">
                <article className="auction-guidance-card">
                  <strong>Bidding mode</strong>
                  <p>
                    The auction moves in real time. Your max bid only steps in after another bidder
                    raises the lot.
                  </p>
                </article>
                <article className="auction-guidance-card">
                  <strong>Your last bid</strong>
                  <p>
                    {auction.userLastBid
                      ? formatCurrency(auction.userLastBid)
                      : "You have not placed a live bid yet."}
                  </p>
                </article>
                <article className="auction-guidance-card">
                  <strong>Your max bid</strong>
                  <p>
                    {auction.userMaxBid
                      ? formatCurrency(auction.userMaxBid)
                      : "No automatic bidding limit saved yet."}
                  </p>
                </article>
                <article className="auction-guidance-card">
                  <strong>Your position</strong>
                  <p>
                    {auction.isClosed
                      ? auction.leadingBidder === "user"
                        ? "The auction ended with you on top."
                        : "The auction ended with another bidder on top."
                      : auction.leadingBidder === "user"
                        ? "You currently hold the lead."
                        : `You need ${formatCurrency(nextMinimumBid)} or more to take the lead.`}
                  </p>
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
                  Buy now {formatCurrency(listing.buyNowPrice ?? currentBid)}
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
              {listing.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </article>

          <article className="detail-card">
            <h3>Suggested buyer actions</h3>
            <ul className="plain-list">
              <li>Review the manifest and condition notes before placing a bid.</li>
              <li>{isBiddable ? "Stay engaged during the 10-minute window so you can answer live bids quickly." : "Use Buy Now to secure the lot before inventory changes."}</li>
              <li>Confirm shipping and pickup terms before checkout or settlement.</li>
            </ul>
          </article>

          <article className="detail-card">
            <h3>Auction summary</h3>
            <ul className="plain-list">
              <li>Seller: {listing.seller ?? "Marketplace seller"}</li>
              <li>Lot number: {listing.lotNumber ?? "Unassigned"}</li>
              <li>Watchers: {listing.watchers ?? 0}</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
