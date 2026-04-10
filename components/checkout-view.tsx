"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/data";
import {
  authChangedEvent,
  getCurrentUser,
  signOut,
  updateCurrentUserProfile,
  type UserProfile
} from "@/lib/auth";
import { cartChangedEvent, clearCart, readCart, type CartItem } from "@/lib/cart";

function emptyProfile(): UserProfile {
  return {
    fullName: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    cardName: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: ""
  };
}

export function CheckoutView() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(emptyProfile());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function syncCart() {
      setItems(readCart());
    }

    function syncUser() {
      const currentUser = getCurrentUser();
      setIsAuthenticated(!!currentUser);
      setProfile(currentUser ?? emptyProfile());
    }

    syncCart();
    syncUser();
    window.addEventListener(cartChangedEvent, syncCart);
    window.addEventListener(authChangedEvent, syncUser);

    return () => {
      window.removeEventListener(cartChangedEvent, syncCart);
      window.removeEventListener(authChangedEvent, syncUser);
    };
  }, []);

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items]
  );

  const estimatedFees = items.length ? Math.round(subtotal * 0.06) : 0;
  const grandTotal = subtotal + estimatedFees;

  function handleProfileChange<K extends keyof UserProfile>(field: K, value: UserProfile[K]) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function handlePlaceOrder() {
    if (!profile.email.trim() || !profile.phone.trim()) {
      setError("Email and phone number are required before checkout can be completed.");
      return;
    }

    if (
      !profile.address?.trim() ||
      !profile.city?.trim() ||
      !profile.state?.trim() ||
      !profile.postalCode?.trim() ||
      !profile.country?.trim()
    ) {
      setError("Please complete your full delivery address.");
      return;
    }

    if (
      !profile.cardName?.trim() ||
      !profile.cardNumber?.trim() ||
      !profile.cardExpiry?.trim() ||
      !profile.cardCvv?.trim()
    ) {
      setError("Please provide cardholder name, card number, expiry, and CVV.");
      return;
    }

    await updateCurrentUserProfile(profile);
    clearCart();
    setError("");
    setSubmitted(true);
  }

  return (
    <main className="site-shell commerce-page">
      <section className="commerce-hero">
        <div>
          <span className="eyebrow">Checkout</span>
          <h1>Complete your order.</h1>
          <p>Confirm billing and delivery information, then place the order for your selected lot.</p>
        </div>
        <div className="commerce-summary-card detail-card">
          <small className="muted">Estimated total</small>
          <h3>{formatCurrency(grandTotal)}</h3>
          <p>{items.reduce((total, item) => total + item.quantity, 0)} item(s)</p>
        </div>
      </section>

      {!isAuthenticated ? (
        <section className="page-section">
          <div className="category-empty-state detail-card">
            <h3>Authentication required.</h3>
            <p>Sign in or create an account with a valid email address and phone number to continue.</p>
            <Link className="auction-button" href={{ pathname: "/auth" }}>
              Go to login / sign up
            </Link>
          </div>
        </section>
      ) : submitted ? (
        <section className="page-section">
          <div className="category-empty-state detail-card">
            <h3>Order placed successfully.</h3>
            <p>Your cart has been cleared and the lot is now queued for fulfilment review.</p>
            <Link className="auction-button" href="/">
              Return to marketplace
            </Link>
          </div>
        </section>
      ) : items.length ? (
        <section className="commerce-layout page-section">
          <div className="commerce-form detail-card">
            <div className="checkout-auth-header">
              <div>
                <h3>Buyer profile and payment</h3>
                <p className="muted">Signed in as {profile.email}</p>
              </div>
              <button
                className="cart-secondary"
                onClick={() => {
                  signOut();
                  router.push("/auth" as Route);
                }}
                type="button"
              >
                Sign out
              </button>
            </div>

            <div className="checkout-form-grid">
              <label className="checkout-field">
                <span>Full name</span>
                <input
                  onChange={(event) => handleProfileChange("fullName", event.target.value)}
                  placeholder="Jane Buyer"
                  type="text"
                  value={profile.fullName}
                />
              </label>
              <label className="checkout-field">
                <span>Company</span>
                <input
                  onChange={(event) => handleProfileChange("company", event.target.value)}
                  placeholder="Acme Resale LLC"
                  type="text"
                  value={profile.company ?? ""}
                />
              </label>
              <label className="checkout-field">
                <span>Email</span>
                <input
                  onChange={(event) => handleProfileChange("email", event.target.value)}
                  placeholder="buyer@company.com"
                  type="email"
                  value={profile.email}
                />
              </label>
              <label className="checkout-field">
                <span>Phone</span>
                <input
                  onChange={(event) => handleProfileChange("phone", event.target.value)}
                  placeholder="+1 555 010 4422"
                  type="tel"
                  value={profile.phone}
                />
              </label>
              <label className="checkout-field checkout-field-wide">
                <span>Shipping address</span>
                <input
                  onChange={(event) => handleProfileChange("address", event.target.value)}
                  placeholder="123 Warehouse Road"
                  type="text"
                  value={profile.address ?? ""}
                />
              </label>
              <label className="checkout-field">
                <span>City</span>
                <input
                  onChange={(event) => handleProfileChange("city", event.target.value)}
                  placeholder="Dallas"
                  type="text"
                  value={profile.city ?? ""}
                />
              </label>
              <label className="checkout-field">
                <span>State</span>
                <input
                  onChange={(event) => handleProfileChange("state", event.target.value)}
                  placeholder="Texas"
                  type="text"
                  value={profile.state ?? ""}
                />
              </label>
              <label className="checkout-field">
                <span>Postal code</span>
                <input
                  onChange={(event) => handleProfileChange("postalCode", event.target.value)}
                  placeholder="75001"
                  type="text"
                  value={profile.postalCode ?? ""}
                />
              </label>
              <label className="checkout-field">
                <span>Country</span>
                <input
                  onChange={(event) => handleProfileChange("country", event.target.value)}
                  placeholder="United States"
                  type="text"
                  value={profile.country ?? ""}
                />
              </label>
              <label className="checkout-field checkout-field-wide">
                <span>Cardholder name</span>
                <input
                  onChange={(event) => handleProfileChange("cardName", event.target.value)}
                  placeholder="Jane Buyer"
                  type="text"
                  value={profile.cardName ?? ""}
                />
              </label>
              <label className="checkout-field checkout-field-wide">
                <span>Card number</span>
                <input
                  onChange={(event) => handleProfileChange("cardNumber", event.target.value)}
                  placeholder="4111 1111 1111 1111"
                  type="text"
                  value={profile.cardNumber ?? ""}
                />
              </label>
              <label className="checkout-field">
                <span>Expiry</span>
                <input
                  onChange={(event) => handleProfileChange("cardExpiry", event.target.value)}
                  placeholder="09/28"
                  type="text"
                  value={profile.cardExpiry ?? ""}
                />
              </label>
              <label className="checkout-field">
                <span>CVV</span>
                <input
                  onChange={(event) => handleProfileChange("cardCvv", event.target.value)}
                  placeholder="123"
                  type="password"
                  value={profile.cardCvv ?? ""}
                />
              </label>
            </div>
          </div>

          <aside className="commerce-sidebar detail-card">
            <h3>Order summary</h3>
            <div className="checkout-summary-list">
              {items.map((item) => (
                <div className="cart-total-row" key={item.slug}>
                  <span>
                    {item.title} x{item.quantity}
                  </span>
                  <strong>{formatCurrency(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="cart-total-row">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div className="cart-total-row">
              <span>Estimated fees</span>
              <strong>{formatCurrency(estimatedFees)}</strong>
            </div>
            <div className="cart-total-row commerce-grand-total">
              <span>Total</span>
              <strong>{formatCurrency(grandTotal)}</strong>
            </div>
            {error ? <p className="auth-error">{error}</p> : null}
            <button className="cart-checkout" onClick={handlePlaceOrder} type="button">
              Place order
            </button>
            <Link className="commerce-inline-link" href={{ pathname: "/cart" }}>
              Return to cart
            </Link>
          </aside>
        </section>
      ) : (
        <section className="page-section">
          <div className="category-empty-state detail-card">
            <h3>No items ready for checkout.</h3>
            <p>Add something to your cart or use Buy Now on a product page to continue.</p>
            <Link className="auction-button" href="/">
              Return to marketplace
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
