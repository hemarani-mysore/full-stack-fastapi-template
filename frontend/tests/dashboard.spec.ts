import { expect, test } from "@playwright/test"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser, createUser } from "./utils/user"
import { firstSuperuser, firstSuperuserPassword } from "./config"

test.describe("Dashboard Page", () => {
  test.describe("Unauthenticated access", () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test("should redirect to login page if not authenticated", async ({ page }) => {
      await page.goto("/")
      await expect(page).toHaveURL("/login")
      await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible()
    })
  })

  test.describe("Authenticated access", () => {
    test("should load and display superuser's full name and welcome message", async ({ page }) => {
      // Log in with the first superuser
      // Assuming firstSuperuser has a full_name set, e.g., "Superuser"
      await logInUser(page, firstSuperuser, firstSuperuserPassword)

      // Verify URL
      await expect(page).toHaveURL("/")

      // Verify page title
      await expect(page).toHaveTitle("Dashboard - FastAPI Template")

      // Verify greeting with superuser's full name
      // This test assumes the 'firstSuperuser' has a full_name configured as "Superuser".
      // If the actual full_name for the firstSuperuser is different, this assertion will fail
      // and should be updated to match the configured name or a more dynamic approach.
      await expect(page.getByRole("heading", { name: "Hi, Superuser 👋" })).toBeVisible()

      // Verify welcome message
      await expect(page.getByText("Welcome back, nice to see you again!!!")).toBeVisible()
    })

    test("should load and display new user's email and welcome message if full_name is not set", async ({ page }) => {
      const email = randomEmail()
      const password = randomPassword()

      // Create a new user without explicitly setting a full_name
      await createUser({ email, password })

      // Log in with the newly created user
      await logInUser(page, email, password)

      // Verify URL
      await expect(page).toHaveURL("/")

      // Verify page title
      await expect(page).toHaveTitle("Dashboard - FastAPI Template")

      // Verify greeting with user's email (since full_name is not set, it falls back to email)
      await expect(page.getByRole("heading", { name: `Hi, ${email} 👋` })).toBeVisible()

      // Verify welcome message
      await expect(page.getByText("Welcome back, nice to see you again!!!")).toBeVisible()
    })
  })
})