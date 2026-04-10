"use client";

export type CartItem = {
  slug: string;
  title: string;
  price: number;
  quantity: number;
};

export const cartStorageKey = "lotlane-cart";
export const cartChangedEvent = "lotlane-cart-changed";

function isBrowser() {
  return typeof window !== "undefined";
}

export function readCart() {
  if (!isBrowser()) {
    return [] as CartItem[];
  }

  const raw = window.localStorage.getItem(cartStorageKey);

  if (!raw) {
    return [] as CartItem[];
  }

  try {
    return JSON.parse(raw) as CartItem[];
  } catch {
    window.localStorage.removeItem(cartStorageKey);
    return [] as CartItem[];
  }
}

export function writeCart(items: CartItem[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(cartChangedEvent));
}

export function addItemToCart(item: CartItem) {
  const current = readCart();
  const existing = current.find((entry) => entry.slug === item.slug);

  if (existing) {
    writeCart(
      current.map((entry) =>
        entry.slug === item.slug ? { ...entry, quantity: entry.quantity + item.quantity } : entry
      )
    );
    return;
  }

  writeCart([...current, item]);
}

export function updateCartItemQuantity(slug: string, quantity: number) {
  const current = readCart();
  const updated = current
    .map((entry) => (entry.slug === slug ? { ...entry, quantity } : entry))
    .filter((entry) => entry.quantity > 0);

  writeCart(updated);
}

export function clearCart() {
  writeCart([]);
}
