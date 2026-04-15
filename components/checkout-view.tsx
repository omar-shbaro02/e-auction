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

type PaymentMethod = "cod" | "whish";

function emptyProfile(): UserProfile {
  return {
    fullName: "",
    email: "",
    phone: "",
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
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

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

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await updateCurrentUserProfile(profile);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items,
          paymentMethod,
          profile
        })
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        orderId?: string;
        paymentStatus?: string;
        whish?: {
          paymentUrl?: string;
          providerReference?: string;
          message?: string;
        } | null;
      };

      if (!response.ok || !result.ok) {
        setError(result.error || "Unable to place order.");
        return;
      }

      clearCart();
      setSubmitted(true);

      if (paymentMethod === "whish" && result.whish?.paymentUrl) {
        setSuccessMessage(
          `Order created. Redirecting you to the Whish payment step with reference ${result.whish.providerReference}.`
        );
        window.location.href = result.whish.paymentUrl;
        return;
      }

      setSuccessMessage("Order created successfully. Cash on delivery is now pending admin confirmation.");
    } catch {
      setError("Unable to place order right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="site-shell commerce-page">
      <section className="commerce-hero">
        <div>
          <span className="eyebrow">Checkout</span>
          <h1>Complete your order.</h1>
          <p>Choose Whish or cash on delivery, confirm your shipping details, and place the order.</p>
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
            <p>{successMessage || "Your order is now queued for payment or fulfilment review."}</p>
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
                <span>Address</span>
                <input
                  onChange={(event) => handleProfileChange("address", event.target.value)}
                  placeholder="123 Warehouse Road"
                  type="text"
                  value={profile.address ?? ""}
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
                  placeholder="+961 ..."
                  type="tel"
                  value={profile.phone}
                />
              </label>
              <label className="checkout-field">
                <span>City</span>
                <input
                  onChange={(event) => handleProfileChange("city", event.target.value)}
                  placeholder="Beirut"
                  type="text"
                  value={profile.city ?? ""}
                />
              </label>
              <label className="checkout-field">
                <span>State / Region</span>
                <input
                  onChange={(event) => handleProfileChange("state", event.target.value)}
                  placeholder="Mount Lebanon"
                  type="text"
                  value={profile.state ?? ""}
                />
              </label>
              <label className="checkout-field">
                <span>Postal code</span>
                <input
                  onChange={(event) => handleProfileChange("postalCode", event.target.value)}
                  placeholder="0000"
                  type="text"
                  value={profile.postalCode ?? ""}
                />
              </label>
              <label className="checkout-field">
                <span>Country</span>
                <input
                  onChange={(event) => handleProfileChange("country", event.target.value)}
                  placeholder="Lebanon"
                  type="text"
                  value={profile.country ?? ""}
                />
              </label>
            </div>

            <div className="payment-method-panel">
              <div className="admin-section-head">
                <h3>Payment method</h3>
                <p>Select how this order should be settled.</p>
              </div>
              <div className="payment-method-grid">
                <button
                  className={paymentMethod === "cod" ? "payment-method-card active" : "payment-method-card"}
                  onClick={() => setPaymentMethod("cod")}
                  type="button"
                >
                  <strong>Cash on Delivery</strong>
                  <span>Admin confirmation required before shipment release.</span>
                </button>
                <button
                  className={paymentMethod === "whish" ? "payment-method-card active" : "payment-method-card"}
                  onClick={() => setPaymentMethod("whish")}
                  type="button"
                >
                  <strong>Whish</strong>
                  <span>Creates a Whish payment attempt and redirects into the provider flow placeholder.</span>
                </button>
              </div>
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
            <div className="checkout-payment-summary">
              <strong>Selected payment</strong>
              <span>{paymentMethod === "cod" ? "Cash on delivery" : "Whish"}</span>
            </div>
            {error ? <p className="auth-error">{error}</p> : null}
            <button className="cart-checkout" disabled={isSubmitting} onClick={handlePlaceOrder} type="button">
              {isSubmitting ? "Processing..." : paymentMethod === "cod" ? "Place COD order" : "Continue to Whish"}
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
