import { NextResponse } from "next/server";
import type { UserProfile } from "@/lib/auth";
import { updateUserProfile } from "@/lib/server-db";

export async function PATCH(request: Request) {
  const { email, updates } = (await request.json()) as {
    email?: string;
    updates?: Partial<UserProfile>;
  };

  if (typeof email !== "string" || !updates) {
    return NextResponse.json(
      { ok: false, error: "Email and profile updates are required." },
      { status: 400 }
    );
  }

  const profile = await updateUserProfile(email, updates);

  if (!profile) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, profile });
}
