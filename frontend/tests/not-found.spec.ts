import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("Not Found Page", () => {
  test("displays 404 content for unauthenticated users", async ({ page }) => {
    await page.goto("/this-route-does-not-exist")

    await expect(page.getByTestId("not-found")).toBeVisible()
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible()
    await expect(page.getByText("Oops!")).toBeVisible()
    await expect(
      page.getByText("The page you are looking for was not found."),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Go Back" })).toBeVisible()
  })

  test("clicking 'Go Back' redirects to the home page", async ({ page }) => {
    await page.goto("/another-non-existent-path")

    await expect(page.getByTestId("not-found")).toBeVisible()

    await page.getByRole("link", { name: "Go Back" }).click()

    await page.waitForURL("/")
    await expect(page).toHaveURL("/")
  })
})