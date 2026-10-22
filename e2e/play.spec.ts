import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// /play?seed=N makes the deck and AI deterministic, so each seed replays the
// same hand. Defaults: two "regular" AI opponents, 5/10 blinds, $1000 buy-in.
// The hero is the big blind on hand one.

async function startSeeded(page: Page, seed: number) {
  await page.goto(`/play?seed=${seed}`);
  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.getByText('Hand #1')).toBeVisible();
}

async function act(page: Page, name: RegExp) {
  const button = page.getByRole('button', { name });
  await expect(button).toBeEnabled();
  await button.click();
}

async function checkDown(page: Page) {
  for (const street of ['preflop', 'flop', 'turn', 'river']) {
    await expect(page.getByTestId('street')).toHaveText(street);
    await act(page, /^Check/);
  }
  await expect(page.getByText('Hand Complete')).toBeVisible();
}

test('checking down wins at showdown and the next hand deals', async ({ page }) => {
  await startSeeded(page, 4);
  await checkDown(page);
  await expect(page.getByText('You win with Pair of Aces')).toBeVisible();
  await expect(page.getByText('You won $10')).toBeVisible();

  await page.getByRole('button', { name: 'Deal Next Hand' }).click();
  await expect(page.getByText('Hand #2')).toBeVisible();
  await expect(page.getByTestId('street')).toHaveText('preflop');
});

test('losing at showdown names the winner and their hand', async ({ page }) => {
  await startSeeded(page, 1);
  await checkDown(page);
  await expect(page.getByText('AI Regular 2 wins with Two Pair, Queens and Nines')).toBeVisible();
  await expect(page.getByText('You lost $10')).toBeVisible();
});

test('folding to a turn bet forfeits only the big blind', async ({ page }) => {
  await startSeeded(page, 9);
  await act(page, /^Check/);
  await expect(page.getByTestId('street')).toHaveText('flop');
  await act(page, /^Check/);
  await expect(page.getByTestId('street')).toHaveText('turn');
  await expect(page.getByRole('button', { name: /^Call \$20/ })).toBeEnabled();
  await act(page, /^Fold/);
  await expect(page.getByText('Hand Complete')).toBeVisible();
  await expect(page.getByText('You lost $10')).toBeVisible();
});

test('the same seed replays the same hand', async ({ browser }) => {
  const results: string[] = [];
  for (let i = 0; i < 2; i++) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await startSeeded(page, 12);
    await checkDown(page);
    results.push((await page.getByText(/ (win|wins|split) with /).textContent()) ?? '');
    await ctx.close();
  }
  expect(results[0]).toBe('You win with Two Pair, Aces and Jacks');
  expect(results[1]).toBe(results[0]);
});

test('coach shows advice from the coach API', async ({ page }) => {
  await page.route('**/api/coach', (route) =>
    route.fulfill({
      json: { recommendedAction: 'check', recommendedAmount: 0, reasoning: 'Mocked coach reasoning for e2e.', equity: 42 },
    }),
  );
  await startSeeded(page, 4);
  // Advice is requested when it is the hero's turn, so wait for that first.
  await expect(page.getByRole('button', { name: /^Check/ })).toBeEnabled();
  const advice = page.waitForRequest('**/api/coach');
  await page.getByTitle('Enable Coach').click();
  await advice;
  await expect(page.getByText('Mocked coach reasoning for e2e.').first()).toBeVisible();
});
