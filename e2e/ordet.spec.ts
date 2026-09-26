import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { stockholmDate } from "../src/lib/time";

// Läser dagens svar direkt ur det frysta schemat (bara möjligt lokalt – svaret
// lämnas aldrig ut av API:t före avslut).
const DIR = path.join(process.cwd(), "data", "ordet");
const schema = JSON.parse(readFileSync(path.join(DIR, "schema.json"), "utf8")).days as Record<string, Record<string, string>>;
const guesses = JSON.parse(readFileSync(path.join(DIR, "gissningar.json"), "utf8")).words as Record<string, string[]>;
const answer = (len: number) => schema[stockholmDate()][len];
/** Giltiga gissningar som inte delar någon bokstav med svaret (så att svårt läge aldrig spelar in). */
const wrongWords = (len: number, n: number) => {
  const a = new Set(answer(len));
  return guesses[len].filter((w) => ![...w].some((ch) => a.has(ch))).slice(0, n);
};

/**
 * Skriver med fysiska tangenttryck. Playwrights `keyboard.type` skickar inga
 * keydown-händelser för tecken utanför amerikansk layout, så Å Ä Ö skickas som
 * de keydown-händelser ett svenskt tangentbord ger.
 */
async function typeKeys(page: Page, text: string) {
  for (const ch of text) {
    if (/^[a-z]$/i.test(ch)) await page.keyboard.press(ch);
    else await page.evaluate((key) => document.body.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })), ch);
  }
}

async function open(page: Page, len: number) {
  await page.goto(`/ordet?langd=${len}`);
  const help = page.getByRole("dialog", { name: "Så spelar du" });
  await expect(help).toBeVisible();
  await help.getByRole("button", { name: "Nu kör vi" }).click();
  await expect(help).toBeHidden();
}

async function guess(page: Page, word: string, via: "keys" | "screen", row: number) {
  if (via === "keys") {
    await typeKeys(page, word);
    await page.keyboard.press("Enter");
  } else {
    for (const ch of word) await page.locator("[data-game-key]", { hasText: new RegExp(`^${ch.toUpperCase()}$`) }).click();
    await page.getByRole("button", { name: "Gissa", exact: true }).click();
  }
  await expect(page.getByRole("img", { name: new RegExp(`^Gissning ${row}: ${word.toUpperCase()}:`) })).toBeVisible();
  await expect(page.locator('[class*="reveal"]')).toHaveCount(0);
}

test("vinner med skärmtangentbordet och ser resultatet", async ({ page }, info) => {
  const via = info.project.name === "mobil" ? "screen" : "keys";
  await open(page, 5);
  const [wrong] = wrongWords(5, 1);
  await guess(page, wrong, via, 1);
  await guess(page, answer(5), via, 2);
  const result = page.getByRole("dialog", { name: "Resultat" });
  await expect(result).toBeVisible({ timeout: 5000 });
  await expect(result).toContainText("5 bokstäver");
  await expect(result).toContainText("2 av 6 försök");
  await result.getByRole("tab", { name: "Totalt" }).click();
  await expect(result.getByText("Spelade")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(`Ordet var ${answer(5).toUpperCase()}`)).toBeVisible();
});

test("förlorar efter sex fel och får se ordet", async ({ page }) => {
  await open(page, 3);
  const words = wrongWords(3, 6);
  for (let i = 0; i < 6; i++) await guess(page, words[i], "keys", i + 1);
  const result = page.getByRole("dialog", { name: "Resultat" });
  await expect(result).toBeVisible({ timeout: 6000 });
  await expect(result).toContainText("Nära skjuter ingen hare");
  await expect(result.getByLabel(`Ordet var ${answer(3).toUpperCase()}`)).toBeVisible();
});

test("ogiltigt ord och för kort ord förbrukar inget försök", async ({ page }) => {
  await open(page, 4);
  await typeKeys(page, "qqqq");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Det ordet finns inte i vår ordlista")).toBeVisible();
  for (let i = 0; i < 4; i++) await page.keyboard.press("Backspace");
  await typeKeys(page, "ab");
  await page.keyboard.press("Enter");
  await expect(page.getByText("För kort")).toBeVisible();
  await expect(page.getByRole("img", { name: /^Gissning 1: AB$/ })).toBeVisible();
});

test("omladdning mitt i spelet återställer brädet", async ({ page }) => {
  await open(page, 6);
  const [a, b] = wrongWords(6, 2);
  await guess(page, a, "keys", 1);
  await guess(page, b, "keys", 2);
  await page.reload();
  await expect(page.getByRole("img", { name: new RegExp(`^Gissning 1: ${a.toUpperCase()}:`) })).toBeVisible();
  await expect(page.getByRole("img", { name: new RegExp(`^Gissning 2: ${b.toUpperCase()}:`) })).toBeVisible();
  await expect(page.getByRole("button", { name: /6 bokstäver, påbörjad/ })).toBeVisible();
});

test("svaret finns inte i sidans HTML eller API-svar före avslut", async ({ page }) => {
  const bodies: string[] = [];
  page.on("response", async (r) => {
    if (r.url().includes("/api/ordet/") || r.request().resourceType() === "document") bodies.push(await r.text().catch(() => ""));
  });
  await open(page, 7);
  const html = await page.content();
  for (const len of [3, 4, 5, 6, 7, 8]) {
    const re = new RegExp(`["'>]${answer(len)}["'<]`, "i");
    expect(html).not.toMatch(re);
    for (const b of bodies) expect(b).not.toMatch(re);
  }
});
