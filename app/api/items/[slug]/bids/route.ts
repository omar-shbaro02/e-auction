import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getStoredItemBySlug, listStoredItemBids, placeStoredItemBid } from "@/lib/server-db";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(_: Request, context: Context) {
  const { slug } = await context.params;
  const session = await getServerSession();
  const listing = await getStoredItemBySlug(slug);

  if (!listing) {
    return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
  }

  const bids = await listStoredItemBids(slug, session?.email);
  return NextResponse.json({ ok: true, listing, bids });
}

export async function POST(request: Request, context: Context) {
  const { slug } = await context.params;
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in to place a bid." }, { status: 401 });
  }

  const { amount } = (await request.json()) as { amount?: number };

  try {
    const result = await placeStoredItemBid(slug, amount, session.email);
    const listing = await getStoredItemBySlug(slug);
    const bids = await listStoredItemBids(slug, session.email);
    return NextResponse.json({ ok: true, result, listing, bids });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to place bid." },
      { status: 400 }
    );
  }
}

