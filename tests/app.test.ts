import { describe, test, expect } from 'bun:test';
import { createApp } from '../src/app';

describe('app', () => {
  test('mounts health routes', async () => {
    const app = createApp(async () => {});
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('mounts jobs routes', async () => {
    const app = createApp(async () => {});
    const res = await app.request('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    expect(res.status).toBe(202);
  });
});
