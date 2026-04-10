import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/server-db";

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
  return NextResponse.json(result, { status: result.ok ? 200 : 401 });
}
