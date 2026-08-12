import { expect, test } from '@playwright/test';

test('deterministic fallback demo activates the frame and switches all eight roles', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?demo=1&noWebgl=1');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  await expect(page.locator('#controls')).toHaveAttribute('data-state', /ready|warning/);
  await expect(page.locator('[data-status]')).toContainText('备用渲染');
  await expect(page.locator('[data-gesture]')).toContainText('手势已触发');
  await expect(page.locator('#output')).toHaveAttribute('data-frame-active', 'true');

  await page.locator('[data-language="en"]').click();
  await expect(page.locator('.control-head strong')).toHaveText('Choose your character');
  await expect(page.locator('[data-gesture]')).toContainText('Gesture active');

  await page.locator('[data-age="child"]').click();
  await page.locator('[data-gender="male"]').click();
  await expect(page.locator('#output')).toHaveAttribute('data-role', 'child-male');

  for (const age of ['child', 'teen', 'adult', 'senior']) {
    for (const gender of ['male', 'female']) {
      await page.locator(`[data-age="${age}"]`).evaluate((element: HTMLElement) => element.click());
      await page.locator(`[data-gender="${gender}"]`).evaluate((element: HTMLElement) => element.click());
      await expect(page.locator(`[data-age="${age}"]`)).toHaveClass(/active/);
      await expect(page.locator(`[data-gender="${gender}"]`)).toHaveClass(/active/);
    }
  }

  if (testInfo.project.name === 'desktop-chromium') {
    await page.screenshot({ path: testInfo.outputPath('demo-fallback.png'), fullPage: true });
  }
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
