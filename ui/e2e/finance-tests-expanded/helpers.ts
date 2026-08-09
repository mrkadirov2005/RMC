import { expect, test, type Page } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

export async function openAs(page: Page, actor: 'admin' | 'teacher' | 'student', route: string) {
  await clearBrowserSession(page);
  await loginAs(page, actor);
  await page.goto(`/#${route}`);
}

export function unavailable(id: number, title: string, reason: string) {
  test(`WF-${String(id).padStart(3, '0')} ${title}`, async () => {
    test.fixme(true, reason);
  });
}

export { expect, test };
