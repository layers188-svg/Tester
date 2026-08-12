"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import styles from "./CircleForms.module.css";

export function CircleForms() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  // Two forms, one error slot. Which form failed has to be tracked or
  // the message cannot be attached to the field that caused it (brief
  // §16 accessibility rule 8).
  const [error, setError] = useState<{ scope: "create" | "join"; message: string } | null>(null);

  async function createCircle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("create");
    try {
      const res = await fetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not create the Circle.");
      const circle = await res.json();
      router.push(`/circle/${circle.id}`);
      router.refresh();
    } catch (err) {
      setError({
        scope: "create",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function joinCircle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("join");
    try {
      const res = await fetch("/api/circles/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "That code was not recognised.");
      const { circleId } = await res.json();
      router.push(`/circle/${circleId}`);
      router.refresh();
    } catch (err) {
      setError({
        scope: "join",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        <form className={styles.form} onSubmit={createCircle}>
          <h3>Start a Circle</h3>
          {/* A placeholder is not a label: it disappears on the first
              keystroke and screen readers may not announce it at all. */}
          <label className="hd-visually-hidden" htmlFor="circle-name">
            Circle name
          </label>
          <input
            id="circle-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Circle name"
            required
            aria-invalid={error?.scope === "create" ? true : undefined}
            aria-describedby={error?.scope === "create" ? "circle-name-error" : undefined}
          />
          {error?.scope === "create" && (
            <p className={styles.error} id="circle-name-error" role="alert">
              {error.message}
            </p>
          )}
          <Button type="submit" variant="secondary" disabled={busy === "create"}>
            {busy === "create" ? "Creating…" : "Create"}
          </Button>
        </form>

        <form className={styles.form} onSubmit={joinCircle}>
          <h3>Join with a code</h3>
          <label className="hd-visually-hidden" htmlFor="invite-code">
            Invite code
          </label>
          <input
            id="invite-code"
            className={styles.input}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Invite code"
            required
            aria-invalid={error?.scope === "join" ? true : undefined}
            aria-describedby={error?.scope === "join" ? "invite-code-error" : undefined}
          />
          {error?.scope === "join" && (
            <p className={styles.error} id="invite-code-error" role="alert">
              {error.message}
            </p>
          )}
          <Button type="submit" variant="secondary" disabled={busy === "join"}>
            {busy === "join" ? "Joining…" : "Join"}
          </Button>
        </form>
      </div>
    </section>
  );
}
