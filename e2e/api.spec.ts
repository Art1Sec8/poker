import { test, expect } from '@playwright/test';

// The coach feed is a local-dev tool. A production build must not accept
// unauthenticated writes to disk or expose the feed.
test('coach feed is closed in production', async ({ request }) => {
  const post = await request.post('/api/coach-feed', { data: { kind: 'probe' } });
  expect(post.status()).toBe(404);
  const get = await request.get('/api/coach-feed');
  expect(get.status()).toBe(404);
});
