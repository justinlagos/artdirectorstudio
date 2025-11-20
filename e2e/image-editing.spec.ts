import { test, expect } from '@playwright/test';

test.describe('Image Editing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should open edit image dialog', async ({ page }) => {
    // Assuming there's a way to access edit from history or gallery
    await page.click('text=/edit/i').first();
    await expect(page.locator('text=/adjust/i, text=/color/i, text=/edit/i')).toBeVisible();
  });

  test('should display adjustment controls', async ({ page }) => {
    await page.click('text=/edit/i').first();
    
    // Check for adjustment sliders
    await expect(page.locator('text=/brightness/i')).toBeVisible();
    await expect(page.locator('text=/contrast/i')).toBeVisible();
    await expect(page.locator('text=/saturation/i')).toBeVisible();
  });

  test('should apply brightness adjustment', async ({ page }) => {
    await page.click('text=/edit/i').first();
    
    // Find brightness slider and adjust it
    const brightnessSlider = page.locator('input[type="range"]').first();
    await brightnessSlider.fill('120');
    
    // Preview should update (check for canvas or image element)
    await expect(page.locator('canvas, img[alt*="preview"]')).toBeVisible();
  });

  test('should show apply and reset buttons', async ({ page }) => {
    await page.click('text=/edit/i').first();
    
    await expect(page.locator('button:has-text("Apply"), button:has-text("Save")')).toBeVisible();
    await expect(page.locator('button:has-text("Reset"), button:has-text("Cancel")')).toBeVisible();
  });

  test('should enable color picker tab', async ({ page }) => {
    await page.click('text=/edit/i').first();
    await page.click('text=/color/i');
    
    // Color picker should be visible
    await expect(page.locator('input[type="color"], [class*="color-picker"]')).toBeVisible();
  });
});
