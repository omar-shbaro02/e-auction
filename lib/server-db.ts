import "server-only";

import { featuredListings, type Listing } from "@/lib/data";
import type { UserProfile } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { formatEndsIn, mapListingToAdminDraft, normalizeAdminItemInput, type AdminItemInput } from "@/lib/item-admin";
import { normalizeBidAmount } from "@/lib/auction";
import {
  createSupabaseAdminClient,
  createSupabaseServerAuthClient,
  isSupabaseConfigured
} from "@/lib/supabase-server";
import { assertAdminItemPayload, assertBidPayload, assertPaymentMethod } from "@/lib/validators";

type ItemRow = {
  auction_id?: number | null;
  slug: string;
  title: string;
  category: string;
  summary: string;
  mode: Listing["mode"];
  status?: Listing["status"] | null;
  location: string;
  shipping: string;
  currentBid?: number | null;
  buyNowPrice?: number | null;
  minimum_bid?: number | null;
  reserve_price?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  stock: number;
  grade: string;
  gradient: string;
  highlights: string[] | string | null;
  seoDescription: string;
  currency_code?: string | null;
  bidIncrement?: number | null;
  bidCount?: number | null;
  watchers?: number | null;
  reserveMet?: boolean | null;
  seller?: string | null;
  lotNumber?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ItemAssetRow = {
  asset_url: string;
  alt_text?: string | null;
  sort_order?: number | null;
  is_primary?: boolean | null;
};

type BidRow = {
  id: string;
  item_slug: string;
  user_id: string;
  amount: number;
  max_amount?: number | null;
  status?: "active" | "winning" | "outbid" | "cancelled" | null;
  created_at: string;
  profiles?: {
    fullName?: string | null;
    email?: string | null;
  } | null;
};

type ProfileRow = UserProfile & {
  id: string;
};

export type StoredBid = {
  id: string;
  amount: number;
  maxAmount?: number;
  status?: "active" | "winning" | "outbid" | "cancelled";
  createdAt: string;
  bidderName: string;
  bidderEmail: string;
  isCurrentUser: boolean;
};

export type PaymentMethod = "cod" | "whish";

export type CheckoutOrderItemInput = {
  slug: string;
  quantity: number;
};

export type CheckoutOrderInput = {
  items: CheckoutOrderItemInput[];
  paymentMethod: PaymentMethod;
  profile: UserProfile;
  notes?: string;
};

export type StoredOrder = {
  id: string;
  status: string;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  subtotal: number;
  currencyCode: string;
  createdAt: string;
  customerEmail: string;
  itemCount: number;
};

function normalizeProfileRole(role?: string | null, email?: string) {
  if (role === "admin") {
    return "admin" as const;
  }

  return email && isAdminEmail(email) ? ("admin" as const) : ("buyer" as const);
}

function parseHighlights(highlights: ItemRow["highlights"]) {
  if (Array.isArray(highlights)) {
    return highlights.map((entry) => String(entry));
  }

  if (typeof highlights === "string") {
    try {
      const parsed = JSON.parse(highlights) as unknown;
      return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function mapItemRow(row: ItemRow): Listing {
  return {
    slug: row.slug,
    auctionId: row.auction_id ?? undefined,
    title: row.title,
    category: row.category,
    summary: row.summary,
    mode: row.mode,
    status: row.status ?? undefined,
    location: row.location,
    shipping: row.shipping,
    currentBid: row.currentBid ?? undefined,
    buyNowPrice: row.buyNowPrice ?? undefined,
    minimumBid: row.minimum_bid ?? undefined,
    reservePrice: row.reserve_price ?? undefined,
    endsIn: formatEndsIn(row.ends_at ?? null),
    startAt: row.starts_at ?? undefined,
    endAt: row.ends_at ?? undefined,
    stock: row.stock,
    grade: row.grade,
    gradient: row.gradient,
    highlights: parseHighlights(row.highlights),
    seoDescription: row.seoDescription,
    currencyCode: row.currency_code ?? "USD",
    bidIncrement: row.bidIncrement ?? undefined,
    bidCount: row.bidCount ?? undefined,
    watchers: row.watchers ?? undefined,
    reserveMet: row.reserveMet ?? undefined,
    seller: row.seller ?? undefined,
    lotNumber: row.lotNumber ?? undefined,
    imageUrls: [],
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  };
}

async function fetchItemAssetsBySlug(slug: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("item_assets")
    .select("asset_url, alt_text, sort_order, is_primary")
    .eq("item_slug", slug)
    .order("sort_order", { ascending: true });

  return (data as ItemAssetRow[] | null) ?? [];
}

function mapBidRow(row: BidRow, currentEmail?: string): StoredBid {
  const bidderEmail = row.profiles?.email ?? "";
  return {
    id: row.id,
    amount: row.amount,
    maxAmount: row.max_amount ?? undefined,
    status: row.status ?? undefined,
    createdAt: row.created_at,
    bidderName: row.profiles?.fullName ?? "Bidder",
    bidderEmail,
    isCurrentUser: Boolean(currentEmail && bidderEmail.toLowerCase() === currentEmail.toLowerCase())
  };
}

function mapAdminItemToRow(input: AdminItemInput, actorEmail?: string) {
  const normalized = normalizeAdminItemInput(input);

  return {
    slug: normalized.slug,
    title: normalized.title,
    category: normalized.category,
    summary: normalized.summary,
    mode: normalized.mode,
    status: normalized.status,
    location: normalized.location,
    shipping: normalized.shipping,
    currentBid: normalized.currentBid,
    buyNowPrice: normalized.buyNowPrice,
    minimum_bid: normalized.minimumBid,
    reserve_price: normalized.reservePrice,
    starts_at: normalized.startAt,
    ends_at: normalized.endAt,
    stock: normalized.stock,
    grade: normalized.grade,
    gradient: normalized.gradient,
    highlights: normalized.highlights,
    seoDescription: normalized.seoDescription,
    currency_code: normalized.currencyCode,
    bidIncrement: normalized.bidIncrement,
    bidCount: normalized.bidCount,
    watchers: normalized.watchers,
    reserveMet: normalized.reserveMet,
    seller: normalized.seller,
    lotNumber: normalized.lotNumber,
    created_by_email: actorEmail?.trim().toLowerCase() || null,
    updated_by_email: actorEmail?.trim().toLowerCase() || null
  };
}

export async function listStoredItems() {
  if (!isSupabaseConfigured()) {
    return featuredListings;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("items").select("*").order("auction_id", { ascending: false });

  if (error || !data?.length) {
    return featuredListings;
  }

  return (data as ItemRow[]).map(mapItemRow);
}

export async function listAdminItems() {
  if (!isSupabaseConfigured()) {
    return featuredListings.map(mapListingToAdminDraft);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("items").select("*").order("auction_id", { ascending: false });

  if (error || !data?.length) {
    return featuredListings.map(mapListingToAdminDraft);
  }

  return await Promise.all(
    (data as ItemRow[]).map(async (row) => {
      const assets = await fetchItemAssetsBySlug(row.slug);

      return {
        slug: row.slug,
        title: row.title,
        category: row.category,
        summary: row.summary,
        mode: row.mode,
        status: row.status ?? "draft",
        location: row.location,
        shipping: row.shipping,
        currentBid: row.currentBid ?? null,
        buyNowPrice: row.buyNowPrice ?? null,
        minimumBid: row.minimum_bid ?? null,
        reservePrice: row.reserve_price ?? null,
        startAt: row.starts_at ?? null,
        endAt: row.ends_at ?? null,
        stock: row.stock,
        grade: row.grade,
        gradient: row.gradient,
        highlights: parseHighlights(row.highlights),
        seoDescription: row.seoDescription,
        currencyCode: row.currency_code ?? "USD",
        bidIncrement: row.bidIncrement ?? null,
        bidCount: row.bidCount ?? null,
        watchers: row.watchers ?? null,
        reserveMet: row.reserveMet ?? null,
        seller: row.seller ?? null,
        lotNumber: row.lotNumber ?? null,
        imageUrls: assets.map((asset) => asset.asset_url),
        heroImageUrl: assets.find((asset) => asset.is_primary)?.asset_url ?? assets[0]?.asset_url ?? null
      };
    })
  );
}

export async function getStoredItemBySlug(slug: string) {
  if (!isSupabaseConfigured()) {
    return featuredListings.find((listing) => listing.slug === slug) ?? null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("items").select("*").eq("slug", slug).maybeSingle();

  if (error || !data) {
    return featuredListings.find((listing) => listing.slug === slug) ?? null;
  }

  const listing = mapItemRow(data as ItemRow);
  const assets = await fetchItemAssetsBySlug(slug);

  if (assets?.length) {
    const orderedUrls = assets.map((asset) => asset.asset_url);
    return {
      ...listing,
      heroImageUrl: assets.find((asset) => asset.is_primary)?.asset_url ?? orderedUrls[0],
      imageUrls: orderedUrls
    };
  }

  return listing;
}

export async function upsertAdminItems(items: AdminItemInput[], actorEmail?: string) {
  assertAdminItemPayload(items);

  if (!isSupabaseConfigured()) {
    return {
      ok: true as const,
      count: items.length,
      items: items.map((item) => normalizeAdminItemInput(item))
    };
  }

  const supabase = createSupabaseAdminClient();
  const payload = items.map((item) => mapAdminItemToRow(item, actorEmail));
  const { data, error } = await supabase
    .from("items")
    .upsert(payload, { onConflict: "slug" })
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  for (const item of items) {
    const normalized = normalizeAdminItemInput(item);
    await supabase.from("item_assets").delete().eq("item_slug", normalized.slug);

    const assetPayload = normalized.imageUrls.map((assetUrl, index) => ({
      item_slug: normalized.slug,
      asset_url: assetUrl,
      alt_text: normalized.title,
      sort_order: index,
      is_primary: normalized.heroImageUrl ? normalized.heroImageUrl === assetUrl : index === 0
    }));

    if (assetPayload.length) {
      const { error: assetError } = await supabase.from("item_assets").insert(assetPayload);
      if (assetError) {
        throw new Error(assetError.message);
      }
    }
  }

  return {
    ok: true as const,
    count: data?.length ?? 0,
    items: (data as ItemRow[]).map(mapItemRow)
  };
}

export async function updateAdminItemStatus(slug: string, status: NonNullable<Listing["status"]>, actorEmail?: string) {
  if (!isSupabaseConfigured()) {
    return { ok: true as const };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("items")
    .update({ status, updated_by_email: actorEmail?.trim().toLowerCase() || null, updated_at: new Date().toISOString() })
    .eq("slug", slug);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    actorEmail,
    entityType: "item",
    entityId: slug,
    action: `status:${status}`
  });

  return { ok: true as const };
}

export async function deleteAdminItem(slug: string, actorEmail?: string) {
  if (!isSupabaseConfigured()) {
    return { ok: true as const };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("items").delete().eq("slug", slug);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    actorEmail,
    entityType: "item",
    entityId: slug,
    action: "delete"
  });

  return { ok: true as const };
}

export async function listStoredItemBids(slug: string, currentEmail?: string) {
  if (!isSupabaseConfigured()) {
    return [] as StoredBid[];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bids")
    .select("id, item_slug, user_id, amount, max_amount, status, created_at, profiles:user_id(fullName, email)")
    .eq("item_slug", slug)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) {
    return [] as StoredBid[];
  }

  return (data as unknown as BidRow[]).map((row) => mapBidRow(row, currentEmail));
}

async function findProfileByEmail(email: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("email", email).maybeSingle();
  if (error || !data) {
    return null;
  }
  return data as ProfileRow;
}

function createWhishPlaceholder(orderId: string, amount: number) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    provider: "whish" as const,
    providerReference: `WHISH-${orderId.slice(0, 8).toUpperCase()}`,
    paymentUrl: `${baseUrl}/checkout?whish_order=${orderId}`,
    message:
      "Whish merchant API is not wired yet. This placeholder keeps the architecture ready for the real provider session or QR flow."
  };
}

async function writeAuditLog(params: {
  actorEmail?: string;
  actorUserId?: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  await supabase.from("audit_logs").insert({
    actor_email: params.actorEmail?.trim().toLowerCase() || null,
    actor_user_id: params.actorUserId ?? null,
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    metadata: params.metadata ?? {}
  });
}

function getMinimumBidForListing(listing: Listing) {
  const increment = listing.bidIncrement ?? 25;
  if (typeof listing.currentBid === "number" && listing.currentBid > 0) {
    return listing.currentBid + increment;
  }
  if (typeof listing.minimumBid === "number" && listing.minimumBid > 0) {
    return listing.minimumBid;
  }
  return increment;
}

export async function placeStoredItemBid(slug: string, rawAmount: unknown, bidderEmail: string) {
  const amount = assertBidPayload(rawAmount);

  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured yet. Add your Supabase keys to the environment first.");
  }

  const listing = await getStoredItemBySlug(slug);

  if (!listing) {
    throw new Error("Listing not found.");
  }

  if (listing.mode === "buy-now") {
    throw new Error("This listing is direct purchase only.");
  }

  if (listing.status === "closed" || listing.status === "sold" || listing.status === "archived") {
    throw new Error("This auction is no longer accepting bids.");
  }

  if (listing.endAt && new Date(listing.endAt).getTime() <= Date.now()) {
    throw new Error("This auction has ended.");
  }

  const bidder = await findProfileByEmail(bidderEmail.trim().toLowerCase());

  if (!bidder) {
    throw new Error("Bidder profile not found.");
  }

  const minimum = getMinimumBidForListing(listing);
  const normalizedAmount =
    typeof listing.currentBid === "number" && listing.currentBid > 0
      ? normalizeBidAmount(amount, listing.currentBid, listing.bidIncrement ?? 25)
      : Math.max(amount, minimum);

  if (normalizedAmount < minimum) {
    throw new Error(`Minimum valid bid is ${minimum}.`);
  }

  const supabase = createSupabaseAdminClient();
  const { error: insertError } = await supabase.from("bids").insert({
    item_slug: slug,
    user_id: bidder.id,
    amount: normalizedAmount,
    max_amount: normalizedAmount,
    status: "winning"
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  const nextBidCount = (listing.bidCount ?? 0) + 1;
  const reserveMet =
    Boolean(listing.reserveMet) ||
    (typeof listing.reservePrice === "number" ? normalizedAmount >= listing.reservePrice : false);

  const { error: updateError } = await supabase
    .from("items")
    .update({
      currentBid: normalizedAmount,
      bidCount: nextBidCount,
      reserveMet,
      status: listing.status === "draft" ? "live" : listing.status,
      updated_at: new Date().toISOString()
    })
    .eq("slug", slug);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await supabase
    .from("bids")
    .update({ status: "outbid" })
    .eq("item_slug", slug)
    .lt("created_at", new Date().toISOString())
    .neq("user_id", bidder.id)
    .eq("status", "winning");

  await writeAuditLog({
    actorEmail: bidderEmail,
    actorUserId: bidder.id,
    entityType: "bid",
    entityId: slug,
    action: "place",
    metadata: { amount: normalizedAmount }
  });

  return {
    ok: true as const,
    currentBid: normalizedAmount,
    bidCount: nextBidCount,
    reserveMet
  };
}

export async function createCheckoutOrder(input: CheckoutOrderInput, email: string) {
  const paymentMethod = assertPaymentMethod(input.paymentMethod);
  const profile = await findProfileByEmail(email.trim().toLowerCase());

  if (!profile) {
    throw new Error("Customer profile not found.");
  }

  if (!input.items.length) {
    throw new Error("At least one checkout item is required.");
  }

  const uniqueItems = input.items.filter((item) => item.quantity > 0);
  const listings = await Promise.all(uniqueItems.map((item) => getStoredItemBySlug(item.slug)));

  const resolved = listings.map((listing, index) => ({ listing, quantity: uniqueItems[index].quantity }));

  if (resolved.some((entry) => !entry.listing)) {
    throw new Error("One or more cart items could not be found.");
  }

  const pricedItems = resolved.map((entry) => {
    const listing = entry.listing as Listing;
    const unitPrice = listing.buyNowPrice ?? listing.currentBid ?? listing.minimumBid ?? 0;

    if (!unitPrice) {
      throw new Error(`Unable to calculate price for ${listing.title}.`);
    }

    return {
      listing,
      quantity: entry.quantity,
      unitPrice
    };
  });

  const subtotal = pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  if (!isSupabaseConfigured()) {
    const whish = paymentMethod === "whish" ? createWhishPlaceholder("local-order", subtotal) : null;
    return {
      ok: true as const,
      orderId: "local-order",
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "awaiting_cod_confirmation" : "awaiting_payment",
      whish
    };
  }

  const supabase = createSupabaseAdminClient();
  const shippingAddress = {
    fullName: input.profile.fullName,
    phone: input.profile.phone,
    address: input.profile.address ?? "",
    city: input.profile.city ?? "",
    state: input.profile.state ?? "",
    postalCode: input.profile.postalCode ?? "",
    country: input.profile.country ?? ""
  };

  const orderPayload = {
    user_id: profile.id,
    status: paymentMethod === "cod" ? "authorized" : "pending",
    order_type: "buy-now",
    payment_method: paymentMethod,
    payment_status: paymentMethod === "cod" ? "awaiting_cod_confirmation" : "awaiting_payment",
    shipping_address: shippingAddress,
    notes: input.notes?.trim() || null,
    subtotal,
    currency_code: "USD"
  };

  const { data: order, error: orderError } = await supabase.from("orders").insert(orderPayload).select("*").single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Unable to create order.");
  }

  const orderItemsPayload = pricedItems.map((item) => ({
    order_id: order.id,
    item_slug: item.listing.slug,
    quantity: item.quantity,
    unit_price: item.unitPrice
  }));

  const { error: orderItemsError } = await supabase.from("order_items").insert(orderItemsPayload);

  if (orderItemsError) {
    throw new Error(orderItemsError.message);
  }

  let whish: ReturnType<typeof createWhishPlaceholder> | null = null;

  if (paymentMethod === "whish") {
    whish = createWhishPlaceholder(order.id, subtotal);

    const { error: paymentAttemptError } = await supabase.from("payment_attempts").insert({
      order_id: order.id,
      provider: "whish",
      provider_reference: whish.providerReference,
      provider_status: "created",
      payment_url: whish.paymentUrl,
      request_payload: { subtotal },
      response_payload: whish
    });

    if (paymentAttemptError) {
      throw new Error(paymentAttemptError.message);
    }
  } else {
    const { error: paymentAttemptError } = await supabase.from("payment_attempts").insert({
      order_id: order.id,
      provider: "cod",
      provider_reference: `COD-${order.id.slice(0, 8).toUpperCase()}`,
      provider_status: "awaiting_collection",
      request_payload: { subtotal },
      response_payload: { method: "cash_on_delivery" }
    });

    if (paymentAttemptError) {
      throw new Error(paymentAttemptError.message);
    }
  }

  await writeAuditLog({
    actorEmail: email,
    actorUserId: profile.id,
    entityType: "order",
    entityId: order.id,
    action: "create",
    metadata: {
      paymentMethod,
      subtotal,
      itemCount: pricedItems.length
    }
  });

  return {
    ok: true as const,
    orderId: order.id as string,
    paymentMethod,
    paymentStatus: order.payment_status as string,
    whish
  };
}

export async function listAdminOrders() {
  if (!isSupabaseConfigured()) {
    return [] as StoredOrder[];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, status, payment_method, payment_status, subtotal, currency_code, created_at, profiles:user_id(email), order_items(id)")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [] as StoredOrder[];
  }

  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    status: String(row.status),
    paymentMethod: row.payment_method as PaymentMethod,
    paymentStatus: String(row.payment_status),
    subtotal: Number(row.subtotal ?? 0),
    currencyCode: String(row.currency_code ?? "USD"),
    createdAt: String(row.created_at),
    customerEmail: String((row.profiles as { email?: string } | null)?.email ?? ""),
    itemCount: Array.isArray(row.order_items) ? row.order_items.length : 0
  }));
}

export async function updateOrderPaymentState(
  orderId: string,
  input: { paymentStatus?: string; status?: string },
  actorEmail?: string
) {
  if (!isSupabaseConfigured()) {
    return { ok: true as const };
  }

  const supabase = createSupabaseAdminClient();
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (input.paymentStatus) {
    updatePayload.payment_status = input.paymentStatus;
  }

  if (input.status) {
    updatePayload.status = input.status;
  }

  const { error } = await supabase.from("orders").update(updatePayload).eq("id", orderId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    actorEmail,
    entityType: "order",
    entityId: orderId,
    action: "update-payment-state",
    metadata: input
  });

  return { ok: true as const };
}

