import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The scheduled worker (brief §12 "Automate", §16 rule 4: "Email jobs
 * must be idempotent"). This runs unattended every few minutes against
 * real member inboxes, so its claim/retry/exhaustion behaviour needs to
 * be pinned down rather than assumed.
 *
 * Supabase is faked below rather than mocked call-by-call, so the tests
 * assert on the resulting row state — what the next run would actually
 * see — instead of on which methods were called.
 */

interface QueueRow {
  id: string;
  user_id: string;
  type: string;
  send_at: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  last_error: string | null;
  updated_at: string;
}

class FakeSupabase {
  rows = new Map<string, QueueRow>();
  films: { title: string }[] = [];
  audit: Record<string, unknown>[] = [];
  /** Fires once after the worker reads its batch, to model a concurrent run. */
  afterSelect: (() => void) | null = null;

  constructor(rows: QueueRow[], films: { title: string }[] = []) {
    for (const row of rows) this.rows.set(row.id, { ...row });
    this.films = films;
  }

  from(table: string) {
    return new FakeQuery(this, table);
  }
}

type Filter = [string, string, unknown];

/**
 * A thenable query builder covering exactly the chains queue.ts uses.
 * Every method returns `this`; awaiting it resolves against the store.
 */
class FakeQuery implements PromiseLike<{ data: unknown; error: unknown }> {
  private op: "select" | "update" | "insert" = "select";
  private values: Record<string, unknown> = {};
  private filters: Filter[] = [];
  private single = false;

  constructor(
    private db: FakeSupabase,
    private table: string,
  ) {}

  select() {
    if (this.op !== "update" && this.op !== "insert") this.op = "select";
    return this;
  }
  update(values: Record<string, unknown>) {
    this.op = "update";
    this.values = values;
    return this;
  }
  insert(values: Record<string, unknown>) {
    this.op = "insert";
    this.values = values;
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push([column, "eq", value]);
    return this;
  }
  lte(column: string, value: unknown) {
    this.filters.push([column, "lte", value]);
    return this;
  }
  lt(column: string, value: unknown) {
    this.filters.push([column, "lt", value]);
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  maybeSingle() {
    this.single = true;
    return this;
  }

  private matches(row: QueueRow): boolean {
    return this.filters.every(([column, operator, value]) => {
      const actual = (row as unknown as Record<string, unknown>)[column];
      if (operator === "eq") return actual === value;
      // `lt`/`lte` are used on both a number (attempts) and ISO
      // timestamps (send_at, updated_at). ISO strings already sort
      // chronologically, so compare numerically only when both sides
      // really are numbers.
      const numeric = typeof actual === "number" && typeof value === "number";
      const left = numeric ? (actual as number) : String(actual);
      const right = numeric ? (value as number) : String(value);
      if (operator === "lte") return left <= right;
      if (operator === "lt") return left < right;
      return true;
    });
  }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?:
      ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private run(): { data: unknown; error: unknown } {
    if (this.table === "films") {
      return { data: this.db.films, error: null };
    }
    if (this.table === "audit_log") {
      this.db.audit.push(this.values);
      return { data: null, error: null };
    }

    const matched = [...this.db.rows.values()].filter((row) => this.matches(row));

    if (this.op === "select") {
      // PostgREST returns decoded JSON, not live references. Copying
      // matters: without it the claim's attempt increment would be
      // visible to the retry path reading the same object.
      const rows = matched.map((row) => ({ ...row }));
      const hook = this.db.afterSelect;
      this.db.afterSelect = null;
      hook?.();
      return { data: rows, error: null };
    }

    for (const row of matched) Object.assign(row, this.values);

    if (this.single) {
      return { data: matched.length > 0 ? { id: matched[0].id } : null, error: null };
    }
    return { data: matched, error: null };
  }
}

let db: FakeSupabase;
const sendEmail = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  getServiceSupabase: () => db,
}));

