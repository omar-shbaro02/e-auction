"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/data";

type AdminOrder = {
  id: string;
  status: string;
  paymentMethod: "cod" | "whish";
  paymentStatus: string;
  subtotal: number;
  currencyCode: string;
  createdAt: string;
  customerEmail: string;
  itemCount: number;
};

type Props = {
  orders: AdminOrder[];
};

export function AdminOrdersPage({ orders }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function updateOrder(orderId: string, payload: Record<string, string>, nextMessage: string) {
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to update order.");
      }
      setMessage(nextMessage);
      startTransition(() => router.refresh());
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update order.");
    }
  }

  return (
    <main className="site-shell admin-page">
      <section className="admin-hero">
        <div>
          <span className="admin-kicker">Admin Orders</span>
          <h1>Review cash on delivery and Whish payment states.</h1>
          <p>Use this queue to confirm COD readiness, mark collected cash, and track Whish-created orders.</p>
        </div>
        <div className="admin-hero-card">
          <strong>{orders.length}</strong>
          <span>orders in the current dashboard snapshot</span>
          <small>Operational payment review</small>
        </div>
      </section>

      {message ? <p className="admin-message admin-message-success">{message}</p> : null}
      {error ? <p className="admin-message admin-message-error">{error}</p> : null}

      <section className="page-section">
        <div className="detail-card admin-form-card">
          <div className="admin-section-head">
            <h2>Orders</h2>
            <p>COD orders should move from awaiting confirmation to collected. Whish orders should move to paid after provider verification.</p>
          </div>
          <div className="admin-table-shell">
            <table className="admin-items-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.id.slice(0, 8)}</strong>
                      <span>{order.itemCount} item(s)</span>
                    </td>
                    <td>{order.customerEmail || "Unknown"}</td>
                    <td>
                      <strong>{order.paymentMethod}</strong>
                      <span>{order.paymentStatus}</span>
                    </td>
                    <td>{order.status}</td>
                    <td>{formatCurrency(order.subtotal)}</td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="admin-table-actions">
                      {order.paymentMethod === "cod" ? (
                        <>
                          <button
                            disabled={isPending}
                            onClick={() =>
                              updateOrder(
                                order.id,
                                { paymentStatus: "awaiting_cod_confirmation", status: "authorized" },
                                "COD order confirmed."
                              )
                            }
                            type="button"
                          >
                            Confirm COD
                          </button>
                          <button
                            disabled={isPending}
                            onClick={() =>
                              updateOrder(
                                order.id,
                                { paymentStatus: "collected", status: "paid" },
                                "COD marked as collected."
                              )
                            }
                            type="button"
                          >
                            Mark collected
                          </button>
                        </>
                      ) : (
                        <button
                          disabled={isPending}
                          onClick={() =>
                            updateOrder(
                              order.id,
                              { paymentStatus: "paid", status: "paid" },
                              "Whish order marked as paid."
                            )
                          }
                          type="button"
                        >
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

