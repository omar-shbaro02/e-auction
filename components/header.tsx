"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { featuredListings, formatCurrency, showcaseCategories, siteName } from "@/lib/data";
import { authChangedEvent, getCurrentUser, signOut } from "@/lib/auth";
import { searchCategories, searchListings } from "@/lib/search";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLFormElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<"buyer" | "admin">("buyer");

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    function syncUser() {
      const user = getCurrentUser();
      setUserName(user?.fullName ?? "");
      setUserEmail(user?.email ?? "");
      setUserRole(user?.role === "admin" ? "admin" : "buyer");
    }

    syncUser();
    window.addEventListener(authChangedEvent, syncUser);
    return () => window.removeEventListener(authChangedEvent, syncUser);
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }

      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const productMatches = useMemo(
    () => searchListings(featuredListings, normalizedQuery).slice(0, 5),
    [normalizedQuery]
  );
  const categoryMatches = useMemo(
    () => searchCategories(showcaseCategories, normalizedQuery).slice(0, 4),
    [normalizedQuery]
  );

  function navigateWithSearch(nextQuery: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    } else {
      params.delete("q");
    }

    const targetPath = pathname === "/categories" ? "/categories" : "/";
    const nextUrl = params.toString() ? `${targetPath}?${params.toString()}` : targetPath;
    setOpen(false);
    router.push(nextUrl as Route);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateWithSearch(query);
  }

  return (
    <header className="header">
      <div className="site-shell header-inner">
        <Link className="brand-lockup" href="/">
          <img
            alt={`${siteName} logo`}
            className="brand-logo"
            height="200"
            src="/weeklybids-logo.svg"
            width="523"
          />
        </Link>

        <nav className="nav-links" aria-label="Primary">
          <Link className={pathname === "/" ? "nav-link-active" : ""} href="/">
            Auctions
          </Link>
          <Link className={pathname === "/categories" ? "nav-link-active" : ""} href="/categories">
            Categories
          </Link>
          <Link href="/#how-it-works">How It Works</Link>
          <Link href="/#ending-soon">Ending Soon</Link>
        </nav>

        <div className="header-search-shell">
          <form className="header-search" onSubmit={handleSubmit} ref={searchRef}>
            <span className="header-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle
                  cx="11"
                  cy="11"
                  fill="none"
                  r="6.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m16 16 4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
            <input
              aria-expanded={open && !!normalizedQuery}
              aria-label="Search products"
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search auctions, pallets, and products..."
              type="search"
              value={query}
            />
            <button className="header-search-submit" type="submit">
              Search
            </button>

            {open && normalizedQuery ? (
              <div className="search-dropdown" role="listbox">
                {productMatches.length ? (
                  <div className="search-dropdown-section">
                    <strong>Products</strong>
                    {productMatches.map((listing) => (
                      <Link
                        className="search-result-item"
                        href={`/products/${listing.slug}`}
                        key={listing.slug}
                        onClick={() => setOpen(false)}
                      >
                        <div>
                          <span>{listing.title}</span>
                          <small>
                            {listing.category} - {listing.location}
                          </small>
                        </div>
                        <strong>{formatCurrency(listing.buyNowPrice ?? listing.currentBid ?? 0)}</strong>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {categoryMatches.length ? (
                  <div className="search-dropdown-section">
                    <strong>Categories</strong>
                    {categoryMatches.map((category) => (
                      <Link
                        className="search-result-item"
                        href={{ pathname: "/categories", query: { category: category.name } }}
                        key={category.name}
                        onClick={() => setOpen(false)}
                      >
                        <div>
                          <span>{category.name}</span>
                          <small>{category.featuredCount} live lots</small>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {!productMatches.length && !categoryMatches.length ? (
                  <div className="search-empty-state">
                    <strong>No instant matches</strong>
                    <p>Press Search to view full results for &quot;{query}&quot;.</p>
                  </div>
                ) : (
                  <button
                    className="search-view-all"
                    onClick={() => navigateWithSearch(query)}
                    type="button"
                  >
                    View all results for &quot;{query}&quot;
                  </button>
                )}
              </div>
            ) : null}
          </form>
        </div>

        <div className="header-actions">
          <div className="header-account-shell" ref={accountRef}>
            <Link className="header-login" href="/auth">
              Login
            </Link>
            <Link className="header-signup" href="/signup">
              Sign Up
            </Link>
            <button
              aria-expanded={accountOpen}
              aria-label="Account"
              className="header-avatar"
              onClick={() => setAccountOpen((current) => !current)}
              type="button"
            >
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </button>

            {accountOpen ? (
              <div className="account-dropdown">
                <div className="account-dropdown-notch" aria-hidden="true" />
                {userName ? (
                  <div className="account-dropdown-card">
                    <h3>{userName}</h3>
                    <p>{userEmail}</p>
                    <div className="account-dropdown-actions">
                      {userRole === "admin" ? (
                        <Link
                          className="auction-secondary-cta account-dropdown-button"
                          href={{ pathname: "/admin/items" }}
                          onClick={() => setAccountOpen(false)}
                        >
                          Admin dashboard
                        </Link>
                      ) : null}
                      <Link
                        className="auth-hero-button account-dropdown-button"
                        href={{ pathname: "/checkout" }}
                        onClick={() => setAccountOpen(false)}
                      >
                        Continue
                      </Link>
                      <button
                        className="account-dropdown-link"
                        onClick={() => {
                          signOut();
                          setAccountOpen(false);
                          router.push("/" as Route);
                        }}
                        type="button"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="account-dropdown-card">
                    <h3>Welcome</h3>
                    <p>Sign in to access your account</p>
                    <Link
                      className="auth-hero-button account-dropdown-button"
                      href={{ pathname: "/auth" }}
                      onClick={() => setAccountOpen(false)}
                    >
                      Login
                    </Link>
                    <p className="auth-switch-copy account-dropdown-copy">
                      New customers{" "}
                      <Link
                        className="auth-inline-link"
                        href={{ pathname: "/signup" }}
                        onClick={() => setAccountOpen(false)}
                      >
                        Sign up here!
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="header-divider">
        <div className="site-shell">
          <span className="header-divider-line" />
        </div>
      </div>
    </header>
  );
}
