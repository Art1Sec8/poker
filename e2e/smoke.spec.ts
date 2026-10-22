import { test, expect } from './fixtures';

const routes = [
  { path: '/', heading: /poker/i },
  { path: '/quiz', heading: /quiz/i },
  { path: '/ranges', heading: 'Range Academy' },
  { path: '/play', heading: /play|game/i },
  { path: '/multiplayer', heading: /multiplayer/i },
  { path: '/equity', heading: 'Equity Calculator' },
  { path: '/history', heading: /history/i },
];

for (const { path, heading } of routes) {
  test(`${path} renders`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: heading }).first()).toBeVisible();
  });
}

test('home feature cards link to each tool', async ({ page }) => {
  await page.goto('/');
  for (const title of ['Hand Quiz', 'Preflop Ranges', 'Play vs AI', 'Multiplayer', 'Equity Calc', 'Hand History']) {
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  }
  await page.getByRole('link', { name: /Equity Calc/ }).click();
  await expect(page).toHaveURL(/\/equity$/);
});

test('bottom nav moves between pages', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation').last();
  await nav.getByRole('link', { name: /Ranges/i }).click();
  await expect(page).toHaveURL(/\/ranges$/);
  await nav.getByRole('link', { name: /Quiz/i }).click();
  await expect(page).toHaveURL(/\/quiz$/);
  await nav.getByRole('link', { name: /Home/i }).click();
  await expect(page).toHaveURL(/\/$/);
});
