"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { nextOpeningStatuses } from "@/lib/opening/state";
import type { OpeningStatus, PlaybackAccessType } from "@/lib/supabase/types";
import { isDurationInPreferredRange } from "@/lib/media/validate";
import styles from "./OpeningDetail.module.css";
import formStyles from "./DeskForm.module.css";

interface OpeningData {
  id: string;
  openingNumber: number;
  status: OpeningStatus;
  opensAt: string;
  runtimeMinutes: number;
  availabilityCount: number;
  minimumAccessType: string;
  noTrailerStoragePath: string;
  contentNotes: string | null;
}

interface Film {
  id: string;
  title: string;
  release_year: number | null;
  runtime_minutes: number;
  rights_notes: string | null;
}

interface Provider {
  id: string;
  territory: string;
  provider_name: string;
  access_type: PlaybackAccessType;
  deep_link: string;
  verified_at: string | null;
  is_active: boolean;
}

export function OpeningDetail({
  opening,
  film,
  approvedAt,
  cues: initialCues,
  providers: initialProviders,
}: {
  opening: OpeningData;
  film: Film | null;
  approvedAt: string | null;
  cues: string[];
  providers: Provider[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cues, setCues] = useState<string[]>([...initialCues, "", "", ""].slice(0, 3));
  const [contentNotes, setContentNotes] = useState(opening.contentNotes ?? "");
  const [availabilityCount, setAvailabilityCount] = useState(String(opening.availabilityCount));
  const [minimumAccessType, setMinimumAccessType] = useState(opening.minimumAccessType);
  const [providers, setProviders] = useState(initialProviders);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"sealed" | "revealed">("sealed");
  const [opensAt, setOpensAt] = useState(() => toLocalInputValue(opening.opensAt));
  const [providerForm, setProviderForm] = useState({
    territory: "AU",
    providerName: "",
    accessType: "subscription" as PlaybackAccessType,
    deepLink: "",
  });

  const hasUpload = opening.noTrailerStoragePath !== "pending-upload";
  const nextStatuses = nextOpeningStatuses(opening.status);

  async function saveDetails() {
    setBusy("details");
    setError(null);
    try {
      const res = await fetch(`/api/desk/openings/${opening.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentNotes: contentNotes || null,
          availabilityCount: Number(availabilityCount),
          minimumAccessType,
          cues: cues.filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(null), 2000);
    }
  }

  async function uploadFile(file: File) {
    setBusy("upload");
    setError(null);
    try {
      const meta = await readVideoMeta(file);
      const form = new FormData();
      form.append("file", file);
      form.append("durationSeconds", String(meta.duration));
      form.append("width", String(meta.width));
      form.append("height", String(meta.height));

      const res = await fetch(`/api/desk/openings/${opening.id}/upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error);
      const payload = await res.json();
      if (!isDurationInPreferredRange(meta.duration)) {
        setMessage("Uploaded. Note: outside the preferred 8-12 second duration.");
      } else if (payload.warnings?.length) {
        setMessage("Uploaded, with a note — see below.");
      } else {
        setMessage("No Trailer uploaded.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setBusy("approve");
    setError(null);
    try {
      const res = await fetch(`/api/desk/openings/${opening.id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve.");
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(status: OpeningStatus) {
    setBusy(status);
    setError(null);
    try {
      const res = await fetch(`/api/desk/openings/${opening.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "scheduled" && opensAt ? { opensAt: new Date(opensAt).toISOString() } : {}),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change status.");
    } finally {
      setBusy(null);
    }
  }

  async function addProvider(e: React.FormEvent) {
    e.preventDefault();
    if (!film) return;
    setBusy("provider");
    setError(null);
    try {
      const res = await fetch("/api/desk/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId: film.id, ...providerForm }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const created = await res.json();
      setProviders((prev) => [...prev, created]);
      setProviderForm({ territory: "AU", providerName: "", accessType: "subscription", deepLink: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add provider.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleVerified(provider: Provider) {
    await fetch(`/api/desk/providers/${provider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: !provider.verified_at }),
    });
    setProviders((prev) =>
      prev.map((p) => (p.id === provider.id ? { ...p, verified_at: p.verified_at ? null : new Date().toISOString() } : p)),
    );
  }

  async function removeProvider(id: string) {
    await fetch(`/api/desk/providers/${id}`, { method: "DELETE" });
    setProviders((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <p className={styles.eyebrow}>Opening {opening.openingNumber}</p>
      <h1>{film?.title ?? "Untitled"}</h1>
      <p className={styles.statusLine}>
        Status: <strong>{opening.status}</strong> · Approved: <strong>{approvedAt ? "Yes" : "No"}</strong>
      </p>

      {error && <p className={formStyles.error}>{error}</p>}
      {message && <p className={formStyles.success}>{message}</p>}

      <section className={styles.section}>
        <h2>Lifecycle</h2>
        {opening.status === "approved" && nextStatuses.includes("scheduled") && (
          <>
            <label className={formStyles.label} htmlFor="opensAt">
              Opens at
            </label>
            <input
              id="opensAt"
              type="datetime-local"
              className={formStyles.input}
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </>
        )}
        <div className={styles.actionsRow}>
          {opening.status === "draft" && (
            <Button variant="primary" onClick={approve} disabled={busy === "approve" || !hasUpload}>
              {busy === "approve" ? "Approving…" : "Approve"}
            </Button>
          )}
          {nextStatuses
            .filter((s) => s !== "approved")
            .map((s) => (
              <Button key={s} variant="secondary" onClick={() => changeStatus(s)} disabled={busy === s}>
                Move to {s}
              </Button>
            ))}
        </div>
        {!hasUpload && <p className={formStyles.hint}>Upload the No Trailer before approving.</p>}
      </section>

      <section className={styles.section}>
        <h2>No Trailer</h2>
        <p className={formStyles.hint}>
          {hasUpload ? `Uploaded: ${opening.noTrailerStoragePath}` : "Not uploaded yet."}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className={styles.fileInput}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy === "upload"}>
          {busy === "upload" ? "Uploading…" : hasUpload ? "Replace file" : "Upload file"}
        </Button>
      </section>

      <section className={styles.section}>
        <h2>Member-facing details</h2>
        <div className={formStyles.form}>
          <span className={formStyles.label}>Safe cues</span>
          <div className={formStyles.row}>
            {cues.map((cue, i) => (
              <input
                key={i}
                className={formStyles.input}
                value={cue}
                maxLength={24}
                onChange={(e) => {
                  const next = [...cues];
                  next[i] = e.target.value;
                  setCues(next);
                }}
              />
            ))}
          </div>

          <label className={formStyles.label} htmlFor="contentNotes">
            Content notes
          </label>
          <textarea
            id="contentNotes"
            className={formStyles.textarea}
            rows={2}
            value={contentNotes}
            onChange={(e) => setContentNotes(e.target.value)}
          />

          <div className={formStyles.row}>
            <div>
              <label className={formStyles.label} htmlFor="availabilityCount">
                Verified places to watch
              </label>
              <input
                id="availabilityCount"
                className={formStyles.input}
                value={availabilityCount}
                onChange={(e) => setAvailabilityCount(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={formStyles.label} htmlFor="minimumAccessType">
                Access type
              </label>
              <select
                id="minimumAccessType"
                className={formStyles.select}
                value={minimumAccessType}
                onChange={(e) => setMinimumAccessType(e.target.value)}
              >
                <option value="unknown">Unknown</option>
                <option value="subscription">Subscription</option>
                <option value="rental">Rental</option>
                <option value="free">Free</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>

          <Button variant="secondary" onClick={saveDetails} disabled={busy === "details"}>
            {busy === "details" ? "Saving…" : "Save details"}
          </Button>
        </div>
      </section>

      {film && (
        <section className={styles.section}>
          <h2>Providers</h2>
          <ul className={styles.providerList}>
            {providers.map((p) => (
              <li key={p.id} className={styles.providerRow}>
                <span>
                  {p.provider_name} · {p.territory} · {p.access_type}
                </span>
                <span className={styles.providerActions}>
                  <button type="button" className={styles.linkButton} onClick={() => toggleVerified(p)}>
                    {p.verified_at ? "Verified" : "Mark verified"}
                  </button>
                  <button type="button" className={styles.linkButtonDanger} onClick={() => removeProvider(p.id)}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <form className={formStyles.form} onSubmit={addProvider}>
            <div className={formStyles.row}>
              <input
                className={formStyles.input}
                placeholder="Territory (AU)"
                value={providerForm.territory}
                onChange={(e) => setProviderForm((f) => ({ ...f, territory: e.target.value }))}
                maxLength={4}
              />
              <select
                className={formStyles.select}
                value={providerForm.accessType}
                onChange={(e) => setProviderForm((f) => ({ ...f, accessType: e.target.value as PlaybackAccessType }))}
              >
                <option value="subscription">Subscription</option>
                <option value="rental">Rental</option>
                <option value="purchase">Purchase</option>
                <option value="free">Free</option>
              </select>
            </div>
            <input
              className={formStyles.input}
              placeholder="Provider name"
              value={providerForm.providerName}
              onChange={(e) => setProviderForm((f) => ({ ...f, providerName: e.target.value }))}
            />
            <input
              className={formStyles.input}
              placeholder="Direct playback link"
              value={providerForm.deepLink}
              onChange={(e) => setProviderForm((f) => ({ ...f, deepLink: e.target.value }))}
            />
            <Button type="submit" variant="secondary" disabled={busy === "provider"}>
              Add provider
            </Button>
          </form>
        </section>
      )}

      <section className={styles.section}>
        <h2>Preview</h2>
        <div className={styles.actionsRow}>
          <Button
            variant={previewMode === "sealed" ? "primary" : "secondary"}
            onClick={() => setPreviewMode("sealed")}
          >
            Sealed preview
          </Button>
          <Button
            variant={previewMode === "revealed" ? "primary" : "secondary"}
            onClick={() => setPreviewMode("revealed")}
          >
            Reveal preview
          </Button>
        </div>
        <div className={styles.previewFrame}>
          {previewMode === "sealed" ? (
            <div className={styles.previewCard}>
              <p className={styles.eyebrow}>Opening {opening.openingNumber}</p>
              <h3>Tonight is sealed.</h3>
              <p>{opening.runtimeMinutes} minutes · {providers.length} verified place(s) to watch</p>
              <ul className={styles.cuesPreview}>
                {cues.filter(Boolean).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              {contentNotes && <p className={formStyles.hint}>Content notes: {contentNotes}</p>}
            </div>
          ) : (
            <div className={styles.previewCard}>
              <p className={styles.eyebrow}>Opening {opening.openingNumber}</p>
              <h3>
                {film?.title} {film?.release_year ? `(${film.release_year})` : ""}
              </h3>
              <ul className={styles.cuesPreview}>
                {providers.map((p) => (
                  <li key={p.id}>
                    {p.provider_name} — {p.access_type}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function readVideoMeta(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => resolve({ duration: 0, width: 0, height: 0 });
    video.src = URL.createObjectURL(file);
  });
}
