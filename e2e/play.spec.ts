import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function startGame(page: Page) {
  await page.goto('/play');
  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.getByText(/Hand #1/)).toBeVisible();
}

// Act whenever it's our turn (fold if we can, otherwise check or call) until the hand ends.
async function playOutHand(page: Page) {
  const complete = page.getByText('Hand Complete');
  const gameOver = page.getByText(/You Win!|Game Over/);
  for (let i = 0; i < 40; i++) {
    if (await complete.isVisible() || await gameOver.isVisible()) return;
    for (const name of [/^Fold/, /^Check/, /^Call/]) {
      const btn = page.getByRole('button', { name }).first();
      if (await btn.isVisible() && await btn.isEnabled()) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(500);
  }
  await expect(complete.or(gameOver)).toBeVisible();
}

test('a hand plays to completion and the next hand deals', async ({ page }) => {
  await startGame(page);
  await playOutHand(page);
  await expect(page.getByText(/You (won|lost) \$\d+|You broke even/)).toBeVisible();
  await page.getByRole('button', { name: 'Deal Next Hand' }).click();
  await expect(page.getByText(/Hand #2/)).toBeVisible();
});

test('showdown or fold result names the winner', async ({ page }) => {
  await startGame(page);
  await playOutHand(page);
  await expect(page.getByText(/(win|wins|split) (with .+|— everyone else folded)/)).toBeVisible();
});

test('coach shows advice from the coach API', async ({ page }) => {
  await page.route('**/api/coach', (route) =>
    route.fulfill({
      json: { recommendedAction: 'call', recommendedAmount: 10, reasoning: 'Mocked coach reasoning for e2e.', equity: 42 },
    }),
  );
  await startGame(page);
  await page.getByTitle('Enable Coach').click();
  await expect(page.getByText('Mocked coach reasoning for e2e.').first()).toBeVisible({ timeout: 20_000 });
});
