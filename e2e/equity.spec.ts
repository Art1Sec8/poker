import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function pick(page: Page, section: 'equity-hand-1' | 'equity-hand-2', cards: string[]) {
  const box = page.getByTestId(section);
  await box.getByRole('button', { name: '+' }).click();
  for (const card of cards) {
    await box.getByRole('button', { name: card, exact: true }).click();
  }
}

async function results(page: Page): Promise<[number, number]> {
  const one = page.getByTestId('equity-result-1');
  const two = page.getByTestId('equity-result-2');
  await expect(one).toHaveText(/^\d{1,3}\.\d%$/, { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Calculate' })).toBeEnabled({ timeout: 30_000 });
  return [parseFloat((await one.textContent())!), parseFloat((await two.textContent())!)];
}

test("hold'em: aces are a big favourite over kings", async ({ page }) => {
  await page.goto('/equity');
  const calc = page.getByRole('button', { name: 'Calculate' });
  await expect(calc).toBeDisabled();

  await pick(page, 'equity-hand-1', ['A♠', 'A♥']);
  await pick(page, 'equity-hand-2', ['K♠', 'K♥']);
  await expect(calc).toBeEnabled();
  await calc.click();

  // Monte Carlo: assert a range, not an exact number. True value is ~82%.
  const [aa, kk] = await results(page);
  expect(aa).toBeGreaterThan(78);
  expect(aa).toBeLessThan(86);
  expect(aa + kk).toBeGreaterThan(99.5);
  expect(aa + kk).toBeLessThan(100.5);
});

test('PLO: AAKK double-suited is a solid favourite over a suited rundown', async ({ page }) => {
  await page.goto('/equity');
  await page.getByRole('button', { name: 'PLO', exact: true }).click();
  await expect(page.getByText('Hand 1 (4 cards)')).toBeVisible();

  await pick(page, 'equity-hand-1', ['A♠', 'A♥', 'K♠', 'K♥']);
  await pick(page, 'equity-hand-2', ['J♥', 'T♥', '9♣', '8♣']);
  await page.getByRole('button', { name: 'Calculate' }).click();

  // The engine measures ~64% / 36% for this matchup.
  const [aakk, rundown] = await results(page);
  expect(aakk).toBeGreaterThan(59);
  expect(aakk).toBeLessThan(69);
  expect(aakk + rundown).toBeGreaterThan(99.5);
  expect(aakk + rundown).toBeLessThan(100.5);
});

// Known bug: Clear resets the cards but useEquityWorker's cancel() never
// clears `result`, so the old percentages stay on screen. Remove test.fail
// once fixed.
test('Clear removes previous results', async ({ page }) => {
  test.fail();
  await page.goto('/equity');
  await pick(page, 'equity-hand-1', ['A♠', 'A♥']);
  await pick(page, 'equity-hand-2', ['K♠', 'K♥']);
  await page.getByRole('button', { name: 'Calculate' }).click();
  await results(page);

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByTestId('equity-result-1')).toBeHidden({ timeout: 3_000 });
  await expect(page.getByRole('button', { name: 'Calculate' })).toBeDisabled();
});
