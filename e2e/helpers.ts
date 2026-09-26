import { expect, type Page } from "@playwright/test";

/**
 * Skriver med fysiska tangenttryck. Playwrights `keyboard.type` skickar inga
 * keydown-händelser för tecken utanför amerikansk layout, så Å Ä Ö skickas som
 * de keydown-händelser ett svenskt tangentbord ger.
 */
export async function typeKeys(page: Page, text: string) {
  for (const ch of text) {
    if (/^[a-z]$/i.test(ch)) await page.keyboard.press(ch);
    else await page.evaluate((key) => document.body.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })), ch);
  }
}

/** Öppnar ett spel och stänger "Så spelar du", som visas vid första besöket. */
export async function openGame(page: Page, url: string) {
  await page.goto(url);
  const help = page.getByRole("dialog", { name: "Så spelar du" });
  await expect(help).toBeVisible();
  await help.getByRole("button", { name: "Nu kör vi" }).click();
  await expect(help).toBeHidden();
}
