import { test, expect } from './fixtures';

test('answering a scenario gives feedback and advances', async ({ page }) => {
  await page.goto('/quiz');
  const actions = page.getByRole('button', { name: /^(Fold|Check|Call|Raise|Bet|All-?in)/i });
  await expect(actions.first()).toBeVisible();
  await actions.first().click();
  await expect(page.getByText(/^(Correct!|Incorrect)$/)).toBeVisible();
  await expect(actions.first()).toBeDisabled();
  await page.getByRole('button', { name: 'Next Hand' }).click();
  await expect(page.getByText(/^(Correct!|Incorrect)$/)).toBeHidden();
  await expect(actions.first()).toBeEnabled();
});
