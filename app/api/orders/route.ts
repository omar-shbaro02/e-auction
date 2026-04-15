import { NextResponse } from "next/server";
import type { UserProfile } from "@/lib/auth";
import { getServerSession } from "@/lib/session";
import { createCheckoutOrder } from "@/lib/server-db";

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in to place an order." }, { status: 401 });
  }

  const body = (await request.json()) as {
    items?: Array<{ slug?: string; quantity?: number }>;
    paymentMethod?: "cod" | "whish";
    profile?: UserProfile;
    notes?: string;
  };

  try {
    const result = await createCheckoutOrder(
      {
        items: (body.items ?? []).map((item) => ({
          slug: String(item.slug ?? ""),
          quantity: Number(item.quantity ?? 0)
        })),
        paymentMethod: body.paymentMethod ?? "cod",
        profile: body.profile ?? {
          fullName: "",
          email: session.email,
          phone: ""
        },
        notes: body.notes
      },
      session.email
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to create order." },
      { status: 400 }
    );
  }
}

