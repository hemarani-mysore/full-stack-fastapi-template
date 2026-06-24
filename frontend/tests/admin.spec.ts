import { expect, test } from "@playwright/test"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser, logOutUser } from "./utils/user"
import { createUser } from "./utils/privateApi"
import { firstSuperuser, firstSuperuserPassword } from "./config"

// Unauthenticated and non-superuser access control tests
test.describe("Admin Page - Access Control", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("redirects unauthenticated user to login page", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL("/login")
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible()
  })

  test("redirects authenticated non-superuser to dashboard", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    // Create a regular user via private API
    await createUser({ email, password })
    // Log in as the regular user
    await logInUser(page, email, password)

    // Attempt to access the admin page
    await page.goto("/admin")
    // Expect redirection to the dashboard
    await expect(page).toHaveURL("/")
    // Verify dashboard content is visible
    await expect(page.getByRole("heading", { name: `Hi, ${email} 👋` })).toBeVisible()
    await expect(page.getByText("Welcome back, nice to see you again!")).toBeVisible()

    // Clean up: log out the user
    await logOutUser(page)
  })
})

// Superuser functionality tests
test.describe("Admin Page - Superuser Functionality", () => {
  // Use the authenticated superuser state from auth.setup.ts
  // This ensures the superuser is logged in before each test in this describe block
  test.use({ storageState: "playwright/.auth/user.json" })

  // Navigate to the admin page before each test
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL("/admin")
    await expect(page.getByRole("heading", { name: "Admin Panel" })).toBeVisible()
  })

  test("admin page loads and displays key UI elements", async ({ page }) => {
    // Verify main heading
    await expect(page.getByRole("heading", { name: "Admin Panel" })).toBeVisible()

    // Verify "Add New User" form elements
    await expect(page.getByRole("heading", { name: "Add New User" })).toBeVisible()
    await expect(page.getByTestId("add-user-full-name-input")).toBeVisible()
    await expect(page.getByTestId("add-user-email-input")).toBeVisible()
    await expect(page.getByTestId("add-user-password-input")).toBeVisible()
    await expect(page.getByTestId("add-user-confirm-password-input")).toBeVisible()
    await expect(page.getByRole("button", { name: "Add User" })).toBeVisible()

    // Verify User Table column headers
    await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Full Name" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Is Active" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Is Superuser" })).toBeVisible()

    // Verify "Pending Users" section heading
    await expect(page.getByRole("heading", { name: "Pending Users" })).toBeVisible()
  })

  test("superuser can add a new user successfully", async ({ page }) => {
    const fullName = "New Test User"
    const email = randomEmail()
    const password = randomPassword()

    // Fill the "Add New User" form
    await page.getByTestId("add-user-full-name-input").fill(fullName)
    await page.getByTestId("add-user-email-input").fill(email)
    await page.getByTestId("add-user-password-input").fill(password)
    await page.getByTestId("add-user-confirm-password-input").fill(password)

    // Click the "Add User" button
    await page.getByRole("button", { name: "Add User" }).click()

    // Expect the new user's email and full name to appear in the user table
    await expect(page.getByText(email)).toBeVisible()
    await expect(page.getByText(fullName)).toBeVisible()

    // Verify that the form inputs are cleared after successful submission
    await expect(page.getByTestId("add-user-full-name-input")).toHaveValue("")
    await expect(page.getByTestId("add-user-email-input")).toHaveValue("")
    await expect(page.getByTestId("add-user-password-input")).toHaveValue("")
    await expect(page.getByTestId("add-user-confirm-password-input")).toHaveValue("")
  })

  test("cannot add user with invalid email format", async ({ page }) => {
    const fullName = "Invalid Email User"
    const email = "invalid-email-format" // Intentionally invalid email
    const password = randomPassword()

    // Fill the form with invalid email
    await page.getByTestId("add-user-full-name-input").fill(fullName)
    await page.getByTestId("add-user-email-input").fill(email)
    await page.getByTestId("add-user-password-input").fill(password)
    await page.getByTestId("add-user-confirm-password-input").fill(password)
    await page.getByRole("button", { name: "Add User" }).click()

    // Expect an error message for invalid email
    await expect(page.getByText("Invalid email address")).toBeVisible()
    // Ensure the user is not added to the table
    await expect(page.getByText(email)).not.toBeVisible()
  })

  test("cannot add user with an email that already exists", async ({ page }) => {
    const existingEmail = randomEmail()
    const existingPassword = randomPassword()
    // Create a user via private API to ensure the email already exists
    await createUser({ email: existingEmail, password: existingPassword })

    const fullName = "Duplicate Email User"
    const password = randomPassword()

    // Fill the form with the existing email
    await page.getByTestId("add-user-full-name-input").fill(fullName)
    await page.getByTestId("add-user-email-input").fill(existingEmail)
    await page.getByTestId("add-user-password-input").fill(password)
    await page.getByTestId("add-user-confirm-password-input").fill(password)
    await page.getByRole("button", { name: "Add User" }).click()

    // Expect an error message indicating the email already exists
    await expect(page.getByText("The user with this email already exists in the system")).toBeVisible()
    // Ensure no new entry for this email (only the one created by API should be present)
    const emailRows = page.locator(`text=${existingEmail}`)
    await expect(emailRows).toHaveCount(1) // Should only be one instance from the initial API creation
  })

  test("cannot add user with mismatched passwords", async ({ page }) => {
    const fullName = "Mismatched Passwords User"
    const email = randomEmail()
    const password = randomPassword()
    const confirmPassword = randomPassword() + "mismatch" // Intentionally different

    // Fill the form with mismatched passwords
    await page.getByTestId("add-user-full-name-input").fill(fullName)
    await page.getByTestId("add-user-email-input").fill(email)
    await page.getByTestId("add-user-password-input").fill(password)
    await page.getByTestId("add-user-confirm-password-input").fill(confirmPassword)
    await page.getByRole("button", { name: "Add User" }).click()

    // Expect an error message for password mismatch
    await expect(page.getByText("Passwords do not match")).toBeVisible()
    // Ensure the user is not added to the table
    await expect(page.getByText(email)).not.toBeVisible()
  })

  test("cannot add user with a password that is too short", async ({ page }) => {
    const fullName = "Short Password User"
    const email = randomEmail()
    const shortPassword = "short" // Assuming minimum password length is > 5

    // Fill the form with a short password
    await page.getByTestId("add-user-full-name-input").fill(fullName)
    await page.getByTestId("add-user-email-input").fill(email)
    await page.getByTestId("add-user-password-input").fill(shortPassword)
    await page.getByTestId("add-user-confirm-password-input").fill(shortPassword)
    await page.getByRole("button", { name: "Add User" }).click()

    // Expect an error message for password length validation
    await expect(page.getByText("Password must be at least 8 characters")).toBeVisible()
    // Ensure the user is not added to the table
    await expect(page.getByText(email)).not.toBeVisible()
  })
})