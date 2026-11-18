import { expect, test, type Page } from "@playwright/test";

if (!process.env.ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD is missing. Add it to server/.env before running Playwright.");
}

const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? "admin@scholaris.edu",
  password: process.env.ADMIN_PASSWORD,
};
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Mahesh Kumar";
const ADMIN_FIRST_NAME = ADMIN_NAME.split(" ")[0];
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

async function expectNoHorizontalOverflow(page: Page) {
  const result = await page.evaluate(() => ({
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    result.scrollWidth,
    `page should not overflow horizontally (${result.scrollWidth} > ${result.clientWidth})`,
  ).toBeLessThanOrEqual(result.clientWidth + 1);
}

test.describe("administrator journey", () => {
  test("shows Mahesh Kumar as Super Administrator and tours every workspace page", async ({ page }) => {
    await signIn(page, ADMIN, ADMIN_FIRST_NAME);
    const main = page.getByRole("main");

    await expect(main.getByText("Super Administrator", { exact: true }).first()).toBeVisible();
    await expect(main.getByText(ADMIN_NAME, { exact: true }).first()).toBeVisible();
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

    await page.getByRole("link", { name: "My profile", exact: true }).click();
    await expect(main.getByRole("heading", { name: "Administrator profile" })).toBeVisible();
    await expect(main.getByText(ADMIN_NAME, { exact: true }).first()).toBeVisible();
    await expect(main.getByText("Super Administrator", { exact: true }).first()).toBeVisible();
    await expect(main.getByRole("heading", { name: "Edit profile" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Security settings" })).toBeVisible();

    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(main.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(main.getByText("Security", { exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "Open security settings" }).click();
    await expect(page).toHaveURL(/\/security/);
    await expect(main.getByRole("heading", { name: "Security settings" })).toBeVisible();
    await expect(page.getByLabel(/^Current password/).first()).toBeVisible();
    await expect(page.getByLabel(/^New password/)).toBeVisible();
    await expect(page.getByLabel("New email address")).toBeVisible();

    await page.getByRole("button", { name: "Sign out", exact: true }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
  });
});

test.describe("teacher permissions", () => {
  test("hides administrator navigation and redirects the teachers route", async ({ page }) => {
    await signIn(page, TEACHER, "Priya");
    const main = page.getByRole("main");

    await expect(page.getByRole("link", { name: "Teachers", exact: true })).toHaveCount(0);
    await expect(main.getByText("Teacher", { exact: true }).first()).toBeVisible();

    await page.goto("/teachers");
    await expect(page).toHaveURL(/\/$/);
    await expect(main.getByText("Active students", { exact: true })).toBeVisible();

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/$/);
  });
});

const stamp = Date.now();
const APPLICANT = {
  name: "E2E Applicant",
  email: `e2e.applicant.${stamp}@scholaris.test`,
  password: "Applicant@2026",
};

test.describe("public registration and administrator approval", () => {
  test("registration stays pending, is approved by Mahesh Kumar, then can sign in", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Request your account" })).toBeVisible();

    await page.getByLabel("Full name").fill(APPLICANT.name);
    await page.getByLabel("Email address").fill(APPLICANT.email);
    await page.getByLabel("Phone (optional)").fill("+91 90000 12345");
    await page.getByLabel("Account type").selectOption("TEACHER");
    await page.getByLabel(/^Password/).fill(APPLICANT.password);
    await page.getByLabel("Confirm password").fill(APPLICANT.password);
    await page.getByRole("button", { name: "Request account" }).click();

    await expect(
      page.getByText(
        "Your account has been created successfully. Your registration is awaiting approval from the administrator. You will be able to access Scholaris once your account has been approved.",
      ),
    ).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Email address").fill(APPLICANT.email);
    await page.getByLabel(/^Password/).fill(APPLICANT.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(/awaiting administrator approval/i);

    await signIn(page, ADMIN, ADMIN_FIRST_NAME);
    await page.goto("/admin/users?status=PENDING");
    const search = page.getByPlaceholder("Search by name, email, or phone…");
    await search.fill(APPLICANT.email);
    const row = page.locator("tbody tr").filter({ hasText: APPLICANT.email });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Approve" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Approve registration" })).toBeVisible();
    await dialog.getByRole("button", { name: "Approve account" }).click();
    await expect(page.getByText("Registration approved").first()).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/login/);

    await signIn(page, { email: APPLICANT.email, password: APPLICANT.password }, "E2E");
    await expect(page.getByRole("main").getByText("E2E Applicant", { exact: true }).first()).toBeVisible();
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/$/);
  });

  test("requires the current password for password and email changes", async ({ page }) => {
    await signIn(page, ADMIN, ADMIN_FIRST_NAME);
    await page.goto("/security");
    await expect(page.getByRole("heading", { name: "Security settings" })).toBeVisible();

    await page.locator("#currentPassword").fill("DefinitelyWrong@2026");
    await page.locator("#newPassword").fill("SomeOtherPass@2026");
    await page.locator("#confirmPassword").fill("SomeOtherPass@2026");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Your current password is incorrect.").first()).toBeVisible();

    await page.getByLabel("New email address").fill(`blocked.change.${stamp}@scholaris.test`);
    await page.locator("#email-change-password").fill("DefinitelyWrong@2026");
    await page.getByRole("button", { name: "Send confirmation" }).click();
    await expect(page.getByText("Your current password is incorrect.").last()).toBeVisible();
  });
});

test.describe("dark and light mode", () => {
  test("toggles, persists after refresh, and works on the login page", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => localStorage.setItem("scholaris-theme", "light"));
    await page.reload();

    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(html).toHaveClass(/dark/);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("scholaris-theme")))
      .toBe("dark");
    await page.reload();
    await expect(html).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();

    await signIn(page, ADMIN, ADMIN_FIRST_NAME);
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("scholaris-theme")))
      .toBe("light");
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("renders every page in both themes without horizontal overflow", async ({ page }) => {
    await signIn(page, ADMIN, ADMIN_FIRST_NAME);
    const routes = [
      "/",
      "/students",
      "/attendance",
      "/classes",
      "/exams",
      "/reports",
      "/profile",
      "/settings",
      "/security",
      "/admin",
      "/admin/users",
      "/admin/roles",
      "/admin/activity",
    ];

    for (const theme of ["light", "dark"] as const) {
      await page.evaluate((value) => localStorage.setItem("scholaris-theme", value), theme);
      await page.reload();
      if (theme === "dark") {
        await expect(page.locator("html")).toHaveClass(/dark/);
      } else {
        await expect(page.locator("html")).not.toHaveClass(/dark/);
      }
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await expectNoHorizontalOverflow(page);
      }
    }
  });
});

test.describe("responsive layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("offers a mobile navigation drawer, usable tables, and forms that fit", async ({ page }) => {
    await signIn(page, ADMIN, ADMIN_FIRST_NAME);
    await expectNoHorizontalOverflow(page);

    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await page.getByRole("link", { name: "Students", exact: true }).click();
    await expect(page.getByRole("main").getByRole("heading", { name: "Students", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: /Add student/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box?.width ?? 0).toBeLessThanOrEqual(390);
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.goto("/attendance");
    await expectNoHorizontalOverflow(page);
    await page.goto("/profile");
    await expect(page.getByRole("main").getByRole("heading", { name: "Administrator profile" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("keeps tablet layouts usable", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await signIn(page, ADMIN, ADMIN_FIRST_NAME);
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    for (const route of ["/students", "/classes", "/exams", "/reports"]) {
      await page.goto(route);
      await expectNoHorizontalOverflow(page);
    }
  });
});
