import { test, expect } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers";
import { PERSONAS, emailFor, storageStateFor } from "./auth-state";

// Brief §17 item 6: "Send and receive a film under seal."
test.describe("send and receive a film under seal", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());

  test("sender sends and recipient sees it sealed, then reveals it", async ({ browser }) => {
    const sender = await browser.newContext({ storageState: storageStateFor(PERSONAS.member) });
    const senderPage = await sender.newPage();
    await senderPage.goto("/circle/send");
    await senderPage.getByPlaceholder(/what you're sending/i).fill("Whiplash");
    await senderPage.getByPlaceholder(/why you're sending it/i).fill("You need to see this.");
    await senderPage.getByLabel(emailFor(PERSONAS.friend).split("@")[0]).check();
    await senderPage.getByRole("button", { name: /send under seal/i }).click();
    await expect(senderPage.getByText(/sent under seal/i)).toBeVisible();

    const recipient = await browser.newContext({ storageState: storageStateFor(PERSONAS.friend) });
    const recipientPage = await recipient.newPage();
    await recipientPage.goto("/circle");
    await recipientPage.getByRole("heading", { name: "Sent to you" }).scrollIntoViewIfNeeded();
    await recipientPage
      .locator("a", { hasText: /sealed/i })
      .first()
      .click();

    const html = await recipientPage.content();
    expect(html).not.toMatch(/whiplash/i);

    await recipientPage.getByRole("button", { name: /reveal the title/i }).click();
    await expect(recipientPage.getByRole("heading", { name: /whiplash/i })).toBeVisible();

    await sender.close();
    await recipient.close();
  });
});
