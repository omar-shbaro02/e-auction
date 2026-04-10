"use client";

export type UserProfile = {
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  cardName?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
};

export const authSessionKey = "lotlane-auth-session";
export const authChangedEvent = "lotlane-auth-changed";

type AuthResult =
  | {
      ok: true;
      profile: UserProfile;
    }
  | {
      ok: false;
      error: string;
    };

function isBrowser() {
  return typeof window !== "undefined";
}

function emitAuthChanged() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(authChangedEvent));
}

function readSessionProfile() {
  if (!isBrowser()) {
    return null as UserProfile | null;
  }

  const raw = window.localStorage.getItem(authSessionKey);

  if (!raw) {
    return null as UserProfile | null;
  }

  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    window.localStorage.removeItem(authSessionKey);
    return null as UserProfile | null;
  }
}

function writeSessionProfile(profile: UserProfile | null) {
  if (!isBrowser()) {
    return;
  }

  if (!profile) {
    window.localStorage.removeItem(authSessionKey);
  } else {
    window.localStorage.setItem(authSessionKey, JSON.stringify(profile));
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return (await response.json()) as T;
}

export function getCurrentUser() {
  return readSessionProfile();
}

export async function signUp(profile: UserProfile, password: string): Promise<AuthResult> {
  let result: AuthResult;

  try {
    result = await postJson<AuthResult>("/api/auth/signup", { profile, password });
  } catch {
    return { ok: false, error: "We couldn't create your account right now. Please try again." };
  }

  if (!result.ok) {
    return result;
  }

  writeSessionProfile(result.profile);
  emitAuthChanged();
  return result;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  let result: AuthResult;

  try {
    result = await postJson<AuthResult>("/api/auth/login", { email, password });
  } catch {
    return { ok: false, error: "We couldn't sign you in right now. Please try again." };
  }

  if (!result.ok) {
    return result;
  }

  writeSessionProfile(result.profile);
  emitAuthChanged();
  return result;
}

export function signOut() {
  writeSessionProfile(null);
  emitAuthChanged();
}

export async function updateCurrentUserProfile(updates: Partial<UserProfile>) {
  const current = readSessionProfile();

  if (!current) {
    return;
  }

  const nextProfile = {
    ...current,
    ...updates,
    email: current.email
  };

  writeSessionProfile(nextProfile);
  emitAuthChanged();

  try {
    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: current.email,
        updates
      })
    });

    if (!response.ok) {
      writeSessionProfile(current);
      emitAuthChanged();
    }
  } catch {
    writeSessionProfile(current);
    emitAuthChanged();
  }
}
