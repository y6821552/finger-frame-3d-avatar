import { expect, test } from '@playwright/test';

async function openControls(page: import('@playwright/test').Page): Promise<void> {
  const trigger = page.locator('[data-action="controls"]');
  if (await trigger.getAttribute('aria-expanded') === 'false') await trigger.dispatchEvent('click');
}

async function expectTriggerClearOfSubject(page: import('@playwright/test').Page): Promise<void> {
  const viewport = page.viewportSize();
  const trigger = await page.locator('[data-action="controls"]').boundingBox();
  expect(viewport).not.toBeNull();
  expect(trigger).not.toBeNull();
  if (!viewport || !trigger) return;
  const centralFaceZone = {
    left: viewport.width * 0.3,
    right: viewport.width * 0.7,
    top: viewport.height * 0.2,
    bottom: viewport.height * 0.8,
  };
  const intersects = trigger.x < centralFaceZone.right
    && trigger.x + trigger.width > centralFaceZone.left
    && trigger.y < centralFaceZone.bottom
    && trigger.y + trigger.height > centralFaceZone.top;
  expect(intersects).toBe(false);
}

test('deterministic fallback demo activates the frame and switches all eight roles', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?demo=1&noWebgl=1');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  await expect(page.locator('#controls')).toHaveAttribute('data-state', /ready|warning/);
  await expect(page.locator('[data-status]')).toContainText('备用渲染');
  await expect(page.locator('[data-gesture]')).toContainText('手势已触发');
  await expect(page.locator('#output')).toHaveAttribute('data-frame-active', 'true');
  await expect(page.locator('[data-action="controls"]')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-controls-popover]')).toBeHidden();
  await expectTriggerClearOfSubject(page);

  await openControls(page);
  await expect(page.locator('[data-controls-popover]')).toBeVisible();
  await page.locator('[data-language="en"]').click();
  await expect(page.locator('[data-controls-popover]')).toBeHidden();
  await expect(page.locator('.control-head strong')).toHaveText('Choose your character');
  await expect(page.locator('[data-gesture]')).toContainText('Gesture active');

  await openControls(page);
  await page.locator('[data-age="child"]').click();
  await expect(page.locator('[data-controls-popover]')).toBeHidden();
  await openControls(page);
  await page.locator('[data-gender="male"]').click();
  await expect(page.locator('#output')).toHaveAttribute('data-role', 'child-male');

  for (const age of ['child', 'teen', 'adult', 'senior']) {
    for (const gender of ['male', 'female']) {
      await openControls(page);
      await page.locator(`[data-age="${age}"]`).dispatchEvent('click');
      await openControls(page);
      await page.locator(`[data-gender="${gender}"]`).dispatchEvent('click');
      await expect(page.locator(`[data-age="${age}"]`)).toHaveClass(/active/);
      await expect(page.locator(`[data-gender="${gender}"]`)).toHaveClass(/active/);
    }
  }

  await openControls(page);
  await expect(page.locator('[data-controls-popover]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('demo-expanded.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-controls-popover]')).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('demo-collapsed.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test.describe('WebGL rendering', () => {
  test.skip(({ isMobile }) => isMobile, '3D screenshot is covered at desktop size');
  test.skip(
    process.env.PLAYWRIGHT_SERVERLESS === '1' && process.env.PLAYWRIGHT_WEBGL !== '1',
    'Serverless Chromium needs PLAYWRIGHT_WEBGL=1 for SwiftShader',
  );

  test('WebGL 3D scene renders inside the active finger frame', async ({ page }, testInfo) => {
    await page.goto('/?demo=1');
    await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
    await expect(page.locator('#controls')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('[data-status]')).not.toContainText('Toon fallback');
    await expect(page.locator('#output')).toHaveAttribute('data-frame-active', 'true', { timeout: 15_000 });
    await page.screenshot({ path: testInfo.outputPath('demo-3d.png'), fullPage: true });
  });
});
