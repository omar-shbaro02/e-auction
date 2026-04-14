"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AdminItem = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  mode: "auction" | "buy-now" | "hybrid";
  status: "draft" | "scheduled" | "live" | "closed" | "sold" | "archived";
  location: string;
  shipping: string;
  currentBid: number | null;
  buyNowPrice: number | null;
  minimumBid: number | null;
  reservePrice: number | null;
  startAt: string | null;
  endAt: string | null;
  stock: number;
  grade: string;
  gradient: string;
  highlights: string[];
  seoDescription: string;
  currencyCode: string;
  bidIncrement: number | null;
  bidCount: number | null;
  watchers: number | null;
  reserveMet: boolean | null;
  seller: string | null;
  lotNumber: string | null;
  imageUrls?: string[];
  heroImageUrl?: string | null;
};

type Props = {
  currentAdmin: string;
  currentAdminEmail: string;
  items: AdminItem[];
};

type SingleItemFormState = {
  title: string;
  category: string;
  summary: string;
  mode: AdminItem["mode"];
  status: AdminItem["status"];
  location: string;
  shipping: string;
  currentBid: string;
  buyNowPrice: string;
  minimumBid: string;
  reservePrice: string;
  startAt: string;
  endAt: string;
  stock: string;
  grade: string;
  gradient: string;
  highlights: string;
  seoDescription: string;
  currencyCode: string;
  bidIncrement: string;
  bidCount: string;
  watchers: string;
  reserveMet: "true" | "false";
  seller: string;
  lotNumber: string;
  imageUrls: string;
  heroImageUrl: string;
};

const singleItemDefaults: SingleItemFormState = {
  title: "",
  category: "",
  summary: "",
  mode: "auction",
  status: "draft",
  location: "",
  shipping: "",
  currentBid: "",
  buyNowPrice: "",
  minimumBid: "",
  reservePrice: "",
  startAt: "",
  endAt: "",
  stock: "1",
  grade: "",
  gradient: "",
  highlights: "",
  seoDescription: "",
  currencyCode: "USD",
  bidIncrement: "",
  bidCount: "",
  watchers: "",
  reserveMet: "false",
  seller: "",
  lotNumber: "",
  imageUrls: "",
  heroImageUrl: ""
};

function getBulkExample() {
  return JSON.stringify(
    [
      {
        title: "Bosch Tools Mixed Pallet",
        category: "Tools & DIY",
        summary: "Trade-return tools pallet prepared for timed auction.",
        mode: "hybrid",
        status: "scheduled",
        location: "Houston, USA",
        shipping: "LTL freight available",
        minimumBid: 900,
        currentBid: 900,
        buyNowPrice: 1450,
        reservePrice: 1100,
        startAt: "2026-04-20T09:00:00.000Z",
        endAt: "2026-04-27T17:00:00.000Z",
        stock: 1,
        grade: "Returns A/B mix",
        seller: "Trade Outlet",
        lotNumber: "TL-6001",
        bidIncrement: 25,
        highlights: ["42 units", "Manifest included", "Warehouse checked"],
        seoDescription: "Bosch tools pallet with manifest and auction scheduling."
      }
    ],
    null,
    2
  );
}

