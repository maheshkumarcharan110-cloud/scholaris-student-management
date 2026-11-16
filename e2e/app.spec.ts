import { expect, test, type Page } from "@playwright/test";

const ADMIN = { email: "admin@scholaris.edu", password: "Admin@12345" };
const TEACHER = { email: "priya.sharma@scholaris.edu", password: "Teacher@12345" };

async function signIn(page: Page, credentials: { email: string; password: string }, firstName: string) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
  await page.getByLabel("Email address").fill(credentials.email);
  await page.getByLabel(/^Password/).fill(credentials.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: new RegExp(firstName) })).toBeVisible();
}

test.describe("administrator journey", () => {
  test("signs in, tours every workspace page, and signs out", async ({ page }) => {
    await signIn(page, ADMIN, "Ananya");
    const main = page.getByRole("main");

    await expect(main.getByText("Active students", { exact: true })).toBeVisible();
    await expect(main.getByText("Attendance pulse")).toBeVisible();

    await page.getByRole("link", { name: "Students", exact: true }).click();
    await expect(main.getByRole("heading", { name: "Students", exact: true })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();

    const search = page.getByRole("searchbox", { name: /Search by name/i });
    await search.fill("Aarav");
    await expect(page.locator("tbody tr").first()).toContainText("Aarav");

    await page.locator("tbody tr").first().getByRole("link", { name: /View / }).click();
    await expect(page).toHaveURL(/\/students\/.+/);
    await expect(main.getByRole("heading", { name: /Aarav Sharma/ })).toBeVisible();
    await expect(main.getByText(/^ADM-/).first()).toBeVisible();

    await page.getByRole("link", { name: "Classes & subjects", exact: true }).click();
    await expect(main.getByRole("heading", { name: "Classes & subjects" })).toBeVisible();
    await expect(main.getByText("Grade 9 A").first()).toBeVisible();

    await page.getByRole("link", { name: "Attendance", exact: true }).click();
    await expect(main.getByRole("heading", { name: "Attendance", exact: true })).toBeVisible();
    await expect(page.getByLabel("Class")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save attendance" }).first()).toBeVisible();

    await page.getByRole("link", { name: "Examinations", exact: true }).click();
    await expect(main.getByRole("heading", { name: "Examinations" })).toBeVisible();
    await expect(main.getByText("Mid-Term Assessment").first()).toBeVisible();

    await page.getByRole("link", { name: "Reports", exact: true }).click();
    await expect(main.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
    await expect(main.getByRole("tab", { name: "Attendance" })).toBeVisible();

    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(main.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByLabel(/^Current password/)).toBeVisible();
    await expect(page.getByLabel(/^New password/)).toBeVisible();

    await main.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
  });
});

test.describe("teacher permissions", () => {
  test("hides administrator navigation and redirects the teachers route", async ({ page }) => {
    await signIn(page, TEACHER, "Priya");
    const main = page.getByRole("main");

    await expect(page.getByRole("link", { name: "Teachers", exact: true })).toHaveCount(0);

    await page.goto("/teachers");
    await expect(page).toHaveURL(/\/$/);
    await expect(main.getByText("Active students", { exact: true })).toBeVisible();
  });
});

test.describe("responsive layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("offers a mobile navigation drawer and a usable dashboard", async ({ page }) => {
    await signIn(page, ADMIN, "Ananya");

    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await page.getByRole("link", { name: "Students", exact: true }).click();
    await expect(page.getByRole("main").getByRole("heading", { name: "Students", exact: true })).toBeVisible();
  });
});
