import { expect, test } from "@playwright/test"
import { findLastEmail } from "./utils/mailcatcher"
import { randomEmail, randomPassword } from "./utils/random"
import { createUser, logInUser } from "./utils/user"
import { firstSuperuser, firstSuperuserPassword } from "./config"

test.describe("Recover Password Page - Unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await page.goto("/recover-password")
  })

  test("should display the 'Password Recovery' heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Password Recovery" }),
    ).toBeVisible()
  })

  test("should display email input and 'Continue' button", async ({ page }) => {
    await expect(page.getByTestId("email-input")).toBeVisible()
    await expect(page.getByTestId("email-input")).toHaveText("")
    await expect(page.getByTestId("email-input")).toBeEditable()
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible()
  })

  test("should display 'Back to Login' link", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Back to Login" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Back to Login" })).toHaveAttribute(
      "href",
      "/login",
    )
  })

  test("should show error for empty email submission", async ({ page }) => {
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByText("Email is required")).toBeVisible()
  })

  test("should show error for invalid email format", async ({ page }) => {
    await page.getByTestId("email-input").fill("invalid-email")
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByText("Invalid email")).toBeVisible()
  })

  test("should send recovery email for a registered user and show success toast", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()

    // Create a user via API first
    await createUser({ email, password })

    await page.getByTestId("email-input").fill(email)
    await page.getByRole("button", { name: "Continue" }).click()

    await expect(
      page.getByText("Password recovery email sent successfully"),
    ).toBeVisible()
    await expect(page.getByTestId("email-input")).toHaveValue("") // Form should be reset

    // Verify an email was sent
    const emailContent = await findLastEmail(email)
    expect(emailContent).toBeDefined()
    expect(emailContent?.subject).toContain("Password recovery for")
    expect(emailContent?.html).toContain("reset-password") // Check for the reset link
  })

  test("should show success toast even for an unregistered email (security measure)", async ({
    page,
  }) => {
    const unregisteredEmail = randomEmail() // Ensure this email does not exist

    await page.getByTestId("email-input").fill(unregisteredEmail)
    await page.getByRole("button", { name: "Continue" }).click()

    await expect(
      page.getByText("Password recovery email sent successfully"),
    ).toBeVisible()
    await expect(page.getByTestId("email-input")).toHaveValue("") // Form should be reset

    // Verify NO email was sent to this specific unregistered address
    const emailContent = await findLastEmail(unregisteredEmail)
    expect(emailContent).toBeNull() // Expect no email for this address
  })
})

test.describe("Recover Password Page - Authenticated", () => {
  // Use the authenticated state from auth.setup.ts
  test.use({ storageState: "playwright/.auth/user.json" })

  test("should redirect authenticated users to the dashboard", async ({ page }) => {
    await page.goto("/recover-password")
    await page.waitForURL("/") // Expect redirection to the dashboard
    await expect(page.url()).toBe(page.baseURL + "/")
  })
})