vi.mock("@/lib/email/send", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

const { processDueNotifications } = await import("@/lib/email/queue");

const NOW = new Date("2026-08-11T20:00:00.000Z");

function queueRow(overrides: Partial<QueueRow> = {}): QueueRow {
  return {
    id: "row-1",
    user_id: "user-1",
    type: "nightly_opening",
    send_at: "2026-08-11T19:00:00.000Z",
    payload: { to: "member@example.com", openingNumber: 1 },
    status: "pending",
    attempts: 0,
    last_error: null,
    updated_at: "2026-08-11T19:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({ id: "resend-1" });
});

describe("processDueNotifications — sending", () => {
  it("sends a due notification and marks it sent", async () => {
    db = new FakeSupabase([queueRow()]);
    const result = await processDueNotifications(NOW);

    expect(result).toMatchObject({ processed: 1, sent: 1, failed: 0 });
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(db.rows.get("row-1")?.status).toBe("sent");
    expect(db.rows.get("row-1")?.attempts).toBe(1);
  });

  it("addresses the email from the queued payload", async () => {
    db = new FakeSupabase([queueRow()]);
    await processDueNotifications(NOW);

    const [payload] = sendEmail.mock.calls[0];
    expect(payload.to).toBe("member@example.com");
  });

  it("passes every known film title to the send guard", async () => {
    // sendEmail refuses to send a payload containing any of these, so a
    // title can never reach an inbox even if a template regresses.
    db = new FakeSupabase([queueRow()], [{ title: "Whiplash" }, { title: "Another Film" }]);
    await processDueNotifications(NOW);

    const [, forbidden] = sendEmail.mock.calls[0];
    expect(forbidden).toEqual(["Whiplash", "Another Film"]);
  });

  it("leaves a not-yet-due notification alone", async () => {
    db = new FakeSupabase([queueRow({ send_at: "2026-08-11T23:00:00.000Z" })]);
    const result = await processDueNotifications(NOW);

    expect(result.processed).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.rows.get("row-1")?.status).toBe("pending");
  });

  it("ignores rows that are not pending", async () => {
    db = new FakeSupabase([queueRow({ status: "sent" })]);
    const result = await processDueNotifications(NOW);

    expect(result.processed).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("processDueNotifications — idempotency", () => {
  it("does not re-send a notification a second run would see", async () => {
    db = new FakeSupabase([queueRow()]);
    await processDueNotifications(NOW);
    sendEmail.mockClear();

    // The row is 'sent' now, so a repeated run must be a no-op. This is
    // the guarantee brief §16 rule 4 asks for.
    const second = await processDueNotifications(NOW);
    expect(second.processed).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("skips a row another run claimed between select and claim", async () => {
    db = new FakeSupabase([queueRow()]);

    // The row is still pending when this run reads its batch, but a
    // concurrent run takes it before this one gets to the claim. The
    // conditional claim is what has to catch that.
    db.afterSelect = () => {
      db.rows.get("row-1")!.status = "sending";
    };

    const result = await processDueNotifications(NOW);
    expect(result.processed).toBe(1);
    expect(result.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("processDueNotifications — retries", () => {
  it("returns a failed send to pending with an incremented attempt count", async () => {
    db = new FakeSupabase([queueRow()]);
    sendEmail.mockRejectedValue(new Error("Resend send failed: rate limited"));

    const result = await processDueNotifications(NOW);

    expect(result).toMatchObject({ processed: 1, sent: 0, failed: 0 });
    const row = db.rows.get("row-1")!;
    expect(row.status).toBe("pending");
    expect(row.attempts).toBe(1);
    expect(row.last_error).toMatch(/rate limited/);
  });

  it("backs off using the first interval on the first retry", async () => {
    db = new FakeSupabase([queueRow()]);
    sendEmail.mockRejectedValue(new Error("boom"));

    await processDueNotifications(NOW);

    // RETRY_BACKOFF_MINUTES starts at 1 minute; the first retry should
    // use it rather than skipping to the second entry.
    expect(db.rows.get("row-1")?.send_at).toBe("2026-08-11T20:01:00.000Z");
  });

  it("backs off further on each successive retry", async () => {
    db = new FakeSupabase([queueRow({ attempts: 1 })]);
    sendEmail.mockRejectedValue(new Error("boom"));
    await processDueNotifications(NOW);
    expect(db.rows.get("row-1")?.send_at).toBe("2026-08-11T20:05:00.000Z");

    db = new FakeSupabase([queueRow({ attempts: 2 })]);
    await processDueNotifications(NOW);
    expect(db.rows.get("row-1")?.send_at).toBe("2026-08-11T20:15:00.000Z");

    db = new FakeSupabase([queueRow({ attempts: 3 })]);
    await processDueNotifications(NOW);
    expect(db.rows.get("row-1")?.send_at).toBe("2026-08-11T21:00:00.000Z");
  });

  it("gives up after the attempt cap and marks the row failed", async () => {
    db = new FakeSupabase([queueRow({ attempts: 4 })]);
    sendEmail.mockRejectedValue(new Error("still broken"));

    const result = await processDueNotifications(NOW);

    expect(result.failed).toBe(1);
    const row = db.rows.get("row-1")!;
    expect(row.status).toBe("failed");
    expect(row.attempts).toBe(5);
  });

  it("never picks up a row that already hit the cap", async () => {
    db = new FakeSupabase([queueRow({ attempts: 5 })]);
    const result = await processDueNotifications(NOW);

    expect(result.processed).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("records a failure in the audit log without leaking the payload", async () => {
    db = new FakeSupabase([queueRow()], [{ title: "Whiplash" }]);
    sendEmail.mockRejectedValue(new Error("boom"));

    await processDueNotifications(NOW);

    expect(db.audit).toHaveLength(1);
    const entry = db.audit[0];
    expect(entry.action).toBe("notification.send_failed");
    // The audit log must never carry a title or a recipient address
    // (brief §10).
    expect(JSON.stringify(entry)).not.toMatch(/whiplash/i);
    expect(JSON.stringify(entry)).not.toMatch(/member@example\.com/);
  });

  it("keeps going after one row fails", async () => {
    db = new FakeSupabase([
      queueRow({ id: "row-1" }),
      queueRow({ id: "row-2", send_at: "2026-08-11T19:30:00.000Z" }),
    ]);
    sendEmail.mockRejectedValueOnce(new Error("boom")).mockResolvedValue({ id: "resend-2" });

    const result = await processDueNotifications(NOW);

    expect(result.processed).toBe(2);
    expect(result.sent).toBe(1);
    expect(db.rows.get("row-1")?.status).toBe("pending");
    expect(db.rows.get("row-2")?.status).toBe("sent");
  });
});

describe("processDueNotifications — crash recovery", () => {
  it("reclaims a row stranded in 'sending' by a crashed run", async () => {
    // If the worker dies between claiming a row and finishing the send,
    // the row is left in 'sending'. Without recovery it is stranded
    // forever: never sent, never failed, invisible to every later run.
    db = new FakeSupabase([
      queueRow({ status: "sending", updated_at: "2026-08-11T19:00:00.000Z", attempts: 1 }),
    ]);

    const result = await processDueNotifications(NOW);

    expect(result.processed).toBe(1);
    expect(db.rows.get("row-1")?.status).toBe("sent");
  });

  it("leaves a freshly claimed 'sending' row for the run that owns it", async () => {
    // Claimed seconds ago by a run still in flight — reclaiming it here
    // would send the same email twice.
    db = new FakeSupabase([
      queueRow({ status: "sending", updated_at: "2026-08-11T19:59:30.000Z", attempts: 1 }),
    ]);

    const result = await processDueNotifications(NOW);

    expect(result.processed).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
