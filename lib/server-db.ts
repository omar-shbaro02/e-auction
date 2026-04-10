import "server-only";

import { featuredListings, type Listing } from "@/lib/data";
import type { UserProfile } from "@/lib/auth";
import {
  createSupabaseAdminClient,
  createSupabaseServerAuthClient,
  isSupabaseConfigured
} from "@/lib/supabase-server";

type ItemRow = Omit<Listing, "highlights" | "reserveMet"> & {
  highlights: string[] | string | null;
  reserveMet: boolean | null;
};

type ProfileRow = UserProfile & {
  id: string;
};

function mapItemRow(row: ItemRow): Listing {
  return {
    ...row,
    highlights: Array.isArray(row.highlights)
      ? row.highlights
      : typeof row.highlights === "string"
        ? JSON.parse(row.highlights)
        : [],
    reserveMet: row.reserveMet ?? undefined
  };
}

export async function listStoredItems() {
  if (!isSupabaseConfigured()) {
    return featuredListings;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("items").select("*").order("title");

  if (error || !data?.length) {
    return featuredListings;
  }

  return (data as ItemRow[]).map(mapItemRow);
}

export async function getStoredItemBySlug(slug: string) {
  if (!isSupabaseConfigured()) {
    return featuredListings.find((listing) => listing.slug === slug) ?? null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("items").select("*").eq("slug", slug).maybeSingle();

  if (error || !data) {
    return featuredListings.find((listing) => listing.slug === slug) ?? null;
  }

  return mapItemRow(data as ItemRow);
}

export async function createUser(profile: UserProfile, password: string) {
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      error: "Supabase is not configured yet. Add your Supabase keys to the environment first."
    };
  }

  const email = profile.email.trim().toLowerCase();
  const phone = profile.phone.trim();

  if (!email || !phone || password.trim().length < 8) {
    return {
      ok: false as const,
      error: "Email, phone number, and a password of at least 8 characters are required."
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      fullName: profile.fullName.trim(),
      phone,
      company: profile.company?.trim() ?? ""
    }
  });

  if (error || !data.user) {
    return {
      ok: false as const,
      error: error?.message ?? "We couldn't create your account."
    };
  }

  const profilePayload = {
    id: data.user.id,
    fullName: profile.fullName.trim(),
    email,
    phone,
    company: profile.company?.trim() ?? "",
    address: profile.address?.trim() ?? "",
    city: profile.city?.trim() ?? "",
    state: profile.state?.trim() ?? "",
    postalCode: profile.postalCode?.trim() ?? "",
    country: profile.country?.trim() ?? "",
    cardName: profile.cardName?.trim() ?? "",
    cardNumber: profile.cardNumber?.trim() ?? "",
    cardExpiry: profile.cardExpiry?.trim() ?? "",
    cardCvv: profile.cardCvv?.trim() ?? ""
  };

  const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, {
    onConflict: "id"
  });

  if (profileError) {
    return {
      ok: false as const,
      error: profileError.message
    };
  }

  return {
    ok: true as const,
    profile: {
      ...profilePayload
    } satisfies UserProfile
  };
}

export async function authenticateUser(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      error: "Supabase is not configured yet. Add your Supabase keys to the environment first."
    };
  }

  const authClient = createSupabaseServerAuthClient();
  const { data: authData, error } = await authClient.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });

  if (error || !authData.user) {
    return { ok: false as const, error: "Invalid email or password." };
  }

  const supabase = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();

  await authClient.auth.signOut();

  if (profileError) {
    return { ok: false as const, error: profileError.message };
  }

  if (!profile) {
    const fallbackProfile: UserProfile = {
      fullName: String(authData.user.user_metadata.fullName ?? ""),
      email: authData.user.email ?? email.trim().toLowerCase(),
      phone: String(authData.user.user_metadata.phone ?? ""),
      company: String(authData.user.user_metadata.company ?? "")
    };

    return { ok: true as const, profile: fallbackProfile };
  }

  const { id: _id, ...publicProfile } = profile as ProfileRow;
  return { ok: true as const, profile: publicProfile };
}

export async function updateUserProfile(email: string, updates: Partial<UserProfile>) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const supabase = createSupabaseAdminClient();
  const { data: currentProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (fetchError || !currentProfile) {
    return null;
  }

  const nextProfile = {
    ...currentProfile,
    ...updates,
    email: normalizedEmail
  };

  const { error } = await supabase.from("profiles").update(nextProfile).eq("id", currentProfile.id);

  if (error) {
    return null;
  }

  const { id: _id, ...publicProfile } = nextProfile as ProfileRow;
  return publicProfile;
}
