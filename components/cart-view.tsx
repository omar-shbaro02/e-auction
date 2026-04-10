"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Listing } from "@/lib/data";
import { formatCurrency } from "@/lib/data";
import {
  cartChangedEvent,
  readCart,
  updateCartItemQuantity,
  type CartItem
} from "@/lib/cart";

type Props = {
  listings: Listing[];
};

export function CartView({ listings }: Props) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    function syncCart() {
      setItems(readCart());
    }

    syncCart();
    window.addEventListener(cartChangedEvent, syncCart);
    return () => window.removeEventListener(cartChangedEvent, syncCart);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items]
  );

  return (
    <main className="site-shell commerce-page">
      <section className="commerce-hero">
        <div>
          <span className="eyebrow">Cart</span>
          <h1>Review your selected lots.</h1>
          <p>Adjust quantities, confirm fulfilment details, and move into checkout when ready.</p>
        </div>
        <div className="commerce-summary-card detail-card">
          <small className="muted">Cart subtotal</small>
          <h3>{formatCurrency(subtotal)}</h3>
          <p>{items.length} line item(s)</p>
        </div>
      </section>

      {items.length ? (
        <section className="commerce-layout page-section">
          <div className="commerce-list">
            {items.map((item) => {
              const listing = listings.find((entry) => entry.slug === item.slug);

              return (
                <article className="commerce-item-card detail-card" key={item.slug}>
                  <div>
                    <small className="muted">{listing?.category ?? "Selected lot"}</small>
                    <h3>{item.title}</h3>
                    <p>{listing?.shipping ?? "Shipping details available at checkout."}</p>
                    {listing ? (
                      <Link className="commerce-inline-link" href={`/products/${listing.slug}`}>
                        View product page
                      </Link>
                    ) : null}
                  </div>

                  <div className="commerce-item-side">
                    <strong>{formatCurrency(item.price)}</strong>
                    <div className="cart-quantity">
                      <button onClick={() => updateCartItemQuantity(item.slug, item.quantity - 1)} type="button">
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateCartItemQuantity(item.slug, item.quantity + 1)} type="button">
                        +
                      </button>
                    </div>
                    <span className="muted">{formatCurrency(item.price * item.quantity)} total</span>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="commerce-sidebar detail-card">
            <h3>Order summary</h3>
            <div className="cart-total-row">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div className="cart-total-row">
              <span>Estimated handling</span>
              <strong>Calculated at checkout</strong>
            </div>
            <Link className="cart-checkout commerce-checkout-link" href={{ pathname: "/checkout" }}>
              Proceed to checkout
            </Link>
          </aside>
        </section>
      ) : (
        <section className="page-section">
          <div className="category-empty-state detail-card">
            <h3>Your cart is empty.</h3>
            <p>Add a purchasable item from the marketplace or use Buy Now from a product page.</p>
            <Link className="auction-button" href="/">
              Return to marketplace
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
