// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { YouForm } from "@/components/you/YouForm";

/**
 * The You page saves optimistically: a toggle flips the moment it is
 * pressed and the request goes out behind it. That is the right feel,
 * but it used to ignore the response entirely — a rejected save still
 * reported "Saved", and a rejected toggle stayed flipped. The member
 * was then looking at a preference the server had never accepted, which
 * matters most for marketing consent (brief §13) and for the timezone
 * that decides when their nightly email arrives.
 *
 * Rendered with react-dom directly, matching no-trailer-player.test.tsx.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/browser", () => ({
  getBrowserSupabase: () => ({ auth: { signOut: vi.fn() } }),
}));

let container: HTMLDivElement;
let root: Root;

const profile = {
  displayName: "Member",
  city: "Melbourne",
  timezone: "Australia/Melbourne",
  marketingConsent: false,
};

const emailPreferences = {
  nightlyOpening: true,
  sealedRecommendations: true,
  screeningReminders: true,
  afterCredits: true,
  editorialEdm: false,
};

function renderForm() {
  act(() => {
    root.render(
      <YouForm
        email="member@example.com"
        profile={profile}
        emailPreferences={emailPreferences}
        circles={[]}
      />,
    );
  });
}

/** Resolves the microtasks the click handler awaits. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function toggleFor(label: string): HTMLInputElement {
  const row = Array.from(container.querySelectorAll("label")).find((l) =>
    l.textContent?.includes(label),
  );
  if (!row) throw new Error(`No toggle labelled ${label}`);
  return row.querySelector("input") as HTMLInputElement;
}

beforeEach(() => {
  // React only permits act() when the environment declares itself a
  // test environment; without it every act call warns.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("saving the profile", () => {
  it("reports Saved only when the server accepted it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    renderForm();

    const form = container.querySelector("form") as HTMLFormElement;
    act(() => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await settle();

    expect(container.textContent).toContain("Saved");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("says so when the save was rejected, rather than claiming success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    renderForm();

    const form = container.querySelector("form") as HTMLFormElement;
    act(() => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await settle();

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toMatch(/could not save your profile/i);
    expect(container.textContent).not.toContain("Saved");
  });
});

describe("the email toggles", () => {
  it("keeps the new state when the server accepted it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    renderForm();

    const toggle = toggleFor("Tonight's opening is ready");
    expect(toggle.checked).toBe(true);
    act(() => toggle.click());
    await settle();

    expect(toggle.checked).toBe(false);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("reverts the switch when the server refused", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    renderForm();

    const toggle = toggleFor("Tonight's opening is ready");
    act(() => toggle.click());
    await settle();

    // The switch must not sit in a state the server never accepted.
    expect(toggle.checked).toBe(true);
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(
      /could not change that preference/i,
    );
  });

  it("reverts marketing consent when the server refused", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    renderForm();

    const consent = toggleFor("Marketing consent");
    expect(consent.checked).toBe(false);
    act(() => consent.click());
    await settle();

    expect(consent.checked).toBe(false);
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(
      /could not change your consent/i,
    );
  });
});
