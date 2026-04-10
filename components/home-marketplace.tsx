"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Listing, ShortcutCategory, ShowcaseCategory } from "@/lib/data";
import { formatCurrency, siteTagline } from "@/lib/data";
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
      <main className="market-home">
        <section className="site-shell shortcut-strip">
          {shortcutCategories.map((item) => (
            <Link
              className="shortcut-card"
              href={{
                pathname: "/categories",
                query: {
                  category: item.title.includes("Tools")
                    ? "Tools & DIY"
                    : item.title.includes("Customer Returns")
                      ? "Home & Kitchen"
                      : item.title.includes("Boxes")
                        ? "Electronics"
                        : "Office"
                }
              }}
              key={item.title}
            >
              <div className="shortcut-icon-wrap">
                <div className="shortcut-icon">{item.icon}</div>
              </div>
              <h2>{item.title}</h2>
              <p>{item.subtitle}</p>
            </Link>
          ))}
        </section>

        <section className="site-shell join-banner">
          <div className="join-copy">
            <p>Trusted by over 100,000 resellers</p>
            <h1>{siteTagline}</h1>
          </div>

          <div className="join-actions">
            <a className="join-primary" href="#showcase-products">
              Explore live auctions
            </a>
            <Link className="join-secondary" href={{ pathname: "/categories" }}>
              Browse categories
            </Link>
            <span>Search, bid, buy now, and manage active lots in one flow</span>
          </div>
        </section>

        <section className="site-shell product-section" id="popular-categories">
          <div className="section-title-row">
            <h2>Popular Categories</h2>
            <Link href={{ pathname: "/categories" }}>View All</Link>
          </div>

          <div className="category-carousel-shell">
            <button aria-label="Previous" className="carousel-arrow" type="button">
              {"<"}
            </button>

            <div className="popular-category-grid">
              {showcaseCategories.map((category) => (
                <Link
                  className="popular-category-card"
                  href={{ pathname: "/categories", query: { category: category.name } }}
                  key={category.name}
                >
                  <div className="popular-category-image">
                    <span>{category.art}</span>
                  </div>
                  <h3>{category.name}</h3>
                  <p>{category.featuredCount} live lots</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="site-shell showcase-section" id="showcase-products">
          <div className="section-title-row">
            <h2>{filteredListings.length} Featured Products</h2>
            <div className="section-title-actions">
              {query || activeCategory ? (
                <Link className="cart-launch-link reset-link" href={{ pathname: "/" }}>
                  Clear filters
                </Link>
              ) : null}
              <button className="cart-launch-link" onClick={() => setCartOpen(true)} type="button">
                Open cart ({cartCount})
              </button>
            </div>
          </div>

          <div className="showcase-filter-summary">
            <span>{activeCategory || "All categories"}</span>
            <span>{query ? `Search: ${query}` : "No search filter"}</span>
            <span>{filteredListings.length} result(s)</span>
          </div>

          <div className="showcase-product-grid">
            {filteredListings.map((listing) => {
              const primaryPrice = listing.buyNowPrice ?? listing.currentBid ?? 0;
              const isAuctionOnly = listing.mode === "auction";

              return (
                <article className="showcase-product-card" key={listing.slug}>
                  <div
                    className="showcase-product-art"
                    style={{ ["--card-gradient" as string]: listing.gradient }}
                  >
                    <span>{listing.category}</span>
                  </div>

                  <div className="showcase-product-copy">
                    <div className="showcase-chip-row">
                      <span className="showcase-chip">{listing.mode}</span>
                      <span className="showcase-chip">{listing.grade}</span>
                    </div>

                    <h3>{listing.title}</h3>
                    <p>{listing.summary}</p>

                    <div className="showcase-price-row">
                      <strong>{formatCurrency(primaryPrice)}</strong>
                      <span>
                        {listing.buyNowPrice ? "Buy now available" : `Current bid - ${listing.endsIn}`}
                      </span>
                    </div>

                    <div className="showcase-meta">
                      <span>{listing.location}</span>
                      <span>{listing.shipping}</span>
                    </div>

                    <div className="showcase-action-row">
                      {!isAuctionOnly ? (
                        <button
                          className="add-cart-button"
                          onClick={() => addToCart(listing)}
                          type="button"
                        >
                          <CartGlyph />
                          <span>Add to cart</span>
                        </button>
                      ) : (
                        <button className="add-cart-button" disabled type="button">
                          <CartGlyph />
                          <span>Auction only</span>
                        </button>
                      )}

                      <Link className="auction-button" href={`/products/${listing.slug}`}>
                        <GavelGlyph />
                        <span>{listing.mode === "buy-now" ? "View product" : "E-auction"}</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
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
