import { test, expect } from './fixtures';

test('explore: tapping a hand opens its detail sheet', async ({ page }) => {
  await page.goto('/ranges');
  await page.getByRole('button', { name: 'BTN', exact: true }).click();
  await page.getByTitle(/^AA: \d+%$/).click();
  await expect(page.getByText(/Open frequency from BTN/)).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText(/Open frequency from BTN/)).toBeHidden();
});

test('switching modes changes the view', async ({ page }) => {
  await page.goto('/ranges');
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(page.getByRole('button', { name: 'UTG', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Drill', exact: true }).click();
  await expect(page.getByText(/Tap every hand you would/)).toBeVisible();
});

test('drill: submitting picks shows a scorecard', async ({ page }) => {
  await page.goto('/ranges');
  await page.getByRole('button', { name: 'Drill', exact: true }).click();
  await page.getByRole('button', { name: 'UTG', exact: true }).click();
  const submit = page.getByRole('button', { name: /Submit range/ });
  await expect(submit).toBeDisabled();
  for (const hand of ['AA', 'KK', 'AKs']) {
    await page.getByTitle(hand, { exact: true }).click();
  }
  await expect(submit).toHaveText(/Submit range \(3 hands\)/);
  await submit.click();
  await expect(page.getByText('Your open')).toBeVisible();
  await expect(page.getByText('Target')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});
