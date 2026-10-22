import { test as base, expect } from '@playwright/test';

// Every test: keep the Range Academy from appending to coach-feed.jsonl, and
// fail on uncaught page errors.
export const test = base.extend<{ pageErrors: Error[] }>({
  pageErrors: [async ({ page }, use) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));
    await page.route('**/api/coach-feed', (route) => route.fulfill({ json: { ok: true } }));
    await use(errors);
    expect(errors, `uncaught page errors: ${errors.map((e) => e.message).join('; ')}`).toEqual([]);
  }, { auto: true }],
});

export { expect };
