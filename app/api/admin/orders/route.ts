import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { listAdminOrders } from "@/lib/server-db";

export async function GET() {
  const session = await getServerSession();

  if (session?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const orders = await listAdminOrders();
  return NextResponse.json({ ok: true, orders });
}

