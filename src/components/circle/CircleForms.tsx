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
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        <form className={styles.form} onSubmit={createCircle}>
          <h3>Start a Circle</h3>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Circle name"
            required
          />
          <Button type="submit" variant="secondary" disabled={busy === "create"}>
            {busy === "create" ? "Creating…" : "Create"}
          </Button>
        </form>

        <form className={styles.form} onSubmit={joinCircle}>
          <h3>Join with a code</h3>
          <input
            className={styles.input}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Invite code"
            required
          />
          <Button type="submit" variant="secondary" disabled={busy === "join"}>
            {busy === "join" ? "Joining…" : "Join"}
          </Button>
        </form>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
