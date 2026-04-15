"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth";

type Mode = "login" | "signup";

type AuthViewProps = {
  initialMode?: Mode;
};

export function AuthView({ initialMode = "login" }: AuthViewProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupAddress, setSignupAddress] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    router.push("/checkout" as Route);
  }

  async function handleSignupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (signupPassword !== signupPasswordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const result = await signUp(
      {
        fullName: signupName.trim(),
        email: signupEmail.trim(),
        phone: signupPhone.trim(),
        address: signupAddress.trim()
      },
      signupPassword
    );
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    router.push("/checkout" as Route);
  }

  return (
    <main className="site-shell auth-page">
      <section className="auth-shell auth-shell-compact">
        <div className="auth-mini-toolbar">
          <button className="auth-toolbar-pill" type="button">
            <span aria-hidden="true">USD</span>
          </button>
          <div className="auth-toolbar-avatar" aria-hidden="true">
            U
          </div>
        </div>

        <div className="auth-welcome-card">
          <div className="auth-welcome-notch" aria-hidden="true" />
          <h1>Welcome</h1>
          <p>Sign in to access your account</p>
          <button
            className="auth-hero-button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            type="button"
          >
            Login
          </button>
          <p className="auth-switch-copy">
            New customers{" "}
            <button
              className="auth-inline-link"
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              type="button"
            >
              Sign up here!
            </button>
          </p>
        </div>

        <div className="auth-card detail-card">
          <div className="auth-panel-head">
            <span className="eyebrow">{mode === "login" ? "Login" : "Create account"}</span>
            <h2>{mode === "login" ? "Access your buyer account" : "Set up your buyer profile"}</h2>
            <p>
              {mode === "login"
                ? "Use your registered email and password to continue to bidding and checkout."
                : "We require your email and phone number to enable bidding, fulfilment updates, and checkout."}
            </p>
          </div>

          <div className="auth-tab-row">
            <button
              className={mode === "login" ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setMode("login");
                setError("");
              }}
              type="button"
            >
              Login
            </button>
            <button
              className={mode === "signup" ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              type="button"
            >
              Sign up
            </button>
          </div>

          {mode === "login" ? (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <label className="checkout-field">
                <span>Email</span>
                <input
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="buyer@company.com"
                  required
                  type="email"
                  value={loginEmail}
                />
              </label>
              <label className="checkout-field">
                <span>Password</span>
                <input
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  type="password"
                  value={loginPassword}
                />
              </label>
              {error ? <p className="auth-error">{error}</p> : null}
              <button className="cart-checkout" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignupSubmit}>
              <div className="checkout-form-grid">
                <label className="checkout-field">
                  <span>Full name</span>
                  <input
                    onChange={(event) => setSignupName(event.target.value)}
                    placeholder="Jane Buyer"
                    required
                    type="text"
                    value={signupName}
                  />
                </label>
                <label className="checkout-field">
                  <span>Address</span>
                  <input
                    onChange={(event) => setSignupAddress(event.target.value)}
                    placeholder="123 Warehouse Road"
                    type="text"
                    value={signupAddress}
                  />
                </label>
                <label className="checkout-field">
                  <span>Email</span>
                  <input
                    onChange={(event) => setSignupEmail(event.target.value)}
                    placeholder="buyer@company.com"
                    required
                    type="email"
                    value={signupEmail}
                  />
                </label>
                <label className="checkout-field">
                  <span>Phone number</span>
                  <input
                    onChange={(event) => setSignupPhone(event.target.value)}
                    minLength={7}
                    placeholder="+1 555 010 4422"
                    required
                    type="tel"
                    value={signupPhone}
                  />
                </label>
                <label className="checkout-field checkout-field-wide">
                  <span>Password</span>
                  <input
                    onChange={(event) => setSignupPassword(event.target.value)}
                    minLength={8}
                    placeholder="Create a password"
                    required
                    type="password"
                    value={signupPassword}
                  />
                </label>
                <label className="checkout-field checkout-field-wide">
                  <span>Confirm password</span>
                  <input
                    onChange={(event) => setSignupPasswordConfirm(event.target.value)}
                    minLength={8}
                    placeholder="Repeat your password"
                    required
                    type="password"
                    value={signupPasswordConfirm}
                  />
                </label>
              </div>
              {error ? <p className="auth-error">{error}</p> : null}
              <button className="cart-checkout" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
