import { NextResponse } from "next/server";
import { listStoredItems } from "@/lib/server-db";

export async function GET() {
  const items = await listStoredItems();
  return NextResponse.json({ ok: true, items });
}
