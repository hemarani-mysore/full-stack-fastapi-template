import { expect, test } from "@playwright/test"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser, logOutUser, signUpNewUser } from "./utils/user"
import { findLastEmail } from "./utils/privateApi"
import { firstSuperuser, firstSuperuserPassword } from "./config"

test.describe("Reset Password Page", () => {
  // Ensure tests start unauthenticated unless explicitly logging in
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Page loads and key UI elements are visible with a token", async ({ page }) => {
    // A dummy token is sufficient to bypass the client-side token presence check for UI visibility.
    // The actual token validity is checked on form submission.
    await page.goto("/reset-password?token=dummytoken123")

    await expect(page.getByRole("heading", { name: "Reset Password" })).toBeVisible()
    await expect(page.getByTestId("new-password-input")).toBeVisible()
    await expect(page.getByTestId("confirm-password-input")).toBeVisible()
    await expect(page.getByRole("button", { name: "Reset Password" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible()
  })

  test("Redirects to /login if no token is provided in the URL", async ({ page }) => {
    await page.goto("/reset-password")
    await expect(page).toHaveURL("/login")
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible()
  })

  test("Redirects to / if an authenticated user tries to access it", async ({ page }) => {
    // Log in a user first
    await logInUser(page, firstSuperuser, firstSuperuserPassword)

    // Try to access the reset password page with a token
    await page.goto("/reset-password?token=anytoken")
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible() // Assuming homepage has this heading
    await logOutUser(page) // Clean up
  })

  test("Shows client-side error when new passwords don't match", async ({ page, request }) => {
    const fullName = "Mismatch User"
    const email = randomEmail()
    const password = randomPassword()
    const newPassword = randomPassword()

    // Sign up a new user to generate a valid recovery token
    await signUpNewUser(page, fullName, email, password)

    // Initiate password recovery
    await page.goto("/recover-password")
    await page.getByTestId("email-input").fill(email)
    await page.getByRole("button", { name: "Continue" }).click()

    // Get the reset token from the email
    const emailData = await findLastEmail({
      request,
      filter: (e) => e.recipients.includes(`<${email}>`),
      timeout: 5000,
    })
    const resetUrlMatch = emailData?.body.match(/http:\/\/[^\s]+\/reset-password\?token=([a-zA-Z0-9-]+)/)
    expect(resetUrlMatch).toBeDefined()
    const resetToken = resetUrlMatch![1]

    await page.goto(`/reset-password?token=${resetToken}`)

    // Fill new password and a different confirm password
    await page.getByTestId("new-password-input").fill(newPassword)
    await page.getByTestId("confirm-password-input").fill("mismatchpassword")
    await page.getByRole("button", { name: "Reset Password" }).click()

    // Expect client-side validation error
    await expect(page.getByText("The passwords don't match")).toBeVisible()
    // Should remain on the reset password page
    await expect(page).toHaveURL(`/reset-password?token=${resetToken}`)
  })

  test("User successfully resets password and can log in with the new password", async ({ page, request }) => {
    const fullName = "Reset User"
    const email = randomEmail()
    const oldPassword = randomPassword()
    const newPassword = randomPassword()

    // Sign up a new user
    await signUpNewUser(page, fullName, email, oldPassword)

    // Initiate password recovery
    await page.goto("/recover-password")
    await page.getByTestId("email-input").fill(email)
    await page.getByRole("button", { name: "Continue" }).click()

    // Get the reset token from the email
    const emailData = await findLastEmail({
      request,
      filter: (e) => e.recipients.includes(`<${email}>`),
      timeout: 5000,
    })
    const resetUrlMatch = emailData?.body.match(/http:\/\/[^\s]+\/reset-password\?token=([a-zA-Z0-9-]+)/)
    expect(resetUrlMatch).toBeDefined()
    const resetToken = resetUrlMatch![1]

    await page.goto(`/reset-password?token=${resetToken}`)

    // Fill new password and confirm
    await page.getByTestId("new-password-input").fill(newPassword)
    await page.getByTestId("confirm-password-input").fill(newPassword)
    await page.getByRole("button", { name: "Reset Password" }).click()

    // Assert success toast and redirection to login page
    await expect(page.getByText("Password updated successfully")).toBeVisible()
    await expect(page).toHaveURL("/login")

    // Attempt to log in with the old password (should fail)
    await page.getByTestId("email-input").fill(email)
    await page.getByTestId("password-input").fill(oldPassword)
    await page.getByRole("button", { name: "Log In" }).click()
    await expect(page.getByText("Invalid credentials")).toBeVisible()

    // Log in with the new password (should succeed)
    await page.getByTestId("password-input").fill(newPassword) // Re-enter correct new password
    await page.getByRole("button", { name: "Log In" }).click()
    await page.waitForURL("/")
    await expect(page.getByText("Welcome back, nice to see you again!")).toBeVisible()

    // Clean up: log out
    await logOutUser(page)
  })
})