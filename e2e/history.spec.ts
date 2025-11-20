import { test, expect } from '@playwright/test';

test.describe('History and Gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should navigate to history page', async ({ page }) => {
    await page.click('text=/history/i, text=/my projects/i, a[href*="/history"]');
    await expect(page).toHaveURL(/history/);
  });

  test('should display generated images', async ({ page }) => {
    await page.goto('/history');
    
    // Should show images or empty state
    const hasImages = await page.locator('img[src*="storage"], img[src*="generated"]').count() > 0;
    const hasEmptyState = await page.locator('text=/no images/i, text=/get started/i').count() > 0;
    
    expect(hasImages || hasEmptyState).toBeTruthy();
  });

  test('should filter images by type', async ({ page }) => {
    await page.goto('/history');
    
    // Check for filter buttons or tabs
    const filterExists = await page.locator('text=/all/i, text=/generated/i, text=/edited/i').count() > 0;
    
    if (filterExists) {
      await page.click('text=/generated/i').first();
      // Wait for filtering to complete
      await page.waitForTimeout(500);
    }
  });

  test('should show image actions on hover or click', async ({ page }) => {
    await page.goto('/history');
    
    const firstImage = page.locator('img[src*="storage"], img[src*="generated"]').first();
    
    if (await firstImage.count() > 0) {
      await firstImage.hover();
      
      // Actions should appear (edit, delete, download, etc.)
      await expect(page.locator('button[aria-label*="delete"], button[aria-label*="edit"]')).toBeVisible();
    }
  });

  test('should open image in full view', async ({ page }) => {
    await page.goto('/history');
    
    const firstImage = page.locator('img[src*="storage"], img[src*="generated"]').first();
    
    if (await firstImage.count() > 0) {
      await firstImage.click();
      
      // Full view dialog should open
      await expect(page.locator('[role="dialog"], .modal, [class*="zoom"]')).toBeVisible();
    }
  });
});
