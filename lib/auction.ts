import { formatCurrency, type Listing } from "@/lib/data";

export const AUCTION_DURATION_MS = 10 * 60 * 1000;
export const MIN_MARKET_BID_DELAY_MS = 2 * 60 * 1000;
export const MAX_MARKET_BID_DELAY_MS = 3 * 60 * 1000;

export type LiveAuctionState = {
  currentBid: number;
  bidCount: number;
  reserveMet: boolean;
  reservePrice: number | null;
  leadingBidder: "user" | "market";
  userLastBid: number | null;
  userMaxBid: number | null;
  startedAt: number;
  endsAt: number;
  nextMarketBidAt: number | null;
  isClosed: boolean;
};

export type BidEvent = {
  label: string;
  detail: string;
};

export type AuctionActionResult =
  | {
      kind: "invalid";
      suggestedBid: number;
      status: string;
    }
  | {
      kind: "accepted";
      normalizedBid: number;
      nextState: LiveAuctionState;
      status: string;
      event: BidEvent;
    };

export function createLiveAuctionState(listing: Listing, now = Date.now()): LiveAuctionState {
  const increment = listing.bidIncrement ?? 25;
  const openingBid = listing.currentBid ?? listing.buyNowPrice ?? 0;

  return {
    currentBid: openingBid,
    bidCount: listing.bidCount ?? 0,
    reserveMet: Boolean(listing.reserveMet),
    reservePrice: listing.mode === "buy-now" ? null : openingBid + increment * (listing.reserveMet ? 0 : 3),
    leadingBidder: "market",
    userLastBid: null,
    userMaxBid: null,
    startedAt: now,
    endsAt: now + AUCTION_DURATION_MS,
    nextMarketBidAt: listing.mode === "buy-now" ? null : now + getRandomMarketBidDelay(),
    isClosed: false
  };
}

export function getNextMinimumBid(currentBid: number, increment: number) {
  return currentBid + increment;
}

export function getRecommendedBids(currentBid: number, increment: number) {
  const minimum = getNextMinimumBid(currentBid, increment);
  return [minimum, minimum + increment * 2, minimum + increment * 4];
}

export function normalizeBidAmount(rawBid: number, currentBid: number, increment: number) {
  const minimum = getNextMinimumBid(currentBid, increment);

  if (!Number.isFinite(rawBid) || rawBid <= minimum) {
    return minimum;
  }

  return minimum + Math.ceil((rawBid - minimum) / increment) * increment;
}

export function closeAuction(state: LiveAuctionState) {
  return {
    ...state,
    isClosed: true,
    nextMarketBidAt: null
  };
}

export function placeUserBid(
  state: LiveAuctionState,
  listing: Listing,
  rawBid: number,
  now = Date.now()
): AuctionActionResult {
  const increment = listing.bidIncrement ?? 25;
  const minimum = getNextMinimumBid(state.currentBid, increment);

  if (state.isClosed || now >= state.endsAt) {
    return { kind: "invalid", suggestedBid: minimum, status: "This auction has ended." };
  }

  if (!Number.isFinite(rawBid)) {
    return {
      kind: "invalid",
      suggestedBid: minimum,
      status: `Enter a valid bid amount of at least ${formatCurrency(minimum)}.`
    };
  }

  const normalizedBid = normalizeBidAmount(rawBid, state.currentBid, increment);
  const reserveMet =
    state.reserveMet || (state.reservePrice !== null ? minimum >= state.reservePrice : false);

  return {
    kind: "accepted",
    normalizedBid,
    nextState: {
      ...state,
      currentBid: minimum,
      bidCount: state.bidCount + 1,
      reserveMet,
      leadingBidder: "user",
      userLastBid: minimum,
      userMaxBid: normalizedBid
    },
    status:
      normalizedBid > minimum
        ? `Your max bid is set at ${formatCurrency(normalizedBid)}. You are leading at ${formatCurrency(minimum)}.`
        : `Bid accepted at ${formatCurrency(minimum)}. You are currently leading.`,
    event: {
      label: normalizedBid > minimum ? "Max bid armed" : "Your bid is live",
      detail:
        normalizedBid > minimum
          ? `You entered with a live bid of ${formatCurrency(minimum)} and automatic bidding up to ${formatCurrency(normalizedBid)}.`
          : `You moved the auction to ${formatCurrency(minimum)} and took the lead.`
    }
  };
}

