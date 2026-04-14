import type { Metadata } from "next";
import { AdminItemsPage } from "@/components/admin-items-page";
import { requireAdminSession } from "@/lib/admin";
import { listAdminItems } from "@/lib/server-db";

export const metadata: Metadata = {
  title: "Admin Inventory"
};

export default async function AdminInventoryPage() {
  const session = await requireAdminSession();
  const items = await listAdminItems();

  return <AdminItemsPage currentAdmin={session.fullName} currentAdminEmail={session.email} items={items} />;
}