export async function createUser(profile: UserProfile, password: string) {
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      error: "Supabase is not configured yet. Add your Supabase keys to the environment first."
    };
  }

  const email = profile.email.trim().toLowerCase();
  const phone = profile.phone.trim();
  const role = normalizeProfileRole(profile.role, email);

  if (!email || !phone || password.trim().length < 8) {
    return {
      ok: false as const,
      error: "Email, phone number, and a password of at least 8 characters are required."
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      fullName: profile.fullName.trim(),
      phone,
      company: profile.company?.trim() ?? "",
      role
    }
  });

  if (error || !data.user) {
    return {
      ok: false as const,
      error: error?.message ?? "We couldn't create your account."
    };
  }

  const profilePayload = {
    id: data.user.id,
    fullName: profile.fullName.trim(),
    email,
    phone,
    role,
    company: profile.company?.trim() ?? "",
    address: profile.address?.trim() ?? "",
    city: profile.city?.trim() ?? "",
    state: profile.state?.trim() ?? "",
    postalCode: profile.postalCode?.trim() ?? "",
    country: profile.country?.trim() ?? "",
    cardName: profile.cardName?.trim() ?? "",
    cardNumber: profile.cardNumber?.trim() ?? "",
    cardExpiry: profile.cardExpiry?.trim() ?? "",
    cardCvv: profile.cardCvv?.trim() ?? ""
  };

  const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, {
    onConflict: "id"
  });

  if (profileError) {
    return {
      ok: false as const,
      error: profileError.message
    };
  }

  return {
    ok: true as const,
    profile: {
      ...profilePayload
    } satisfies UserProfile
  };
}

