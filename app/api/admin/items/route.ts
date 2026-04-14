import { NextResponse } from "next/server";
import type { AdminItemInput } from "@/lib/item-admin";
import { getServerSession } from "@/lib/session";
import { listAdminItems, upsertAdminItems } from "@/lib/server-db";
import { assertAdminItemPayload } from "@/lib/validators";

function ensureAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  return session?.role === "admin";
}

export async function GET() {
  const session = await getServerSession();

  if (!ensureAdmin(session)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const items = await listAdminItems();
  return NextResponse.json({ ok: true, items });
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!ensureAdmin(session)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const adminSession = session!;

  const body = (await request.json()) as {
    item?: AdminItemInput;
    items?: AdminItemInput[];
  };

  const items = Array.isArray(body.items) ? body.items : body.item ? [body.item] : [];

  if (!items.length) {
    return NextResponse.json(
      { ok: false, error: "Provide one item or an items array." },
      { status: 400 }
    );
  }

  try {
    assertAdminItemPayload(items);
    const result = await upsertAdminItems(items, adminSession.email);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to save items."
      },
      { status: 400 }
    );
  }
}
