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
    // Five words: the private note is six or fewer, not exactly six.
    await senderPage.getByPlaceholder(/trust me on this one/i).fill("You need to see this");
    await senderPage.getByLabel(emailFor(PERSONAS.friend).split("@")[0]).check();
    // The send is now two steps: preview the seal as the recipient
    // will meet it, then send. A sealed send cannot be taken back.
    await senderPage.getByRole("button", { name: /preview the seal/i }).click();
    await expect(senderPage.getByText(/as it arrives/i)).toBeVisible();
    await senderPage.getByRole("button", { name: /^send under seal$/i }).click();
    await expect(senderPage.getByText(/sent under seal/i)).toBeVisible();

    const recipient = await browser.newContext({ storageState: storageStateFor(PERSONAS.friend) });
    const recipientPage = await recipient.newPage();
    await recipientPage.goto("/circle");

    // What is waiting is now the page, not a row inside it. Circle used
    // to open with a heading, a lead and a primary button, and put the
    // film somebody chose for you below all three — the composition of
    // an admin screen. Asserting on the hero is asserting the product
    // idea: a person picked something and you do not know what.
    await expect(recipientPage.getByRole("heading", { name: /a film is waiting/i })).toBeVisible();
    await expect(recipientPage.getByText(/under seal/i).first()).toBeVisible();

    // Still nothing that names it, on the screen that shouts loudest
    // about it.
    expect(await recipientPage.content()).not.toMatch(/whiplash/i);

    await recipientPage.getByRole("link", { name: /enter under seal/i }).click();

    const html = await recipientPage.content();
    expect(html).not.toMatch(/whiplash/i);

    await recipientPage.getByRole("button", { name: /reveal the title/i }).click();
    await expect(recipientPage.getByRole("heading", { name: /whiplash/i })).toBeVisible();

    await sender.close();
    await recipient.close();
  });
});