export async function authenticateUser(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      error: "Supabase is not configured yet. Add your Supabase keys to the environment first."
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const authClient = createSupabaseServerAuthClient();
  const { data: authData, error } = await authClient.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (error || !authData.user) {
    return { ok: false as const, error: "Invalid email or password." };
  }

  const supabase = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();

  await authClient.auth.signOut();

  if (profileError) {
    return { ok: false as const, error: profileError.message };
  }

  if (!profile) {
    const fallbackRole = normalizeProfileRole(
      String(authData.user.user_metadata.role ?? ""),
      authData.user.email ?? normalizedEmail
    );

    const fallbackProfile: UserProfile = {
      fullName: String(authData.user.user_metadata.fullName ?? ""),
      email: authData.user.email ?? normalizedEmail,
      phone: String(authData.user.user_metadata.phone ?? ""),
      company: String(authData.user.user_metadata.company ?? ""),
      role: fallbackRole
    };

    return { ok: true as const, profile: fallbackProfile };
  }

  const normalizedProfile = {
    ...(profile as ProfileRow),
    role: normalizeProfileRole((profile as ProfileRow).role, (profile as ProfileRow).email)
  };

  const { id: _id, ...publicProfile } = normalizedProfile;
  return { ok: true as const, profile: publicProfile };
}

export async function updateUserProfile(email: string, updates: Partial<UserProfile>) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const supabase = createSupabaseAdminClient();
  const { data: currentProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (fetchError || !currentProfile) {
    return null;
  }

  const nextProfile = {
    ...currentProfile,
    ...updates,
    email: normalizedEmail,
    role: normalizeProfileRole(updates.role ?? currentProfile.role, normalizedEmail)
  };

  const { error } = await supabase.from("profiles").update(nextProfile).eq("id", currentProfile.id);

  if (error) {
    return null;
  }

  const { id: _id, ...publicProfile } = nextProfile as ProfileRow;
  return publicProfile;
}
