import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/server-db";
import { createSessionToken, getSessionCookieName } from "@/lib/session";

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { ok: false, error: "Email and password are required." },
      { status: 400 }
    );
  }

  const result = await authenticateUser(email, password);

  const response = NextResponse.json(result, { status: result.ok ? 200 : 401 });

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
