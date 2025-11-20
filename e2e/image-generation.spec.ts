import { test, expect } from '@playwright/test';

test.describe('Image Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In a real scenario, you'd need to handle authentication
    await page.goto('/dashboard');
  });

  test('should open Artie chat', async ({ page }) => {
    await page.click('[aria-label*="Artie"], [aria-label*="Chat"], button:has-text("Artie")');
    await expect(page.locator('text=/hi.*artie/i, text=/chat/i')).toBeVisible();
  });

  test('should display image generation dialog', async ({ page }) => {
    await page.click('text=/generate/i');
    await expect(page.locator('textarea[placeholder*="prompt"], input[placeholder*="prompt"]')).toBeVisible();
    await expect(page.locator('button:has-text("Generate")')).toBeVisible();
  });

  test('should validate empty prompt', async ({ page }) => {
    await page.click('text=/generate/i');
    await page.click('button:has-text("Generate")');
    
    await expect(page.locator('text=/prompt.*required/i, text=/enter.*prompt/i')).toBeVisible();
  });

  test('should show loading state during generation', async ({ page }) => {
    await page.click('text=/generate/i');
    await page.fill('textarea[placeholder*="prompt"], input[placeholder*="prompt"]', 'A beautiful sunset over mountains');
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();
    
    // Button should be disabled during loading
    await expect(generateButton).toBeDisabled();
  });

  test('should display presets and templates', async ({ page }) => {
    await page.click('text=/generate/i');
    
    // Check for preset/template tabs or sections
    await expect(page.locator('text=/preset/i, text=/template/i, text=/style/i')).toBeVisible();
  });
});
