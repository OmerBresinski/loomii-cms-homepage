import { test, expect } from "@playwright/test";

test.describe("Visual Editor", () => {
  // These tests require a project with analyzed elements
  // In a real scenario, you'd set up test data first

  test.beforeEach(async ({ page }) => {
    // Navigate to a project editor (mock project ID)
    await page.goto("/dashboard/projects/test-project-id/edit");
  });

  test.skip("displays element list", async ({ page }) => {
    // Check for element list in sidebar
    await expect(page.getByText(/editable elements/i)).toBeVisible();
  });

  test.skip("can select an element", async ({ page }) => {
    // Find and click an element in the list
    const elementCard = page.locator('[class*="rounded-lg border"]').first();
    await elementCard.click();

    // Editor panel should appear
    await expect(page.getByText(/save draft/i)).toBeVisible();
  });

  test.skip("can edit element content", async ({ page }) => {
    // Select first element
    const elementCard = page.locator('[class*="rounded-lg border"]').first();
    await elementCard.click();

    // Find the input and change value
    const input = page.getByRole("textbox").first();
    await input.fill("New content value");

    // Unsaved badge should appear
    await expect(page.getByText(/unsaved/i)).toBeVisible();
  });

  test.skip("can cancel edit", async ({ page }) => {
    // Select first element
    const elementCard = page.locator('[class*="rounded-lg border"]').first();
    await elementCard.click();

    // Click cancel
    await page.getByRole("button", { name: /cancel/i }).click();

    // Editor should close
    await expect(page.getByText(/save draft/i)).not.toBeVisible();
  });

  test.skip("shows submit button with pending changes", async ({ page }) => {
    // Select first element
    const elementCard = page.locator('[class*="rounded-lg border"]').first();
    await elementCard.click();

    // Edit content
    const input = page.getByRole("textbox").first();
    await input.fill("New content");

    // Save as draft
    await page.getByRole("button", { name: /save draft/i }).click();

    // Submit button should appear in header
    await expect(page.getByRole("button", { name: /submit changes/i })).toBeVisible();
  });
});

test.describe("Submit Modal", () => {
  test.skip("opens submit modal", async ({ page }) => {
    await page.goto("/dashboard/projects/test-project-id/edit");

    // Assume we have pending changes
    const submitButton = page.getByRole("button", { name: /submit changes/i });
    
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Modal should open
      await expect(page.getByText(/create a pull request/i)).toBeVisible();
    }
  });

  test.skip("can close submit modal", async ({ page }) => {
    await page.goto("/dashboard/projects/test-project-id/edit");

    const submitButton = page.getByRole("button", { name: /submit changes/i });
    
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.getByRole("button", { name: /cancel/i }).click();

      // Modal should close
      await expect(page.getByText(/create a pull request/i)).not.toBeVisible();
    }
  });
});

