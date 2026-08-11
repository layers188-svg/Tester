"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/Button";
import styles from "./JoinForm.module.css";

type Step = "email" | "code";

const RESEND_COOLDOWN_SECONDS = 60;

export function JoinForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const nextPath = useRef("/tonight");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    nextPath.current = params.get("next") || "/tonight";
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function sendCode() {
    setError(null);
    setBusy(true);
    try {
      const supabase = getBrowserSupabase();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (sendError) throw sendError;
      setStep("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function requestCode(e: React.FormEvent) {
    e.preventDefault();
    void sendCode();
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = getBrowserSupabase();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (verifyError) throw verifyError;

      await fetch("/api/auth/ensure-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingConsent }),
      });

      router.push(nextPath.current);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code did not work. Check it and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "email") {
    return (
      <form className={styles.form} onSubmit={requestCode}>
        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
          />
          <span>
            Send me occasional editorial notes from House Dark. Unrelated to sign in, and you can
            withdraw any time from You.
          </span>
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" fullWidth disabled={busy}>
          {busy ? "Sending…" : "Send my code"}
        </Button>

        <p className={styles.fineprint}>
          We&rsquo;ll email a six digit code. It expires in 5 minutes. By continuing you agree to
          the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy</Link> pages.
        </p>
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={verifyCode}>
      <p className={styles.sentTo}>
        Code sent to <strong>{email}</strong>.{" "}
        <button type="button" className={styles.linkButton} onClick={() => setStep("email")}>
          Use a different email
        </button>
      </p>

      <label className={styles.label} htmlFor="code">
        Six digit code
      </label>
      <input
        id="code"
        name="code"
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        autoComplete="one-time-code"
        required
        className={styles.input}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="123456"
      />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" fullWidth disabled={busy || code.length !== 6}>
        {busy ? "Checking…" : "Enter House Dark"}
      </Button>

      <button
        type="button"
        className={styles.linkButton}
        disabled={cooldown > 0 || busy}
        onClick={() => void sendCode()}
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
      </button>
    </form>
  );
}
