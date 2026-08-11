"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import styles from "./CircleDetail.module.css";

interface Member {
  user_id: string;
  display_name: string;
  role: "member" | "organiser";
}

interface Activity {
  kind: "watched" | "sent";
  actor_id: string;
  actor_display_name: string;
  happened_at: string | null;
}

interface Screening {
  id: string;
  scheduledFor: string;
  hasSealedRecommendation: boolean;
  hasOpening: boolean;
}

interface Attendance {
  screening_id: string;
  user_id: string;
  response: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function CircleDetail({
  circle,
  members,
  activity,
  screenings,
  attendance,
  currentUserId,
  myRole,
}: {
  circle: {
    id: string;
    name: string;
    inviteCode: string;
    defaultScreeningDay: number | null;
    defaultScreeningTime: string | null;
  };
  members: Member[];
  activity: Activity[];
  screenings: Screening[];
  attendance: Attendance[];
  currentUserId: string;
  myRole: string;
}) {
  const router = useRouter();
  const [copyLabel, setCopyLabel] = useState("Copy invite link");
  const [busy, setBusy] = useState<string | null>(null);

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?circle=${circle.inviteCode}`
      : "";

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink || circle.inviteCode);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy invite link"), 2000);
    } catch {
      // ignore
    }
  }

  async function leaveCircle() {
    setBusy("leave");
    await fetch(`/api/circles/${circle.id}/leave`, { method: "POST" });
    router.push("/circle");
    router.refresh();
  }

  async function removeMember(userId: string) {
    setBusy(userId);
    await fetch(`/api/circles/${circle.id}/members/${userId}`, { method: "DELETE" });
    router.refresh();
    setBusy(null);
  }

  async function respond(screeningId: string, response: "attending" | "maybe" | "declined") {
    setBusy(screeningId);
    await fetch(`/api/screenings/${screeningId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response }),
    });
    router.refresh();
    setBusy(null);
  }

  return (
    <div className={styles.page}>
      <h1>{circle.name}</h1>
      {circle.defaultScreeningDay !== null && (
        <p className={styles.lead}>
          House Night: {DAY_NAMES[circle.defaultScreeningDay]}
          {circle.defaultScreeningTime ? ` at ${circle.defaultScreeningTime.slice(0, 5)}` : ""}
        </p>
      )}

      <section className={styles.section}>
        <h2>Members</h2>
        <ul className={styles.members}>
          {members.map((m) => (
            <li key={m.user_id}>
              <span>{m.display_name}</span>
              <span className={styles.memberMeta}>
                {m.role}
                {myRole === "organiser" && m.user_id !== currentUserId && (
                  <button
                    type="button"
                    className={styles.linkButton}
                    disabled={busy === m.user_id}
                    onClick={() => removeMember(m.user_id)}
                  >
                    Remove
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Invite</h2>
        <p className={styles.hint}>Anyone with this code can join {circle.name}.</p>
        <p className={styles.inviteCode} aria-label="Invite code">
          {circle.inviteCode}
        </p>
        <Button variant="secondary" onClick={copyInvite}>
          {copyLabel}
        </Button>
      </section>

      {screenings.length > 0 && (
        <section className={styles.section}>
          <h2>Screenings</h2>
          <ul className={styles.screenings}>
            {screenings.map((s) => {
              const mine = attendance.find(
                (a) => a.screening_id === s.id && a.user_id === currentUserId,
              );
              return (
                <li key={s.id} className={styles.screeningCard}>
                  <p>
                    {new Date(s.scheduledFor).toLocaleString(undefined, {
                      weekday: "long",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <div className={styles.attendanceRow}>
                    {(["attending", "maybe", "declined"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={styles.attendanceButton}
                        data-active={mine?.response === r}
                        disabled={busy === s.id}
                        onClick={() => respond(s.id, r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2>Activity</h2>
        {activity.length === 0 ? (
          <p className={styles.hint}>Nothing yet. No titles show here, only who watched or sent.</p>
        ) : (
          <ul className={styles.activity}>
            {activity.slice(0, 20).map((a, i) => (
              <li key={i}>
                <strong>{a.actor_display_name}</strong>{" "}
                {a.kind === "watched" ? "watched something." : "sent a film under seal."}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <Button variant="ghost" onClick={leaveCircle} disabled={busy === "leave"}>
          Leave this Circle
        </Button>
      </section>
    </div>
  );
}
