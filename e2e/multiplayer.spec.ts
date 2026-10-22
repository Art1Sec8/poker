import { test, expect } from './fixtures';

test('a second player joins by room code and chat relays', async ({ page, browser }) => {
  // The socket connects lazily on Create/Join, so the lobby shows
  // "Connecting..." until then. Don't wait on it.
  await page.goto('/multiplayer');
  await page.getByPlaceholder('Enter your name...').fill('Alice');
  await page.getByRole('button', { name: 'Create Room' }).click();
  await expect(page.getByRole('heading', { name: 'Room', exact: true })).toBeVisible({ timeout: 20_000 });

  const code = (await page.locator('div.font-mono').first().textContent())?.trim() ?? '';
  expect(code).toMatch(/^[A-Z0-9]{4,6}$/);

  const guestCtx = await browser.newContext();
  const guest = await guestCtx.newPage();
  try {
    await guest.goto('/multiplayer');
    await guest.getByPlaceholder('Enter your name...').fill('Bob');
    await guest.getByPlaceholder('Room code...').fill(code);
    await guest.getByRole('button', { name: 'Join', exact: true }).click();

    for (const p of [page, guest]) {
      await expect(p.getByText('Alice', { exact: true })).toBeVisible();
      await expect(p.getByText('Bob', { exact: true })).toBeVisible();
    }

    await guest.getByPlaceholder('Type a message...').fill('nh gl');
    await guest.getByPlaceholder('Type a message...').press('Enter');
    await expect(page.getByText('nh gl')).toBeVisible();

    await page.getByRole('button', { name: 'Ready Up' }).click();
    await guest.getByRole('button', { name: 'Ready Up' }).click();
    await expect(page.getByRole('button', { name: 'Start Game' })).toBeEnabled();
  } finally {
    await guestCtx.close();
  }
});
