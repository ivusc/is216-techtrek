import process from 'node:process';
import { expect } from './fixtures.js';

export async function removeAccount(playwright, userName, passwords) {
  const api = await playwright.request.newContext({ baseURL: process.env.API_URL });
  for (const password of passwords) {
    const login = await api.post('/login', { data: { userName, password }, maxRetries: 3 });
    if (login.status() === 200) {
      const deleted = await api.delete('/me', { data: { password }, maxRetries: 3 });
      expect.soft(deleted.status()).toBe(204);
      break;
    }
    expect.soft([401, 404]).toContain(login.status());
  }
  await api.dispose();
}
