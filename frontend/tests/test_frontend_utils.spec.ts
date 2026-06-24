import { expect, test } from "@playwright/test"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser } from "./utils/user"
import { createUser } from "./utils/privateApi"

// All tests in this file should start unauthenticated
test.use({ storageState: { cookies: [], origins: [] } })

test.describe("Frontend Error Handling", () => {
  test("displays error toast for invalid login credentials", async ({ page }) => {
    await page.goto("/login")

    // Fill form with non-existent credentials
    await page.getByTestId("email-input").fill(randomEmail())
    await page.getByTestId("password-input").fill(randomPassword())
    await page.getByRole("button", { name: "Log In" }).click()

    // Expect an error toast to appear
    // The toast component (Sonner) typically uses role="status" for its container
    await expect(page.getByRole("status")).toBeVisible()
    // Verify the toast title from useCustomToast
    await expect(page.getByText("Something went wrong!")).toBeVisible()
    // Verify the specific error message extracted by extractErrorMessage
    await expect(page.getByText("Invalid credentials")).toBeVisible()
  })

  test("displays ErrorComponent for critical API failures when authenticated", async ({ page }) => {
    // 1. Create and log in a user successfully
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })
    await logInUser(page, email, password) // This navigates to '/' and asserts success.

    // 2. Set up an interceptor to make a critical API call fail
    // This interceptor will be active for subsequent requests.
    await page.route("**/api/v1/users/me", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Internal Server Error" }),
      })
    })

    // 3. Force a reload of the page to trigger the intercepted API call
    await page.reload()

    // 4. Expect the ErrorComponent to be visible
    await expect(page.getByTestId("error-component")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Error" })).toBeVisible()
    await expect(
      page.getByText("Something went wrong. Please try again."),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible()

    // 5. Verify "Go Home" link functionality
    await page.getByRole("link", { name: "Go Home" }).click()
    await page.waitForURL("/") // Should navigate back to '/', but without the interceptor now.

    // The dashboard should load normally after clicking "Go Home"
    // and the interceptor is no longer active for new navigations/reloads.
    await expect(page.getByTestId("error-component")).not.toBeVisible()
    // Assuming the dashboard shows a welcome message upon successful load
    await expect(
      page.getByText("Welcome back, nice to see you again!"),
    ).toBeVisible()
  })

  test("Go Home button on ErrorComponent redirects to login if unauthenticated after an error", async ({
    page,
  }) => {
    // 1. Ensure we start unauthenticated by navigating to a public page
    await page.goto("/login")
    await page.waitForURL("/login")

    // 2. Set up an interceptor to make a critical API call fail
    // This interceptor will be active when we attempt to access a protected route.
    await page.route("**/api/v1/users/me", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Internal Server Error" }),
      })
    })

    // 3. Attempt to navigate to a protected route (e.g., dashboard '/') while unauthenticated.
    // This should trigger the root error component if the loader fails due to the intercepted request
    // before the router's authentication guard potentially redirects.
    await page.goto("/")

    // 4. Expect the ErrorComponent to be visible
    await expect(page.getByTestId("error-component")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Error" })).toBeVisible()
    await expect(
      page.getByText("Something went wrong. Please try again."),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible()

    // 5. Click "Go Home"
    await page.getByRole("link", { name: "Go Home" }).click()

    // 6. Expect to be redirected to the login page since the user is unauthenticated
    // and the root route (/) would typically redirect unauthenticated users to /login.
    await page.waitForURL("/login")
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible()
    await expect(page.getByTestId("error-component")).not.toBeVisible()
  })
})