export function placeMarketBid(
  state: LiveAuctionState,
  listing: Listing,
  now = Date.now()
): AuctionActionResult | null {
  const increment = listing.bidIncrement ?? 25;

  if (state.isClosed || now >= state.endsAt || state.nextMarketBidAt === null || now < state.nextMarketBidAt) {
    return null;
  }

  const marketCap = getMarketBidCap(listing, state, increment);

  if (state.currentBid >= marketCap) {
    return {
      kind: "accepted",
      normalizedBid: state.currentBid,
      nextState: { ...state, nextMarketBidAt: now + getRandomMarketBidDelay() },
      status:
        state.leadingBidder === "user"
          ? "No competing bid landed in this round. You still have the lead."
          : "The market stayed quiet this round. Current leading bid remains unchanged.",
      event: {
        label: "Quiet round",
        detail: "No new competing bid came in during this bidding window."
      }
    };
  }

  const marketBid = Math.min(
    state.currentBid + increment * (Math.random() < 0.7 ? 1 : 2),
    marketCap
  );
  const reserveMetAfterMarket =
    state.reserveMet || (state.reservePrice !== null ? marketBid >= state.reservePrice : false);

  if (state.userMaxBid !== null && marketBid <= state.userMaxBid) {
    const autoBid = Math.min(state.userMaxBid, marketBid + increment);
    const autoBidSpent = autoBid >= state.userMaxBid;
    const reserveMet =
      reserveMetAfterMarket || (state.reservePrice !== null ? autoBid >= state.reservePrice : false);

    return {
      kind: "accepted",
      normalizedBid: autoBid,
      nextState: {
        ...state,
        currentBid: autoBid,
        bidCount: state.bidCount + 2,
        reserveMet,
        leadingBidder: "user",
        userLastBid: autoBid,
        userMaxBid: autoBidSpent ? autoBid : state.userMaxBid,
        nextMarketBidAt: now + getRandomMarketBidDelay()
      },
      status: autoBidSpent
        ? `A competing bid hit your ceiling. Auto-bid answered at ${formatCurrency(autoBid)} and cannot go higher.`
        : `A competing bidder challenged you, and auto-bid kept you ahead at ${formatCurrency(autoBid)}.`,
      event: {
        label: autoBidSpent ? "Auto-bid hit max" : "Auto-bid responded",
        detail: autoBidSpent
          ? `Your saved max bid answered one last time at ${formatCurrency(autoBid)}.`
          : `A market bid came in at ${formatCurrency(marketBid)}, and your auto-bid answered at ${formatCurrency(autoBid)}.`
      }
    };
  }

  return {
    kind: "accepted",
    normalizedBid: marketBid,
    nextState: {
      ...state,
      currentBid: marketBid,
      bidCount: state.bidCount + 1,
      reserveMet: reserveMetAfterMarket,
      leadingBidder: "market",
      userMaxBid: state.userMaxBid !== null && marketBid > state.userMaxBid ? null : state.userMaxBid,
      nextMarketBidAt: now + getRandomMarketBidDelay()
    },
    status:
      state.userMaxBid !== null && marketBid > state.userMaxBid
        ? `Another bidder came in at ${formatCurrency(marketBid)}. Your saved maximum has been exhausted.`
        : `A competing bidder raised the auction to ${formatCurrency(marketBid)}.`,
    event: {
      label:
        state.userMaxBid !== null && marketBid > state.userMaxBid
          ? "Outbid past your max"
          : state.leadingBidder === "user"
            ? "Outbid in real time"
            : "Competing bid",
      detail:
        state.userMaxBid !== null && marketBid > state.userMaxBid
          ? `A live bidder moved the lot to ${formatCurrency(marketBid)} and your auto-bid stopped there.`
          : `Another buyer nudged the lot up to ${formatCurrency(marketBid)}.`
    }
  };
}

export function formatAuctionCountdown(remainingMs: number) {
  const safeMs = Math.max(remainingMs, 0);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getRandomMarketBidDelay() {
  return MIN_MARKET_BID_DELAY_MS + Math.floor(Math.random() * (MAX_MARKET_BID_DELAY_MS - MIN_MARKET_BID_DELAY_MS));
}

function getMarketBidCap(listing: Listing, state: LiveAuctionState, increment: number) {
  const baselineCap = (listing.currentBid ?? state.currentBid) + increment * 10;
  const buyNowCap = listing.buyNowPrice ? listing.buyNowPrice - increment : baselineCap + increment * 6;
  return Math.max(state.currentBid + increment, Math.min(buyNowCap, baselineCap + increment * 4));
}
