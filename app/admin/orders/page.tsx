import type { Metadata } from "next";
import { AdminOrdersPage } from "@/components/admin-orders-page";
import { requireAdminSession } from "@/lib/admin";
import { listAdminOrders } from "@/lib/server-db";

export const metadata: Metadata = {
  title: "Admin Orders"
};

export default async function AdminOrdersRoute() {
  await requireAdminSession();
  const orders = await listAdminOrders();
  return <AdminOrdersPage orders={orders} />;
}

