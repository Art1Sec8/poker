import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function pick(page: Page, sectionLabel: RegExp, cards: string[]) {
  const section = page.locator('div.glass').filter({ hasText: sectionLabel });
  await section.getByRole('button', { name: '+' }).click();
  for (const card of cards) {
    await section.getByRole('button', { name: card, exact: true }).click();
  }
}

test('aces are a big favourite over kings', async ({ page }) => {
  await page.goto('/equity');
  const calc = page.getByRole('button', { name: 'Calculate' });
  await expect(calc).toBeDisabled();

  await pick(page, /^Hand 1/, ['A♠', 'A♥']);
  await pick(page, /^Hand 2/, ['K♠', 'K♥']);
  await expect(calc).toBeEnabled();
  await calc.click();

  const pcts = page.getByText(/^\d{1,3}\.\d%$/);
  await expect(pcts).toHaveCount(2, { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Calculate' })).toBeEnabled({ timeout: 30_000 });
  const [aa, kk] = (await pcts.allTextContents()).map((t) => parseFloat(t));
  expect(aa).toBeGreaterThan(78);
  expect(aa).toBeLessThan(86);
  expect(aa + kk).toBeGreaterThan(99);
  expect(aa + kk).toBeLessThanOrEqual(100.5);
});

// Known bug: Clear resets the cards but useEquityWorker's cancel() never
// clears `result`, so the old percentages stay on screen. Remove test.fail
// once fixed.
test('Clear removes previous results', async ({ page }) => {
  test.fail();
  await page.goto('/equity');
  await pick(page, /^Hand 1/, ['A♠', 'A♥']);
  await pick(page, /^Hand 2/, ['K♠', 'K♥']);
  await page.getByRole('button', { name: 'Calculate' }).click();
  const pcts = page.getByText(/^\d{1,3}\.\d%$/);
  await expect(pcts).toHaveCount(2, { timeout: 30_000 });

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(pcts).toHaveCount(0, { timeout: 3_000 });
  await expect(page.getByRole('button', { name: 'Calculate' })).toBeDisabled();
});
