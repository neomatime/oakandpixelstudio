import { test, expect } from '@playwright/test';

// Public pages that must load with ZERO console errors and no uncaught exceptions.
const CLEAN_PAGES = ['/index.html', '/brochure.html', '/privacy.html', '/terms.html'];

for (const route of CLEAN_PAGES) {
  test(`${route} loads with no console errors`, async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(route, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    expect(errors, `errors on ${route}:\n${errors.join('\n')}`).toEqual([]);
  });
}

test('homepage shows the web design agency positioning and plans', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  await expect(page.locator('.hero-headline')).toContainText('Websites built');
  await expect(page.locator('.pricing-card')).toHaveCount(3);
});
