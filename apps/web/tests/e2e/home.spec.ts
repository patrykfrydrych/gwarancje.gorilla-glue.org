import { expect, test } from '@playwright/test'

test('strona startowa ma tytul', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Gwarancje/)
})
