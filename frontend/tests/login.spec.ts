import { expect, type Page, test } from "@playwright/test"
import { randomEmail, randomPassword } from "./utils/random"
import { firstSuperuser, firstSuperuserPassword } from "./config"
import { createUser as createApiUser } from "./utils/privateApi"

// Helper functions for this test file
const fillLoginForm = async (page: Page, email: string, password: string) => {
  await page.getByTestId("email-input").fill(email)
  await page.getByTestId("password-input").fill(password)
}

const verifyLoginInput = async (page: Page, testId: string) => {
  const input = page.getByTestId(testId)
  await expect(input).toBeVisible()
  await expect(input).toHaveValue("") // Use toHaveValue for input fields
  await expect(input).toBeEditable()
}

test.describe("Login Page", () => {
  // Ensure all tests in this block start unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("displays all essential elements", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible()
    await verifyLoginInput(page, "email-input")
    await verifyLoginInput(page, "password-input")
    await expect(page.getByRole("button", { name: "Log In" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible()
    await expect(page.getByText("Don't have an account?")).toBeVisible()
    await expect(page.getByRole("link", { name: "Sign Up" })).toBeVisible()
  })

  test("allows a superuser to log in successfully", async ({ page }) => {
    await fillLoginForm(page, firstSuperuser, firstSuperuserPassword)
    await page.getByRole("button", { name: "Log In" }).click()

    await page.waitForURL("/")
    // Check for dashboard content
    await expect(page.getByRole("heading", { name: `Hi, ${firstSuperuser} 👋` })).toBeVisible()
    await expect(page.getByText("Welcome back, nice to see you again!")).toBeVisible()
  })

  test("shows error for invalid email format", async ({ page }) => {
    await fillLoginForm(page, "invalid-email", randomPassword())
    await page.getByRole("button", { name: "Log In" }).click()

    await expect(page.getByText("Invalid email address")).toBeVisible()
    await expect(page.url()).toContain("/login") // Should remain on the login page
  })

  test("shows error for empty password", async ({ page }) => {
    await fillLoginForm(page, randomEmail(), "")
    await page.getByRole("button", { name: "Log In" }).click()

    await expect(page.getByText("Password is required")).toBeVisible()
    await expect(page.url()).toContain("/login")
  })

  test("shows error for password less than 8 characters", async ({ page }) => {
    await fillLoginForm(page, randomEmail(), "short") // Password "short" is 5 chars
    await page.getByRole("button", { name: "Log In" }).click()

    await expect(page.getByText("Password must be at least 8 characters")).toBeVisible()
    await expect(page.url()).toContain("/login")
  })

  test("shows error for incorrect credentials (non-existent user)", async ({ page }) => {
    const nonExistentEmail = randomEmail()
    const wrongPassword = randomPassword()

    await fillLoginForm(page, nonExistentEmail, wrongPassword)
    await page.getByRole("button", { name: "Log In" }).click()

    await expect(page.getByText("Incorrect email or password")).toBeVisible()
    await expect(page.url()).toContain("/login")
  })

  test("shows error for incorrect credentials (wrong password for existing user)", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    const fullName = "Test User"

    // Create user via API
    await createApiUser({ email, password, full_name: fullName })

    // Try to log in with correct email but wrong password
    await page.goto("/login") // Ensure we are on the login page
    await fillLoginForm(page, email, "wrong-password") // Use a password that is different from the created one
    await page.getByRole("button", { name: "Log In" }).click()

    await expect(page.getByText("Incorrect email or password")).toBeVisible()
    await expect(page.url()).toContain("/login")
  })

  test("allows a newly created user to log in successfully", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    const fullName = "New User"

    // Create user via API first
    await createApiUser({ email, password, full_name: fullName })

    // Now try to log in with these credentials
    await page.goto("/login") // Navigate back to login after API call
    await fillLoginForm(page, email, password)
    await page.getByRole("button", { name: "Log In" }).click()

    await page.waitForURL("/")
    await expect(page.getByRole("heading", { name: `Hi, ${fullName} 👋` })).toBeVisible()
    await expect(page.getByText("Welcome back, nice to see you again!")).toBeVisible()
  })

  test("redirects unauthenticated user from dashboard to login", async ({ page }) => {
    await page.goto("/") // Try to access dashboard directly
    await page.waitForURL("/login") // Should be redirected to login

    await expect(page.url()).toContain("/login")
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible()
    await expect(page.getByTestId("email-input")).toBeVisible()
  })

  test("navigates to sign up page when 'Sign Up' link is clicked", async ({ page }) => {
    await page.getByRole("link", { name: "Sign Up" }).click()
    await page.waitForURL("/signup")
    await expect(page.url()).toContain("/signup")
    await expect(page.getByRole("heading", { name: "Sign Up" })).toBeVisible() // Assuming signup page has a "Sign Up" heading
  })

  test("navigates to forgot password page when 'Forgot password?' link is clicked", async ({ page }) => {
    await page.getByRole("link", { name: "Forgot password?" }).click()
    await page.waitForURL("/forgot-password") // Assuming this is the route for forgot password
    await expect(page.url()).toContain("/forgot-password")
    await expect(page.getByRole("heading", { name: "Forgot Password" })).toBeVisible() // Assuming this heading
  })
})