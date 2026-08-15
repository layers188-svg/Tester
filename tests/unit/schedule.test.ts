import { describe, expect, it } from "vitest";
import { isLive, isUpcoming } from "@/lib/opening/schedule";

const now = new Date("2026-08-14T09:30:00Z");
const before = "2026-08-14T09:00:00Z";
const after = "2026-08-15T09:00:00Z";

/**
 * The regression this exists for: a probe opening scheduled a minute in
 * the past sat at `scheduled` through four consecutive cron windows on
 * the deployed preview. Keying the product off the status column meant
 * the house never opened and nothing said why.
 */
describe("isLive", () => {
  it("opens an approved opening whose hour has come, even if the cron never relabelled it", () => {
    expect(isLive({ status: "scheduled", opensAt: before, closesAt: after }, now)).toBe(true);
  });

  it("keeps an opening the cron did relabel", () => {
    expect(isLive({ status: "open", opensAt: before, closesAt: after }, now)).toBe(true);
  });

  it("holds an opening back until its hour", () => {
    expect(isLive({ status: "scheduled", opensAt: after, closesAt: null }, now)).toBe(false);
  });

  it("ends the night once closes_at has passed, whatever the status says", () => {
    expect(isLive({ status: "open", opensAt: "2026-08-13T09:00:00Z", closesAt: before }, now)).toBe(
      false,
    );
  });

  it("treats a null closes_at as nothing closing it", () => {
    expect(isLive({ status: "open", opensAt: before, closesAt: null }, now)).toBe(true);
  });

  /** Approval is a human decision the clock does not get to override. */
  it("never opens a draft", () => {
    expect(isLive({ status: "draft", opensAt: before, closesAt: after }, now)).toBe(false);
  });

  it("never reopens a closed night", () => {
    expect(isLive({ status: "closed", opensAt: before, closesAt: after }, now)).toBe(false);
  });

  it("refuses an unparseable time rather than treating it as live", () => {
    expect(isLive({ status: "scheduled", opensAt: "whenever", closesAt: null }, now)).toBe(false);
  });

  it("opens exactly on the hour", () => {
    expect(isLive({ status: "scheduled", opensAt: before, closesAt: null }, new Date(before))).toBe(
      true,
    );
  });
});

describe("isUpcoming", () => {
  it("is true only for an approved opening still ahead of us", () => {
    expect(isUpcoming({ status: "scheduled", opensAt: after, closesAt: null }, now)).toBe(true);
    expect(isUpcoming({ status: "scheduled", opensAt: before, closesAt: null }, now)).toBe(false);
    expect(isUpcoming({ status: "draft", opensAt: after, closesAt: null }, now)).toBe(false);
  });
});
