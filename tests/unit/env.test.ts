import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `.env.example` documents the sender as
 * `RESEND_FROM_EMAIL="House Dark <hello@yourdomain.com>"`, and
 * LAUNCH_CHECKLIST item 2 asks Logan for that value. Validation used to
 * demand a bare address, so following the documented setup stopped the
 * app booting with "missing or invalid environment variable(s)". These
 * tests pin both accepted shapes so that cannot come back.
 */

const validEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://localdev.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  RESEND_API_KEY: "resend-key",
  RESEND_FROM_EMAIL: "house@example.com",
  ADMIN_EMAILS: "owner@example.com",
  CRON_SECRET: "a-long-enough-cron-secret",
};

/** getServerEnv caches, so each case needs a fresh module instance. */
async function loadEnvWith(overrides: Record<string, string>) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "test");
  for (const [key, value] of Object.entries({ ...validEnv, ...overrides })) {
    vi.stubEnv(key, value);
  }
  return import("@/lib/env");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseSenderAddress", () => {
  it("accepts a bare address", async () => {
    const { parseSenderAddress } = await loadEnvWith({});
    expect(parseSenderAddress("hello@example.com")).toBe("hello@example.com");
  });

  it("extracts the address from the display-name form", async () => {
    const { parseSenderAddress } = await loadEnvWith({});
    expect(parseSenderAddress("House Dark <hello@example.com>")).toBe("hello@example.com");
  });

  it("tolerates surrounding whitespace", async () => {
    const { parseSenderAddress } = await loadEnvWith({});
    expect(parseSenderAddress("  House Dark <hello@example.com>  ")).toBe("hello@example.com");
  });

  it("rejects a malformed address, with or without a display name", async () => {
    const { parseSenderAddress } = await loadEnvWith({});
    expect(parseSenderAddress("not-an-email")).toBeNull();
    expect(parseSenderAddress("House Dark <not-an-email>")).toBeNull();
    expect(parseSenderAddress("House Dark <>")).toBeNull();
  });
});

describe("getServerEnv", () => {
  it("accepts the sender shape .env.example documents", async () => {
    const { getServerEnv } = await loadEnvWith({
      RESEND_FROM_EMAIL: "House Dark <hello@yourdomain.com>",
    });
    // Passed through to Resend verbatim: the display name is the point.
    expect(getServerEnv().RESEND_FROM_EMAIL).toBe("House Dark <hello@yourdomain.com>");
  });

  it("accepts a bare sender address", async () => {
    const { getServerEnv } = await loadEnvWith({ RESEND_FROM_EMAIL: "house@example.com" });
    expect(getServerEnv().RESEND_FROM_EMAIL).toBe("house@example.com");
  });

  it("still names the offending variable when the sender is malformed", async () => {
    const { getServerEnv } = await loadEnvWith({ RESEND_FROM_EMAIL: "House Dark <nope>" });
    expect(() => getServerEnv()).toThrow(/RESEND_FROM_EMAIL/);
  });

  it("names a missing variable rather than failing vaguely", async () => {
    const { getServerEnv } = await loadEnvWith({ CRON_SECRET: "" });
    expect(() => getServerEnv()).toThrow(/CRON_SECRET/);
  });
});

describe("NEXT_PUBLIC_TEST_CODE_ENTRY", () => {
  it("is shut unless it is set", async () => {
    const { getServerEnv } = await loadEnvWith({});
    expect(getServerEnv().NEXT_PUBLIC_TEST_CODE_ENTRY).toBeUndefined();
  });

  it('opens for exactly "1"', async () => {
    const { getServerEnv } = await loadEnvWith({ NEXT_PUBLIC_TEST_CODE_ENTRY: "1" });
    expect(getServerEnv().NEXT_PUBLIC_TEST_CODE_ENTRY).toBe("1");
  });

  it("refuses to boot on a boolean-ish value", async () => {
    // The failure this prevents: someone sets "true", gets no hatch, and
    // hunts the bug in the form instead of in the environment. A test
    // affordance that fails silently is worse than not having one.
    for (const value of ["true", "yes", "0", "TRUE", "on"]) {
      const { getServerEnv } = await loadEnvWith({ NEXT_PUBLIC_TEST_CODE_ENTRY: value });
      expect(() => getServerEnv()).toThrow(/NEXT_PUBLIC_TEST_CODE_ENTRY/);
    }
  });
});
