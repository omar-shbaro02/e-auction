"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Listing, ShortcutCategory, ShowcaseCategory } from "@/lib/data";
import { formatCurrency, siteName, siteTagline } from "@/lib/data";
import { filterListings } from "@/components/category-browser";
import {
  addItemToCart,
  cartChangedEvent,
  readCart,
  updateCartItemQuantity,
  type CartItem
} from "@/lib/cart";

type Props = {
  activeCategory?: string;
  featuredListings: Listing[];
  query?: string;
  shortcutCategories: ShortcutCategory[];
  showcaseCategories: ShowcaseCategory[];
};

const cookieStorageKey = "lotlane-cookie-consent";

const processSteps = [
  {
    title: "Sign Up",
    description: "Create your bidder profile and unlock verified wholesale inventory."
  },
  {
    title: "Place Your Bid",
    description: "Bid live on timed listings or secure stock instantly with buy now."
  },
  {
    title: "Win The Deal",
    description: "Checkout fast, schedule delivery, and keep inventory moving."
  }
];

const trustBar = ["Secure payments", "Verified sellers", "Real-time bidding"];

function CartGlyph() {
  return (
    <svg aria-hidden="true" className="button-icon" viewBox="0 0 24 24">
      <path
        d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.7L21 7H7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="10" cy="19" r="1.5" fill="currentColor" />
      <circle cx="17" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

function GavelGlyph() {
  return (
    <svg aria-hidden="true" className="button-icon" viewBox="0 0 24 24">
      <path
        d="M7 6l4 4M5 8l4 4m4.5-6.5l5 5M11 8l5 5M4 20h10"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ShieldGlyph() {
  return (
    <svg aria-hidden="true" className="button-icon" viewBox="0 0 24 24">
      <path
        d="M12 3l7 3v5c0 4.8-2.8 7.8-7 10-4.2-2.2-7-5.2-7-10V6l7-3Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="m9.5 11.8 1.7 1.7 3.5-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function HomeMarketplace({
  activeCategory = "",
  featuredListings,
  query = "",
  shortcutCategories,
  showcaseCategories
}: Props) {
  const router = useRouter();
  const [cookieConsent, setCookieConsent] = useState<"accepted" | "declined" | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const storedConsent = window.localStorage.getItem(cookieStorageKey);
    if (storedConsent === "accepted" || storedConsent === "declined") {
      setCookieConsent(storedConsent);
    }

    function syncCart() {
      setCartItems(readCart());
    }

    syncCart();
    window.addEventListener(cartChangedEvent, syncCart);

    return () => {
      window.removeEventListener(cartChangedEvent, syncCart);
    };
  }, []);

  const filteredListings = useMemo(
    () => filterListings(featuredListings, query, activeCategory, "all"),
    [activeCategory, featuredListings, query]
  );

  const heroListing = filteredListings[0] ?? featuredListings[0];
  const featuredAuctions = filteredListings.slice(0, 5);
  const endingSoon = [...filteredListings]
    .filter((listing) => listing.endsIn)
    .sort((first, second) => (first.endsIn ?? "").localeCompare(second.endsIn ?? ""))
    .slice(0, 4);

  function handleCookieChoice(choice: "accepted" | "declined") {
    setCookieConsent(choice);
    window.localStorage.setItem(cookieStorageKey, choice);
  }

  function addToCart(listing: Listing) {
    const price = listing.buyNowPrice ?? listing.currentBid ?? 0;
    addItemToCart({ slug: listing.slug, title: listing.title, price, quantity: 1 });
    setCartOpen(true);
  }

  function updateQuantity(slug: string, nextQuantity: number) {
    updateCartItemQuantity(slug, nextQuantity);
  }

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );
  const cartSubtotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems]
  );

  return (
    <>
      <main className="market-home weeklybids-home">
        <section className="site-shell weeklybids-hero-shell">
          <div className="weeklybids-hero">
            <div className="weeklybids-hero-copy">
              <span className="weeklybids-kicker">Weekly auction marketplace</span>
              <h1>
                Bid. Win.
                <br />
                <span>Save Big.</span>
              </h1>
              <p>
                Discover surplus products at unbeatable prices. New auction inventory drops every
                week with secure checkout and faster closeout buying.
              </p>

              <div className="weeklybids-hero-actions">
                <a className="weeklybids-primary" href="#featured-auctions">
                  Browse Auctions
                </a>
                <a className="weeklybids-secondary" href="#how-it-works">
                  How It Works
                </a>
              </div>

              <div className="weeklybids-trust-row">
                {trustBar.map((item) => (
                  <span key={item}>
                    <ShieldGlyph />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="weeklybids-hero-visual">
              <div className="weeklybids-countdown">
                <span>Auction ending soon</span>
                <strong>{heroListing?.endsIn ?? "Live now"}</strong>
              </div>

              <div
                className="weeklybids-device-stack"
                style={{ ["--hero-gradient" as string]: heroListing?.gradient }}
              >
                <div className="weeklybids-device-card weeklybids-device-card-back">
                  <span>{heroListing?.category ?? "Auctions"}</span>
                </div>
                <div className="weeklybids-device-card weeklybids-device-card-front">
                  <span>{heroListing?.mode ?? "hybrid"}</span>
                  <strong>{heroListing?.title ?? siteName}</strong>
                  <small>{formatCurrency(heroListing?.buyNowPrice ?? heroListing?.currentBid ?? 0)}</small>
                </div>
                <div className="weeklybids-phone-card">
                  <div className="weeklybids-phone-screen">
                    <div className="weeklybids-phone-bar" />
                    <div className="weeklybids-phone-tile" />
                    <div className="weeklybids-phone-lines">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="weeklybids-phone-cta">Bid now</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="site-shell weeklybids-overview-strip">
          {shortcutCategories.map((item) => (
            <article className="weeklybids-overview-card" key={item.title}>
              <strong>{item.icon}</strong>
              <h2>{item.title}</h2>
              <p>{item.subtitle}</p>
            </article>
          ))}
        </section>

        <section className="site-shell weeklybids-section" id="featured-auctions">
          <div className="section-title-row weeklybids-section-head">
            <div>
              <h2>Featured Auctions</h2>
              <p>Hand-picked inventory with active bidding and buy-now shortcuts.</p>
            </div>
            <Link href={{ pathname: "/categories" }}>View all auctions</Link>
          </div>

          <div className="weeklybids-featured-grid">
            {featuredAuctions.map((listing) => {
              const primaryPrice = listing.buyNowPrice ?? listing.currentBid ?? 0;
              const isAuctionOnly = listing.mode === "auction";

              return (
                <article className="weeklybids-auction-card" key={listing.slug}>
                  <div
                    className="weeklybids-auction-art"
                    style={{ ["--card-gradient" as string]: listing.gradient }}
                  >
                    <span>{listing.endsIn ?? "Live"}</span>
                  </div>
                  <div className="weeklybids-auction-copy">
                    <h3>{listing.title}</h3>
                    <p>{listing.category}</p>
                    <div className="weeklybids-auction-price">
                      <strong>{formatCurrency(primaryPrice)}</strong>
                      <small>{listing.location}</small>
                    </div>
                    <div className="weeklybids-auction-actions">
                      {!isAuctionOnly ? (
                        <button onClick={() => addToCart(listing)} type="button">
                          Place Bid
                        </button>
                      ) : (
                        <button className="is-muted" type="button">
                          Auction Only
                        </button>
                      )}
                      <Link href={`/products/${listing.slug}`}>View Lot</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="site-shell weeklybids-dual-grid">
          <section className="weeklybids-panel" id="how-it-works">
            <div className="section-title-row weeklybids-section-head">
              <div>
                <h2>How It Works</h2>
                <p>Three quick steps from account setup to checkout.</p>
              </div>
            </div>
            <div className="weeklybids-steps">
              {processSteps.map((step, index) => (
                <article className="weeklybids-step-card" key={step.title}>
                  <span>{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="weeklybids-panel">
            <div className="section-title-row weeklybids-section-head">
              <div>
                <h2>Shop By Category</h2>
                <p>Browse the strongest inventory pockets on the marketplace.</p>
              </div>
            </div>
            <div className="weeklybids-category-grid">
              {showcaseCategories.slice(0, 6).map((category) => (
                <Link
                  className="weeklybids-category-card"
                  href={{ pathname: "/categories", query: { category: category.name } }}
                  key={category.name}
                >
                  <strong>{category.art}</strong>
                  <span>{category.name}</span>
                  <small>{category.featuredCount} live lots</small>
                </Link>
              ))}
            </div>
          </section>
        </section>

        <section className="site-shell weeklybids-section" id="ending-soon">
          <div className="section-title-row weeklybids-section-head">
            <div>
              <h2>Ending Soon</h2>
              <p>Don&apos;t miss these auctions with fast-closing windows.</p>
            </div>
            {(query || activeCategory) && <Link href={{ pathname: "/" }}>Clear filters</Link>}
          </div>

          <div className="weeklybids-ending-grid">
            {endingSoon.map((listing) => (
              <article className="weeklybids-ending-card" key={listing.slug}>
                <div
                  className="weeklybids-ending-art"
                  style={{ ["--card-gradient" as string]: listing.gradient }}
                />
                <div className="weeklybids-ending-copy">
                  <span>{listing.endsIn}</span>
                  <h3>{listing.title}</h3>
                  <p>{formatCurrency(listing.currentBid ?? listing.buyNowPrice ?? 0)}</p>
                  <Link href={`/products/${listing.slug}`}>Open auction</Link>
                </div>
              </article>
            ))}
          </div>

          {!filteredListings.length ? (
            <div className="category-empty-state detail-card">
              <h3>No matching lots found.</h3>
              <p>Try a different search term or switch categories to widen the results.</p>
              <Link className="auction-button" href={{ pathname: "/" }}>
                Back to all lots
              </Link>
            </div>
          ) : null}
        </section>

        <section className="site-shell weeklybids-newsletter">
          <div>
            <h2>Trusted. Secure. Transparent.</h2>
            <p>
              We protect your data, verify our sellers, and help make every auction feel fair.
            </p>
          </div>
          <div className="weeklybids-newsletter-badges">
            <span>SSL Secured</span>
            <span>Verified Sellers</span>
            <span>24/7 Support</span>
          </div>
          <form className="weeklybids-newsletter-form">
            <input aria-label="Email address" placeholder="Enter your email" type="email" />
            <button type="button">Subscribe</button>
          </form>
        </section>

        <footer className="weeklybids-footer">
          <div className="site-shell weeklybids-footer-grid">
            <div>
              <h3>{siteName}</h3>
              <p>{siteTagline}</p>
            </div>
            <div>
              <strong>Quick Links</strong>
              <Link href="/">Auctions</Link>
              <Link href="/categories">Categories</Link>
              <Link href="/cart">Cart</Link>
            </div>
            <div>
              <strong>Support</strong>
              <Link href="/auth">Help Center</Link>
              <Link href="/checkout">Shipping</Link>
              <Link href="/signup">Create Account</Link>
            </div>
            <div>
              <strong>Contact</strong>
              <a href="mailto:hello@weeklybids.com">hello@weeklybids.com</a>
              <span>Beirut, Lebanon</span>
            </div>
          </div>
        </footer>
      </main>

      <button
        aria-label="Open cart drawer"
        className="cart-fab"
        onClick={() => setCartOpen(true)}
        type="button"
      >
        <CartGlyph />
        <span>{cartCount}</span>
      </button>

      <div
        aria-hidden={!cartOpen}
        className={`cart-overlay ${cartOpen ? "is-open" : ""}`}
        onClick={() => setCartOpen(false)}
      />
      <aside className={`cart-drawer ${cartOpen ? "is-open" : ""}`} aria-label="Shopping cart">
        <div className="cart-drawer-header">
          <div>
            <h3>Your Cart</h3>
            <p>{cartCount} item(s) selected</p>
          </div>
          <button className="cart-close" onClick={() => setCartOpen(false)} type="button">
            Close
          </button>
        </div>

        <div className="cart-drawer-body">
          {cartItems.length ? (
            cartItems.map((item) => (
              <article className="cart-item" key={item.slug}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{formatCurrency(item.price)}</p>
                </div>
                <div className="cart-quantity">
                  <button onClick={() => updateQuantity(item.slug, item.quantity - 1)} type="button">
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.slug, item.quantity + 1)} type="button">
                    +
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="cart-empty">
              <strong>Your cart is empty.</strong>
              <p>Add buy-now or hybrid lots from the product cards to preview the checkout flow.</p>
            </div>
          )}
        </div>

        <div className="cart-drawer-footer">
          <div className="cart-total-row">
            <span>Subtotal</span>
            <strong>{formatCurrency(cartSubtotal)}</strong>
          </div>
          <div className="cart-footer-actions">
            <button
              className="cart-secondary"
              disabled={!cartItems.length}
              onClick={() => {
                setCartOpen(false);
                router.push("/cart" as Route);
              }}
              type="button"
            >
              View cart
            </button>
            <button
              className="cart-checkout"
              disabled={!cartItems.length}
              onClick={() => {
                setCartOpen(false);
                router.push("/checkout" as Route);
              }}
              type="button"
            >
              Proceed to checkout
            </button>
          </div>
        </div>
      </aside>

      {!cookieConsent ? (
        <aside className="cookie-card" aria-label="Cookie notice">
          <h3>Allow Cookies</h3>
          <p>
            By clicking &quot;Accept All Cookies&quot;, you agree to the storing of cookies on your
            device to enhance site navigation, analyze site usage, and assist in our marketing
            efforts.
          </p>
          <div className="cookie-actions">
            <button className="cookie-accept" onClick={() => handleCookieChoice("accepted")} type="button">
              Accept All
            </button>
            <button className="cookie-decline" onClick={() => handleCookieChoice("declined")} type="button">
              Decline All
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
