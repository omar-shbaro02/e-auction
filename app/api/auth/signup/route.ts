import { NextResponse } from "next/server";
import type { UserProfile } from "@/lib/auth";
import { createUser } from "@/lib/server-db";

export async function POST(request: Request) {
  const { profile, password } = (await request.json()) as {
    profile?: UserProfile;
    password?: string;
  };

  if (!profile || typeof password !== "string") {
    return NextResponse.json(
      { ok: false, error: "Profile details and password are required." },
      { status: 400 }
    );
  }

  const result = await createUser(profile, password);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
