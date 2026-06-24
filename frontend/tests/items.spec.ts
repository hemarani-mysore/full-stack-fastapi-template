import { expect, test } from "@playwright/test"
import { createUser } from "./utils/privateApi"
import {
  randomEmail,
  randomItemDescription,
  randomItemTitle,
  randomPassword,
} from "./utils/random"
import { logInUser } from "./utils/user"

test("Items page is accessible and shows correct title", async ({ page }) => {
  await page.goto("/items")
  await expect(page.getByRole("heading", { name: "Items" })).toBeVisible()
  await expect(page.getByText("Create and manage your items")).toBeVisible()
})

test("Add Item button is visible", async ({ page }) => {
  await page.goto("/items")
  await expect(page.getByRole("button", { name: "Add Item" })).toBeVisible()
})

test.describe("Unauthenticated access to items page", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Redirects unauthenticated user to login page", async ({ page }) => {
    await page.goto("/items")
    await expect(page).toHaveURL("/login")
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible()
    await expect(page.getByTestId("email-input")).toBeVisible()
    await expect(page.getByTestId("password-input")).toBeVisible()
  })
})

test.describe("Items management", () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  let email: string
  const password = randomPassword()

  test.beforeAll(async () => {
    email = randomEmail()
    await createUser({ email, password })
  })

  test.beforeEach(async ({ page }) => {
    await logInUser(page, email, password)
    await page.goto("/items") // Navigate to items page after login
  })

  test("Shows 'no items' message when no items exist for a new user", async ({ page }) => {
    // The user created in beforeAll and logged in via beforeEach should have no items initially
    await expect(page.getByRole("heading", { name: "You don't have any items yet" })).toBeVisible()
    await expect(page.getByText("Add a new item to get started")).toBeVisible()
    await expect(page.getByRole("button", { name: "Add Item" })).toBeVisible()
  })

  test("User can add a new item", async ({ page }) => {
    const title = randomItemTitle()
    const description = randomItemDescription()

    await page.getByRole("button", { name: "Add Item" }).click()
    await expect(page.getByRole("heading", { name: "Add New Item" })).toBeVisible()

    await page.getByTestId("title-input").fill(title)
    await page.getByTestId("description-input").fill(description)
    await page.getByRole("button", { name: "Create" }).click()

    await expect(page.getByText("Item created successfully!")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Items" })).toBeVisible() // Ensure we are back on items page
    await expect(page.getByRole("cell", { name: title })).toBeVisible()
    await expect(page.getByRole("cell", { name: description })).toBeVisible()
  })

  test("User can edit an existing item", async ({ page }) => {
    // First, add an item to edit
    const originalTitle = randomItemTitle()
    const originalDescription = randomItemDescription()

    await page.getByRole("button", { name: "Add Item" }).click()
    await page.getByTestId("title-input").fill(originalTitle)
    await page.getByTestId("description-input").fill(originalDescription)
    await page.getByRole("button", { name: "Create" }).click()
    await expect(page.getByText("Item created successfully!")).toBeVisible()
    await expect(page.getByRole("cell", { name: originalTitle })).toBeVisible()

    // Now, edit the item
    const newTitle = randomItemTitle()
    const newDescription = randomItemDescription()

    // Find the row for the original item and click its 'More options' button
    const itemRow = page.locator(`tr`, { hasText: originalTitle }) // Find the table row containing the item title
    await itemRow.getByRole("button", { name: "More options" }).click() // Click the ellipsis button
    await page.getByRole("menuitem", { name: "Edit" }).click() // Click "Edit" in the dropdown menu

    await expect(page.getByRole("heading", { name: "Edit Item" })).toBeVisible()
    await page.getByTestId("title-input").fill(newTitle)
    await page.getByTestId("description-input").fill(newDescription)
    await page.getByRole("button", { name: "Save" }).click()

    await expect(page.getByText("Item updated successfully!")).toBeVisible()
    await expect(page.getByRole("cell", { name: newTitle })).toBeVisible()
    await expect(page.getByRole("cell", { name: newDescription })).toBeVisible()
    await expect(page.getByRole("cell", { name: originalTitle })).not.toBeVisible() // Original title should be gone
  })

  test("User can delete an item", async ({ page }) => {
    // First, add an item to delete
    const titleToDelete = randomItemTitle()
    const descriptionToDelete = randomItemDescription()

    await page.getByRole("button", { name: "Add Item" }).click()
    await page.getByTestId("title-input").fill(titleToDelete)
    await page.getByTestId("description-input").fill(descriptionToDelete)
    await page.getByRole("button", { name: "Create" }).click()
    await expect(page.getByText("Item created successfully!")).toBeVisible()
    await expect(page.getByRole("cell", { name: titleToDelete })).toBeVisible()

    // Now, delete the item
    const itemRow = page.locator(`tr`, { hasText: titleToDelete })
    await itemRow.getByRole("button", { name: "More options" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()

    // Assuming a confirmation dialog appears
    await expect(page.getByRole("heading", { name: "Are you absolutely sure?" })).toBeVisible()
    await page.getByRole("button", { name: "Delete" }).click() // Confirm deletion

    await expect(page.getByText("Item deleted successfully!")).toBeVisible()
    await expect(page.getByRole("cell", { name: titleToDelete })).not.toBeVisible() // Item should be gone
    await expect(page.getByRole("heading", { name: "You don't have any items yet" })).toBeVisible() // If it was the last item
  })

  test("Cannot add item with empty title", async ({ page }) => {
    await page.getByRole("button", { name: "Add Item" }).click()
    await expect(page.getByRole("heading", { name: "Add New Item" })).toBeVisible()

    // Leave title empty
    const description = randomItemDescription()
    await page.getByTestId("description-input").fill(description)
    await page.getByRole("button", { name: "Create" }).click()

    // Expect validation error message for the title input
    await expect(page.getByText("Title is required")).toBeVisible() // Assuming this is the validation message
    await expect(page.getByText("Item created successfully!")).not.toBeVisible() // Ensure no success toast
    await expect(page.getByRole("heading", { name: "Add New Item" })).toBeVisible() // Still on the add item form
  })
})