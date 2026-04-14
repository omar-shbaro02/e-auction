import "server-only";

import type { AdminItemInput } from "@/lib/item-admin";

export function requireNonEmptyString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

export function requirePositiveNumber(value: unknown, field: string) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive number.`);
  }

  return parsed;
}

export function assertAdminItemPayload(items: AdminItemInput[]) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("At least one item is required.");
  }

  for (const item of items) {
    requireNonEmptyString(item.title, "Title");
    requireNonEmptyString(item.category, "Category");
    requireNonEmptyString(item.summary, "Summary");
    requireNonEmptyString(item.location, "Location");
    requireNonEmptyString(item.shipping, "Shipping");
    requireNonEmptyString(item.grade, "Grade");
  }
}

export function assertBidPayload(amount: unknown) {
  return requirePositiveNumber(amount, "Bid amount");
}

