import "server-only";

import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";

export function isAdminEmail(email: string) {
  const configured = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return configured.includes(email.trim().toLowerCase());
}

export async function requireAdminSession() {
  const session = await getServerSession();

  if (!session || session.role !== "admin") {
    redirect("/auth");
  }

  return session;
}

