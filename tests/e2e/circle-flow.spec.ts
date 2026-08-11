import { test, expect } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers";

// Brief §17 item 5: "Create a Circle and accept an invitation." Needs
// two authenticated members (a creator and a joiner) — see
// LAUNCH_CHECKLIST.md for the seeded demo accounts this can drive.
test.describe("create a Circle and accept an invitation", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());

  test("creator starts a Circle and a second member joins by code", async ({ browser }) => {
    const creator = await browser.newContext();
    const creatorPage = await creator.newPage();
    await creatorPage.goto("/circle");
    await creatorPage.getByPlaceholder("Circle name").fill(`E2E Circle ${Date.now()}`);
    await creatorPage.getByRole("button", { name: "Create" }).click();
    await expect(creatorPage).toHaveURL(/\/circle\/[0-9a-f-]+/);

    const inviteCode = await creatorPage.getByLabel("Invite code").textContent();
    expect(inviteCode?.trim()).toBeTruthy();

    const joiner = await browser.newContext();
    const joinerPage = await joiner.newPage();
    await joinerPage.goto("/circle");
    await joinerPage.getByPlaceholder("Invite code").fill(inviteCode!.trim());
    await joinerPage.getByRole("button", { name: "Join" }).click();
    await expect(joinerPage).toHaveURL(/\/circle\/[0-9a-f-]+/);

    await creator.close();
    await joiner.close();
  });
});
