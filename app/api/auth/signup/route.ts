import { NextResponse } from "next/server";
import type { UserProfile } from "@/lib/auth";
import { createUser } from "@/lib/server-db";
import { createSessionToken, getSessionCookieName } from "@/lib/session";

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
  const response = NextResponse.json(result, { status: result.ok ? 200 : 400 });

  if (result.ok) {
    response.cookies.set({
      name: getSessionCookieName(),
      value: createSessionToken({
        email: result.profile.email,
        fullName: result.profile.fullName,
        role: result.profile.role ?? "buyer"
      }),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12
    });
  }

  return response;
}
