import { expect, test } from "@playwright/test"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser, logOutUser } from "./utils/user"
import { createUser as createPrivateUser } from "./utils/privateApi"
import { firstSuperuser, firstSuperuserPassword } from "./config"

// Playwright's request fixture uses the baseURL from playwright.config.ts by default.
// However, the prompt implies VITE_API_URL might be used for API calls,
// and the frontend's baseURL might be different.
// We'll explicitly use the API_BASE_URL for clarity and robustness.
const API_BASE_URL = process.env.VITE_API_URL || "http://localhost:8000"

test.describe("Utility Endpoints", () => {
  test.describe("GET /api/v1/utils/health-check/", () => {
    test("should return 200 OK for health check (unauthenticated)", async ({ request }) => {
      // Ensure this test runs without any prior authentication state
      test.use({ storageState: { cookies: [], origins: [] } })

      const response = await request.get(`${API_BASE_URL}/api/v1/utils/health-check/`)
      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body).toBe(true)
    })

    test("should return 200 OK for health check (authenticated superuser)", async ({ page, request }) => {
      await logInUser(page, firstSuperuser, firstSuperuserPassword)
      const response = await request.get(`${API_BASE_URL}/api/v1/utils/health-check/`)
      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body).toBe(true)
      await logOutUser(page)
    })

    test("should return 200 OK for health check (authenticated regular user)", async ({ page, request }) => {
      const email = randomEmail()
      const password = randomPassword()
      await createPrivateUser({ email, password }) // Create user via private API
      await logInUser(page, email, password)
      const response = await request.get(`${API_BASE_URL}/api/v1/utils/health-check/`)
      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body).toBe(true)
      await logOutUser(page)
    })
  })

  test.describe("POST /api/v1/utils/test-email/", () => {
    let regularUserEmail: string
    let regularUserPassword: string

    test.beforeAll(async () => {
      // Create a regular user once for tests that require a non-superuser authenticated state
      regularUserEmail = randomEmail()
      regularUserPassword = randomPassword()
      await createPrivateUser({ email: regularUserEmail, password: regularUserPassword })
    })

    test("should send a test email successfully as a superuser", async ({ page, request }) => {
      await logInUser(page, firstSuperuser, firstSuperuserPassword)
      const targetEmail = randomEmail()
      const response = await request.post(`${API_BASE_URL}/api/v1/utils/test-email/`, {
        params: {
          email_to: targetEmail,
        },
      })
      expect(response.status()).toBe(201)
      const body = await response.json()
      expect(body.message).toBe(`Test email sent to ${targetEmail}`)
      await logOutUser(page)
    })

    test("should return 401 Unauthorized when no token is provided", async ({ request }) => {
      // Ensure this test runs without any prior authentication state
      test.use({ storageState: { cookies: [], origins: [] } })

      const targetEmail = randomEmail()
      const response = await request.post(`${API_BASE_URL}/api/v1/utils/test-email/`, {
        params: {
          email_to: targetEmail,
        },
      })
      expect(response.status()).toBe(401)
      const body = await response.json()
      expect(body.detail).toBe("Not authenticated")
    })

    test("should return 403 Forbidden when a regular user tries to send a test email", async ({ page, request }) => {
      await logInUser(page, regularUserEmail, regularUserPassword)
      const targetEmail = randomEmail()
      const response = await request.post(`${API_BASE_URL}/api/v1/utils/test-email/`, {
        params: {
          email_to: targetEmail,
        },
      })
      expect(response.status()).toBe(403)
      const body = await response.json()
      expect(body.detail).toBe("The user doesn't have enough privileges")
      await logOutUser(page)
    })

    test("should return 422 Unprocessable Entity when 'email_to' is missing", async ({ page, request }) => {
      await logInUser(page, firstSuperuser, firstSuperuserPassword)
      const response = await request.post(`${API_BASE_URL}/api/v1/utils/test-email/`, {
        // No params provided, 'email_to' is missing
      })
      expect(response.status()).toBe(422)
      const body = await response.json()
      expect(body.detail[0].loc).toEqual(["query", "email_to"])
      expect(body.detail[0].msg).toBe("Field required")
      await logOutUser(page)
    })

    test("should return 422 Unprocessable Entity when 'email_to' is an invalid format", async ({ page, request }) => {
      await logInUser(page, firstSuperuser, firstSuperuserPassword)
      const invalidEmail = "not-an-email"
      const response = await request.post(`${API_BASE_URL}/api/v1/utils/test-email/`, {
        params: {
          email_to: invalidEmail,
        },
      })
      expect(response.status()).toBe(422)
      const body = await response.json()
      expect(body.detail[0].loc).toEqual(["query", "email_to"])
      expect(body.detail[0].msg).toBe("value is not a valid email address")
      await logOutUser(page)
    })
  })
})