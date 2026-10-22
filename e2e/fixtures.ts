import { test as base, expect } from '@playwright/test';

// Every test fails if the page throws an uncaught error.
export const test = base.extend<{ pageErrors: Error[] }>({
  pageErrors: [async ({ page }, use) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));
    await use(errors);
    expect(errors, `uncaught page errors: ${errors.map((e) => e.message).join('; ')}`).toEqual([]);
  }, { auto: true }],
});

export { expect };
