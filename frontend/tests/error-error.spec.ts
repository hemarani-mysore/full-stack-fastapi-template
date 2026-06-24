import { expect, test } from "@playwright/test"

// Use an unauthenticated context for these tests as the ErrorComponent is a public component
test.use({ storageState: { cookies: [], origins: [] } })

test.describe("Error Page", () => {
  test("should display the error component on a simulated server error and allow navigation home", async ({ page }) => {
    // 1. Simulate a server error for a critical API call (e.g., fetching user data)
    // This will cause the application's root errorComponent to render.
    await page.route("**/api/v1/users/me", async route => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Simulated server error for testing" }),
      })
    })

    // 2. Navigate to a page that would typically fetch user data (e.g., the dashboard at '/')
    // This navigation should trigger the intercepted 500 error and thus render the ErrorComponent.
    await page.goto("/")

    // 3. Assert that the ErrorComponent is visible and contains its key UI elements
    await expect(page.getByTestId("error-component")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Error" })).toBeVisible()
    await expect(page.getByText("Oops!")).toBeVisible()
    await expect(page.getByText("Something went wrong. Please try again.")).toBeVisible()

    const goHomeButton = page.getByRole("button", { name: "Go Home" })
    await expect(goHomeButton).toBeVisible()

    // 4. Happy-path user interaction: Click the "Go Home" button
    await goHomeButton.click()

    // 5. Assert that the user is redirected to the home page.
    // For an unauthenticated user, the root route "/" typically redirects to "/login".
    await page.waitForURL("/login")
    await expect(page).toHaveURL("/login")
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible() // Verify we are on the login page
  })

  // No specific validation/error state tests are applicable as this component *is* the error state.
  // No specific access control tests are applicable as this component is designed to be publicly accessible when an error occurs.
})