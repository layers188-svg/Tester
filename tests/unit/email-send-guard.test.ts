import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `sendEmail` is the last thing that runs before a payload leaves for
 * Resend, and brief §11 rule 9 puts the automated spoiler check on that
 * live path rather than only in tests. Everywhere else in the suite
 * sendEmail itself is mocked, so this file is the only place its guard
 * actually executes. Only the Resend SDK and the env are faked here.
 */

const emailsSend = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: emailsSend };
  },
}));

vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    RESEND_API_KEY: "test-key",
    RESEND_FROM_EMAIL: "house@example.com",
  }),
}));

const { sendEmail } = await import("@/lib/email/send");

const payload = {
  to: "member@example.com",
  subject: "Tonight's opening is ready",
  previewText: "Sealed and waiting.",
  html: "<!doctype html><html><head><meta content='width=device-width, initial-scale=1' /><title>House Dark</title></head><body style='text-transform:uppercase'>Tonight is sealed.</body></html>",
  text: "Tonight is sealed.",
};

beforeEach(() => {
  emailsSend.mockReset();
  emailsSend.mockResolvedValue({ data: { id: "resend-1" }, error: null });
});

describe("sendEmail guard", () => {
  it("sends when the template inputs carry no title", async () => {
    const result = await sendEmail(payload, {
      data: { to: payload.to, openingNumber: 4 },
      forbiddenTerms: ["Whiplash"],
    });

    expect(result).toEqual({ id: "resend-1" });
    expect(emailsSend).toHaveBeenCalledOnce();
  });

  it("refuses to send when a title reaches the template inputs", async () => {
    await expect(
      sendEmail(payload, {
        data: { to: payload.to, openingNumber: 4, title: "Whiplash" },
        forbiddenTerms: ["Whiplash"],
      }),
    ).rejects.toThrow(/Title leak detected/);

    // The critical half: the send must not have happened.
    expect(emailsSend).not.toHaveBeenCalled();
  });

  it("still sends when a short title only collides with template chrome", async () => {
    // "It" appears in `initial-scale`, "Up" in `text-transform:uppercase`
    // and "Us" inside "House" — all in the html above. Guarding the
    // rendered payload here would fail every send in the product.
    for (const title of ["It", "Up", "Us"]) {
      emailsSend.mockClear();
      await expect(
        sendEmail(payload, {
          data: { to: payload.to, openingNumber: 4 },
          forbiddenTerms: [title],
        }),
      ).resolves.toEqual({ id: "resend-1" });
      expect(emailsSend).toHaveBeenCalledOnce();
    }
  });

  it("does not put the member's full address in the leak error", async () => {
    // Brief §14 — errors are logged, so they must stay redacted. Only
    // the first character of the local part survives; the domain is
    // kept so an operator can still tell which provider bounced.
    const attempt = sendEmail(payload, {
      data: { title: "Whiplash" },
      forbiddenTerms: ["Whiplash"],
    });
    await expect(attempt).rejects.toThrow(/m\*+@example\.com/);
    await expect(attempt).rejects.not.toThrow(/member@/);
  });

  it("surfaces a Resend failure without echoing the payload body", async () => {
    emailsSend.mockResolvedValue({ data: null, error: { message: "rate limited" } });

    await expect(
      sendEmail(payload, { data: { openingNumber: 4 }, forbiddenTerms: [] }),
    ).rejects.toThrow("Resend send failed: rate limited");
  });
});
