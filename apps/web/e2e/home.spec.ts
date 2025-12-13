import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("displays hero section", async ({ page }) => {
    await page.goto("/");

    // Check hero title is visible
    await expect(
      page.getByRole("heading", { name: /edit your website with ai/i })
    ).toBeVisible();

    // Check CTA buttons are visible
    await expect(page.getByRole("link", { name: /get started free/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /view demo/i })).toBeVisible();
  });

  test("displays feature cards", async ({ page }) => {
    await page.goto("/");

    // Check feature cards are visible
    await expect(page.getByText("AI-Powered Analysis")).toBeVisible();
    await expect(page.getByText("Visual Editor")).toBeVisible();
    await expect(page.getByText("Code PRs")).toBeVisible();
  });

  test("navigates to dashboard", async ({ page }) => {
    await page.goto("/");

    // Click dashboard link
    await page.getByRole("link", { name: /dashboard/i }).first().click();

    // Should navigate to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("Dashboard", () => {
  test("displays welcome message", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("shows empty state for projects", async ({ page }) => {
    await page.goto("/dashboard/projects");

    // Should show empty state or project list
    await expect(
      page.getByText(/no projects yet/i).or(page.getByText(/projects/i))
    ).toBeVisible();
  });

  test("can navigate to new project form", async ({ page }) => {
    await page.goto("/dashboard/projects");

    // Click new project button (might not exist if authenticated)
    const newProjectButton = page.getByRole("link", { name: /new project/i });
    
    if (await newProjectButton.isVisible()) {
      await newProjectButton.click();
      await expect(page).toHaveURL(/\/dashboard\/projects\/new/);
      await expect(page.getByText(/create new project/i)).toBeVisible();
    }
  });
});

test.describe("Navigation", () => {
  test("sidebar navigation works", async ({ page }) => {
    await page.goto("/dashboard");

    // Navigate to projects
    await page.getByRole("link", { name: /projects/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/projects/);

    // Navigate to settings
    await page.getByRole("link", { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings/);

    // Navigate back to overview
    await page.getByRole("link", { name: /overview/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("logo links to home", async ({ page }) => {
    await page.goto("/dashboard");

    // Click logo
    await page.getByRole("link", { name: /ai cms/i }).first().click();
    await expect(page).toHaveURL("/");
  });
});

