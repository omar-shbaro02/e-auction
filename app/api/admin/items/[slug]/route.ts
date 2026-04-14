import { NextResponse } from "next/server";
import type { AdminItemInput } from "@/lib/item-admin";
import { getServerSession } from "@/lib/session";
import { deleteAdminItem, updateAdminItemStatus, upsertAdminItems } from "@/lib/server-db";

type Context = {
  params: Promise<{ slug: string }>;
};

function isAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  return session?.role === "admin";
}

export async function PATCH(request: Request, context: Context) {
  const session = await getServerSession();

  if (!isAdmin(session)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { slug } = await context.params;
  const body = (await request.json()) as {
    status?: "draft" | "scheduled" | "live" | "closed" | "sold" | "archived";
    item?: Record<string, unknown>;
  };

  try {
    if (body.status) {
      const result = await updateAdminItemStatus(slug, body.status, session!.email);
      return NextResponse.json(result);
    }

    if (body.item) {
      const nextItem = body.item as Record<string, unknown>;
      const result = await upsertAdminItems([{ ...nextItem, slug } as AdminItemInput], session!.email);
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, error: "No update payload supplied." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to update item." },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, context: Context) {
  const session = await getServerSession();

  if (!isAdmin(session)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { slug } = await context.params;

  try {
    const result = await deleteAdminItem(slug, session!.email);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to delete item." },
      { status: 400 }
    );
  }
}
