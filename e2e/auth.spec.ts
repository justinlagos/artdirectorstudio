import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    await page.click('text=Sign In');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('should display signup form', async ({ page }) => {
    await page.click('text=Sign Up');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign Up")')).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    
    await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
  });

  test('should switch between login and signup', async ({ page }) => {
    await page.click('text=Sign In');
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    
    await page.click('text=/don\'t have.*account/i');
    await expect(page.locator('button:has-text("Sign Up")')).toBeVisible();
    
    await page.click('text=/already have.*account/i');
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });
});
