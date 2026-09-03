import { test, expect } from '@playwright/test';

// Pages that must load with ZERO console errors and no uncaught exceptions.
const CLEAN_PAGES = ['/admin.html', '/index.html'];
// sign.html needs /api + a token (not present under the static server), so it
// gets the lighter check: no UNCAUGHT exception (a handled /api fetch failure
// may log a console error, which is tolerated here).
const NO_THROW_PAGES = ['/sign.html'];

for (const route of CLEAN_PAGES) {
  test(`${route} loads with no console errors`, async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(route, { waitUntil: 'load' });
    await page.waitForTimeout(1500); // let DOMContentLoaded init + getSession settle
    expect(errors, `errors on ${route}:\n${errors.join('\n')}`).toEqual([]);
  });
}

for (const route of NO_THROW_PAGES) {
  test(`${route} loads with no uncaught exceptions`, async ({ page }) => {
    const thrown = [];
    page.on('pageerror', e => thrown.push(String(e)));
    await page.goto(route, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    expect(thrown, `uncaught exceptions on ${route}:\n${thrown.join('\n')}`).toEqual([]);
  });
}

test('/admin.html renders the login screen', async ({ page }) => {
  await page.goto('/admin.html', { waitUntil: 'load' });
  await expect(page.locator('#login-btn')).toBeVisible();
  await expect(page.locator('#login-email')).toBeVisible();
});

test('email preview opens safe links and blocks unsafe schemes', async ({ page }) => {
  await page.goto('/admin.html', { waitUntil: 'load' });
  await page.evaluate(() => {
    window.__openedMailLinks = [];
    window.open = (...args) => {
      window.__openedMailLinks.push(args);
      return null;
    };
    document.body.innerHTML = mailBodyHTML({
      body_html: '<a id="safe-mail-link" href="https://example.com/invite?token=test">Accept invitation</a><a id="unsafe-js-link" href="javascript:void(0)">Unsafe JS</a><a id="unsafe-data-link" href="data:text/html,bad">Unsafe data</a>'
    });
  });

  const frame = page.locator('iframe.mail-html-body');
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute('data-mail-links-wired', 'true');
  const frameBody = page.frameLocator('iframe.mail-html-body');
  await frameBody.locator('#safe-mail-link').click();
  await frameBody.locator('#unsafe-js-link').click();
  await frameBody.locator('#unsafe-data-link').click();

  const opened = await page.evaluate(() => window.__openedMailLinks);
  expect(opened).toHaveLength(1);
  expect(opened[0]).toEqual([
    'https://example.com/invite?token=test',
    '_blank',
    'noopener,noreferrer'
  ]);
});