export function AdminItemsPage({ currentAdmin, currentAdminEmail, items }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [singleItem, setSingleItem] = useState<SingleItemFormState>(singleItemDefaults);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState(getBulkExample());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitItems(payload: unknown) {
    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = (await response.json()) as {
      ok: boolean;
      error?: string;
      count?: number;
    };

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Unable to save item data.");
    }

    setMessage(`Saved ${result.count ?? 0} item(s).`);
    startTransition(() => router.refresh());
  }

  async function handleSingleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await submitItems({
        item: {
          ...singleItem,
          slug: editingSlug ?? undefined,
          currentBid: singleItem.currentBid || null,
          buyNowPrice: singleItem.buyNowPrice || null,
          minimumBid: singleItem.minimumBid || null,
          reservePrice: singleItem.reservePrice || null,
          startAt: singleItem.startAt || null,
          endAt: singleItem.endAt || null,
          stock: singleItem.stock || "1",
          bidIncrement: singleItem.bidIncrement || null,
          bidCount: singleItem.bidCount || null,
          watchers: singleItem.watchers || null,
          reserveMet: singleItem.reserveMet === "true",
          seller: singleItem.seller || null,
          lotNumber: singleItem.lotNumber || null,
          imageUrls: singleItem.imageUrls || null,
          heroImageUrl: singleItem.heroImageUrl || null
        }
      });
      setSingleItem(singleItemDefaults);
      setEditingSlug(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save item.");
    }
  }

  async function handleBulkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const parsed = JSON.parse(bulkText) as unknown;

      if (!Array.isArray(parsed)) {
        throw new Error("Bulk import must be a JSON array.");
      }

      await submitItems({ items: parsed });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to import items.");
    }
  }

  async function updateLifecycle(slug: string, payload: Record<string, unknown>, successMessage: string) {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/items/${slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to update item.");
      }
      setMessage(successMessage);
      startTransition(() => router.refresh());
    } catch (lifecycleError) {
      setError(lifecycleError instanceof Error ? lifecycleError.message : "Unable to update item.");
    }
  }

  async function deleteItem(slug: string) {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/items/${slug}`, {
        method: "DELETE"
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to delete item.");
      }
      setMessage("Item deleted.");
      startTransition(() => router.refresh());
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete item.");
    }
  }

  function loadItemForEditing(item: AdminItem) {
    setEditingSlug(item.slug);
    setSingleItem({
      title: item.title,
      category: item.category,
      summary: item.summary,
      mode: item.mode,
      status: item.status,
      location: item.location,
      shipping: item.shipping,
      currentBid: item.currentBid?.toString() ?? "",
      buyNowPrice: item.buyNowPrice?.toString() ?? "",
      minimumBid: item.minimumBid?.toString() ?? "",
      reservePrice: item.reservePrice?.toString() ?? "",
      startAt: item.startAt ? item.startAt.slice(0, 16) : "",
      endAt: item.endAt ? item.endAt.slice(0, 16) : "",
      stock: item.stock.toString(),
      grade: item.grade,
      gradient: item.gradient,
      highlights: item.highlights.join("\n"),
      seoDescription: item.seoDescription,
      currencyCode: item.currencyCode,
      bidIncrement: item.bidIncrement?.toString() ?? "",
      bidCount: item.bidCount?.toString() ?? "",
      watchers: item.watchers?.toString() ?? "",
      reserveMet: item.reserveMet ? "true" : "false",
      seller: item.seller ?? "",
      lotNumber: item.lotNumber ?? "",
      imageUrls: item.imageUrls?.join("\n") ?? "",
      heroImageUrl: item.heroImageUrl ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="site-shell admin-page">
      <section className="admin-hero">
        <div>
          <span className="admin-kicker">Admin Inventory</span>
          <h1>Build and publish auction-ready inventory from one place.</h1>
          <p>
            This is the first production-focused admin surface for WeeklyBids: role-aware access,
            structured inventory fields, and bulk item ingestion for Supabase-backed auctions.
          </p>
        </div>
        <div className="admin-hero-card">
          <strong>{currentAdmin}</strong>
          <span>{currentAdminEmail}</span>
          <small>Signed-in admin session detected</small>
        </div>
      </section>

      {message ? <p className="admin-message admin-message-success">{message}</p> : null}
      {error ? <p className="admin-message admin-message-error">{error}</p> : null}

      <section className="admin-grid">
        <form className="detail-card admin-form-card" onSubmit={handleSingleSubmit}>
          <div className="admin-section-head">
            <h2>{editingSlug ? "Edit Item" : "Add One Item"}</h2>
            <p>Create a draft, scheduled lot, or live auction with production-ready inventory fields.</p>
          </div>

          <div className="admin-form-grid">
            <label className="checkout-field checkout-field-wide">
              <span>Title</span>
              <input
                onChange={(event) => setSingleItem((current) => ({ ...current, title: event.target.value }))}
                value={singleItem.title}
              />
            </label>
            <label className="checkout-field">
              <span>Category</span>
              <input
                onChange={(event) =>
                  setSingleItem((current) => ({ ...current, category: event.target.value }))
                }
                value={singleItem.category}
              />
            </label>
            <label className="checkout-field">
              <span>Mode</span>
              <select
                onChange={(event) =>
                  setSingleItem((current) => ({
                    ...current,
                    mode: event.target.value as SingleItemFormState["mode"]
                  }))
                }
                value={singleItem.mode}
              >
                <option value="auction">Auction</option>
                <option value="buy-now">Buy now</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
            <label className="checkout-field">
              <span>Status</span>
              <select
                onChange={(event) =>
                  setSingleItem((current) => ({
                    ...current,
                    status: event.target.value as SingleItemFormState["status"]
                  }))
                }
                value={singleItem.status}
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="closed">Closed</option>
                <option value="sold">Sold</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="checkout-field">
              <span>Stock</span>
              <input
                onChange={(event) => setSingleItem((current) => ({ ...current, stock: event.target.value }))}
                type="number"
                value={singleItem.stock}
              />
            </label>
            <label className="checkout-field checkout-field-wide">
              <span>Summary</span>
              <textarea
                onChange={(event) => setSingleItem((current) => ({ ...current, summary: event.target.value }))}
                rows={4}
                value={singleItem.summary}
              />
            </label>
            <label className="checkout-field">
              <span>Location</span>
              <input
                onChange={(event) =>
                  setSingleItem((current) => ({ ...current, location: event.target.value }))
                }
                value={singleItem.location}
              />
            </label>
            <label className="checkout-field">
              <span>Shipping</span>
              <input
                onChange={(event) =>
                  setSingleItem((current) => ({ ...current, shipping: event.target.value }))
                }
                value={singleItem.shipping}
              />
            </label>
            <label className="checkout-field">
              <span>Start at</span>
              <input
                onChange={(event) => setSingleItem((current) => ({ ...current, startAt: event.target.value }))}
                type="datetime-local"
                value={singleItem.startAt}
              />
            </label>
            <label className="checkout-field">
              <span>End at</span>
              <input
                onChange={(event) => setSingleItem((current) => ({ ...current, endAt: event.target.value }))}
                type="datetime-local"
                value={singleItem.endAt}
              />
            </label>
            <label className="checkout-field">
              <span>Minimum bid</span>
              <input
                onChange={(event) =>
                  setSingleItem((current) => ({ ...current, minimumBid: event.target.value }))
                }
                type="number"
                value={singleItem.minimumBid}
              />
            </label>
            <label className="checkout-field">
              <span>Current bid</span>
              <input
                onChange={(event) =>
                  setSingleItem((current) => ({ ...current, currentBid: event.target.value }))
                }
                type="number"
                value={singleItem.currentBid}
              />
            </label>
            <label className="checkout-field">
              <span>Buy now price</span>
              <input
                onChange={(event) =>
                  setSingleItem((current) => ({ ...current, buyNowPrice: event.target.value }))
                }
                type="number"
                value={singleItem.buyNowPrice}
              />
            </label>
            <label className="checkout-field">
              <span>Reserve price</span>
              <input
                onChange={(event) =>
                  setSingleItem((current) => ({ ...current, reservePrice: event.target.value }))
                }
                type="number"
                value={singleItem.reservePrice}
              />
            </label>
            <label className="checkout-field">
              <span>Bid increment</span>
              <input
                onChange={(event) =>
                  setSingleItem((current) => ({ ...current, bidIncrement: event.target.value }))
                }
                type="number"
                value={singleItem.bidIncrement}
              />
            </label>
            <label className="checkout-field">
              <span>Condition / grade</span>
              <input
                onChange={(event) => setSingleItem((current) => ({ ...current, grade: event.target.value }))}
                value={singleItem.grade}
              />
            </label>
            <label className="checkout-field">
              <span>Seller</span>
              <input
                onChange={(event) => setSingleItem((current) => ({ ...current, seller: event.target.value }))}
                value={singleItem.seller}
              />
            </label>
            <label className="checkout-field">
              <span>Lot number</span>
              <input
                onChange={(event) => setSingleItem((current) => ({ ...current, lotNumber: event.target.value }))}
                value={singleItem.lotNumber}
              />
            </label>
            <label className="checkout-field checkout-field-wide">
              <span>Highlights</span>
              <textarea
                onChange={(event) =>
                  setSingleItem((current) => ({ ...current, highlights: event.target.value }))
                }
                placeholder="One per line or comma-separated"
                rows={3}
                value={singleItem.highlights}
              />
            </label>
            <label className="checkout-field checkout-field-wide">
              <span>SEO description</span>
              <textarea
                onChange={(event) =>
                  setSingleItem((current) => ({ ...current, seoDescription: event.target.value }))
                }
                rows={3}
                value={singleItem.seoDescription}
              />
            </label>
            <label className="checkout-field checkout-field-wide">
              <span>Image URLs</span>
              <textarea
                onChange={(event) =>
                  setSingleItem((current) => ({ ...current, imageUrls: event.target.value }))
                }
                placeholder="One image URL per line"
                rows={3}
                value={singleItem.imageUrls}
              />
            </label>
            <label className="checkout-field checkout-field-wide">
              <span>Primary image URL</span>
              <input
                onChange={(event) =>
                  setSingleItem((current) => ({ ...current, heroImageUrl: event.target.value }))
                }
                value={singleItem.heroImageUrl}
              />
            </label>
          </div>

          <div className="admin-toolbar-row">
            <button className="auth-hero-button admin-submit-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : editingSlug ? "Update Item" : "Save Item"}
            </button>
            {editingSlug ? (
              <button
                className="auction-secondary-cta"
                onClick={() => {
                  setEditingSlug(null);
                  setSingleItem(singleItemDefaults);
                }}
                type="button"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="admin-side-column">
          <form className="detail-card admin-form-card" onSubmit={handleBulkSubmit}>
            <div className="admin-section-head">
              <h2>Bulk Import</h2>
              <p>Paste a JSON array of items to create or update multiple auctions in one request.</p>
            </div>
            <textarea
              className="admin-bulk-textarea"
              onChange={(event) => setBulkText(event.target.value)}
              value={bulkText}
            />
            <button className="auth-hero-button admin-submit-button" disabled={isPending} type="submit">
              {isPending ? "Importing..." : "Import Items"}
            </button>
          </form>

          <section className="detail-card admin-form-card">
            <div className="admin-section-head">
              <h2>Current Inventory</h2>
              <p>{items.length} item(s) currently available in the admin catalog.</p>
            </div>
            <div className="admin-table-shell">
              <table className="admin-items-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.slug}>
                      <td>
                        <strong>{item.title}</strong>
                        <span>{item.slug}</span>
                      </td>
                      <td>{item.mode}</td>
                      <td>{item.status}</td>
                      <td>{item.startAt ? new Date(item.startAt).toLocaleString() : "Not set"}</td>
                      <td>{item.endAt ? new Date(item.endAt).toLocaleString() : "Not set"}</td>
                      <td>{item.buyNowPrice ?? item.currentBid ?? item.minimumBid ?? "N/A"}</td>
                      <td className="admin-table-actions">
                        <button onClick={() => loadItemForEditing(item)} type="button">
                          Edit
                        </button>
                        <button
                          onClick={() => updateLifecycle(item.slug, { status: "live" }, "Item moved to live.")}
                          type="button"
                        >
                          Publish
                        </button>
                        <button
                          onClick={() => updateLifecycle(item.slug, { status: "archived" }, "Item archived.")}
                          type="button"
                        >
                          Archive
                        </button>
                        <button onClick={() => deleteItem(item.slug)} type="button">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
