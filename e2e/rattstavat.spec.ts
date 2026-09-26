import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { stockholmDate } from "../src/lib/time";
import { openGame, typeKeys } from "./helpers";

// Dagens ord läses direkt ur det frysta schemat (bara möjligt lokalt).
const schema = JSON.parse(readFileSync(path.join(process.cwd(), "data", "rattstavat", "schema.json"), "utf8")).days as Record<
  string,
  Record<string, string>
>;
const word = (round: number) => schema[stockholmDate()][round + 1];
/** Ett garanterat felstavat ord: sista bokstaven bortplockad. */
const misspell = (w: string) => w.slice(0, -1);

async function answer(page: Page, text: string, via: "keys" | "screen") {
  if (via === "keys") {
    await typeKeys(page, text);
    await page.keyboard.press("Enter");
  } else {
    for (const ch of text) await page.locator("[data-game-key]", { hasText: new RegExp(`^${ch.toUpperCase()}$`) }).click();
    await page.getByRole("button", { name: "Svara", exact: true }).click();
  }
  // Avslöjandet är klart när resultattexten syns.
  await expect(page.getByText(/^(Rätt stavat!|Rätt stavning:)$/)).toBeVisible({ timeout: 10_000 });
}

test("spelar fem rundor med fel, öva igen och sammanfattning", async ({ page }, info) => {
  const via = info.project.name === "mobil" ? "screen" : "keys";
  await openGame(page, "/rattstavat");

  await page.getByRole("button", { name: "Förklaring" }).click();
  await expect(page.getByText("Förklaring", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Mening" }).click();
  await expect(page.getByLabel("lucka")).toBeVisible();

  // Runda 1: fel stavning → rätt stavning visas, öva igen utan poäng.
  await answer(page, misspell(word(0)), via);
  await expect(page.getByLabel(`Rätt stavning: ${word(0).toUpperCase()}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Ord 1, fel" })).toBeVisible();
  await page.getByRole("button", { name: "Öva igen" }).click();
  await typeKeys(page, word(0));
  await page.keyboard.press("Enter");
  await expect(page.getByText("Rätt! Nu sitter det.")).toBeVisible();

  // Runda 2–5: rätt.
  for (let r = 1; r < 5; r++) {
    await page.getByRole("button", { name: "Nästa ord →" }).click();
    await expect(page.getByText(`Ord ${r + 1} av 5`, { exact: false })).toBeVisible();
    await answer(page, word(r), via);
    await expect(page.getByRole("button", { name: `Ord ${r + 1}, rätt` })).toBeVisible();
  }

  const summary = page.getByRole("dialog", { name: "Resultat" });
  await expect(summary).toBeVisible({ timeout: 5000 });
  await expect(summary).toContainText("Du stavade 4 av 5 ord rätt.");
  for (let r = 0; r < 5; r++) await expect(summary).toContainText(word(r));

  // Tillbaka till ett avklarat ord från sammanfattningen.
  await summary.getByRole("button", { name: new RegExp(word(0)) }).click();
  await expect(page.getByText("Ord 1 av 5", { exact: false })).toBeVisible();
});

test("omladdning mitt i spelet fortsätter där man var", async ({ page }) => {
  await openGame(page, "/rattstavat");
  await answer(page, word(0), "keys");
  await page.reload();
  await expect(page.getByRole("button", { name: "Ord 1, rätt" })).toBeVisible();
  await expect(page.getByText("Ord 2 av 5", { exact: false })).toBeVisible();
});

test("dagens ord finns inte i sidan eller API:t innan de är besvarade", async ({ page }) => {
  const bodies: string[] = [];
  page.on("response", async (r) => {
    if (r.url().includes("/api/rattstavat/state") || r.request().resourceType() === "document") bodies.push(await r.text().catch(() => ""));
  });
  await openGame(page, "/rattstavat");
  const html = await page.content();
  for (let r = 0; r < 5; r++) {
    const re = new RegExp(`\\b${word(r)}\\b`, "i");
    expect(html).not.toMatch(re);
    for (const b of bodies) expect(b).not.toMatch(re);
  }
});
