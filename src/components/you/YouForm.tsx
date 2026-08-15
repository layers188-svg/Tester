"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/Button";
import styles from "./YouForm.module.css";

interface Profile {
  displayName: string;
  city: string;
  timezone: string;
  marketingConsent: boolean;
}

interface EmailPreferences {
  nightlyOpening: boolean;
  sealedRecommendations: boolean;
  screeningReminders: boolean;
  afterCredits: boolean;
  editorialEdm: boolean;
}

const TOGGLES: { key: keyof EmailPreferences; label: string }[] = [
  { key: "nightlyOpening", label: "Tonight's opening is ready" },
  { key: "sealedRecommendations", label: "A friend sends you a film" },
  { key: "screeningReminders", label: "Circle screening reminders" },
  { key: "afterCredits", label: "After Credits opens" },
];

export function YouForm({
  email,
  profile: initialProfile,
  emailPreferences: initialPrefs,
  circles,
}: {
  email: string;
  profile: Profile;
  emailPreferences: EmailPreferences;
  circles: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [savedProfile, setSavedProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy("profile");
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profile.displayName,
          city: profile.city || null,
          timezone: profile.timezone,
        }),
      });
      // This used to report "Saved" whatever came back, so a rejected
      // save left the member believing their timezone had changed —
      // which then decides when their nightly email arrives.
      if (!res.ok) throw new Error("Could not save your profile. Try again.");
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleMarketing() {
    const previous = profile.marketingConsent;
    const next = !previous;
    setProfile((p) => ({ ...p, marketingConsent: next }));
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingConsent: next }),
      });
      if (!res.ok) throw new Error("Could not change your consent. Try again.");
    } catch (err) {
      // Consent is the one switch that must never show a state the
      // server did not accept (brief §13).
      setProfile((p) => ({ ...p, marketingConsent: previous }));
      setError(err instanceof Error ? err.message : "Could not change your consent.");
    }
  }

  async function togglePref(key: keyof EmailPreferences) {
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setError(null);
    try {
      const res = await fetch("/api/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (!res.ok) throw new Error("Could not change that preference. Try again.");
    } catch (err) {
      setPrefs(previous);
      setError(err instanceof Error ? err.message : "Could not change that preference.");
    }
  }

  async function exportData() {
    setBusy("export");
    const res = await fetch("/api/account/export", { method: "POST" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "house-dark-export.json";
    a.click();
    URL.revokeObjectURL(url);
    setBusy(null);
  }

  async function deleteAccount() {
    setBusy("delete");
    await fetch("/api/account/delete", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.section} onSubmit={saveProfile}>
        <h2>Profile</h2>
        <label className={styles.label} htmlFor="displayName">
          Display name
        </label>
        <input
          id="displayName"
          className={styles.input}
          value={profile.displayName}
          onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
        />

        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input id="email" className={styles.input} value={email} disabled />

        <label className={styles.label} htmlFor="city">
          City
        </label>
        <input
          id="city"
          className={styles.input}
          value={profile.city}
          onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
        />

        <label className={styles.label} htmlFor="timezone">
          Timezone
        </label>
        <input
          id="timezone"
          className={styles.input}
          value={profile.timezone}
          onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
        />

        <Button
          type="submit"
          variant="secondary"
          disabled={busy === "profile"}
          aria-describedby={error ? "you-error" : undefined}
        >
          {savedProfile ? "Saved" : busy === "profile" ? "Saving…" : "Save profile"}
        </Button>
      </form>

      {/* One region for the whole page: the email toggles below save on
          change and have no submit of their own to speak through.
          role="alert" is assertive, which is right for a change that
          did not stick. */}
      {error && (
        <p className={styles.error} id="you-error" role="alert">
          {error}
        </p>
      )}
      <span className="hd-visually-hidden" role="status">
        {savedProfile ? "Profile saved." : ""}
      </span>

      <section className={styles.section}>
        <h2>Email</h2>
        {TOGGLES.map(({ key, label }) => (
          <label key={key} className={styles.toggleRow}>
            <span>{label}</span>
            <input type="checkbox" checked={prefs[key]} onChange={() => togglePref(key)} />
          </label>
        ))}
        <label className={styles.toggleRow}>
          <span>Editorial notes from House Dark</span>
          <input
            type="checkbox"
            checked={prefs.editorialEdm}
            onChange={() => togglePref("editorialEdm")}
          />
        </label>
        <label className={styles.toggleRow}>
          <span>Marketing consent</span>
          <input type="checkbox" checked={profile.marketingConsent} onChange={toggleMarketing} />
        </label>
      </section>

      <section className={styles.section}>
        <h2>Your Circles</h2>
        {circles.length === 0 ? (
          <p className={styles.hint}>You are not in a Circle yet.</p>
        ) : (
          <ul className={styles.circleList}>
            {circles.map((c) => (
              <li key={c.id}>
                <Link href={`/circle/${c.id}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2>Your data</h2>
        <div className={styles.actionsRow}>
          <Button variant="secondary" onClick={exportData} disabled={busy === "export"}>
            {busy === "export" ? "Preparing…" : "Export my data"}
          </Button>
        </div>

        {!confirmDelete ? (
          <button
            type="button"
            className={styles.dangerLink}
            onClick={() => setConfirmDelete(true)}
          >
            Delete account and all content
          </button>
        ) : (
          <div className={styles.confirmBox}>
            <p>
              This permanently deletes your account, reviews, and Circle memberships. It cannot be
              undone.
            </p>
            <div className={styles.actionsRow}>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={deleteAccount} disabled={busy === "delete"}>
                {busy === "delete" ? "Deleting…" : "Yes, delete everything"}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/*
        The mission lives here rather than in the tab bar: brief §5 fixes
        the navigation at four tabs, and this is something a member reads
        once, when they are thinking about the house rather than about
        tonight's film. You is where they already are when that happens.
      */}
      <section className={styles.section}>
        <h2>The house</h2>
        <p className={styles.sectionNote}>
          <Link href="/why">Why House Dark exists</Link>. What it is for, and what it deliberately
          is not.
        </p>
      </section>

      <section className={styles.section}>
        <nav className={styles.legalNav}>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/film-rights">Film rights and service disclaimer</Link>
        </nav>
        <button type="button" className={styles.dangerLink} onClick={signOut}>
          Sign out
        </button>
      </section>
    </div>
  );
}
