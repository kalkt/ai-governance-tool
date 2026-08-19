import { test, expect } from '@playwright/test';

test('homepage loads and shows the assessment title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/AI Governance Readiness Assessment/);
  await expect(page.getByRole('heading', { name: 'How ready is your business for AI?' })).toBeVisible();
});
