import { Page } from '@playwright/test';

/**
 * Test Fixtures and Helpers for CRM E2E Tests
 */

export interface UserCredentials {
  username: string;
  password: string;
}

export const testUsers = {
  superuser: {
    username: 'm_kadirov',
    password: '123456789',
  },
  teacher: {
    username: 'm_kadirov',
    password: 'Ifromurgut2005$',
  },
  student: {
    username: 'mr1_kadirov',
    password: '123456789',
  },
};

/**
 * Login as a specific user type
 */
export async function loginAs(
  page: Page,
  userType: 'superuser' | 'teacher' | 'student',
  credentials?: UserCredentials
) {
  const creds = credentials || testUsers[userType];
  
  await page.goto(`/login/${userType}`);
  await page.locator('input[type="text"], input[name="username"]').first().fill(creds.username);
  await page.locator('input[type="password"]').first().fill(creds.password);
  await page.getByRole('button', { name: /login|sign in/i }).click();
  
  // Wait for navigation or error
  await page.waitForLoadState('networkidle');
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  return !url.includes('/login');
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  // Try to find logout button
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  
  if (await logoutButton.count() > 0) {
    await logoutButton.click();
    await page.waitForLoadState('networkidle');
  } else {
    // Navigate to login page directly
    await page.goto('/login/superuser');
    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}

/**
 * Get API base URL based on environment
 */
export function getApiBaseUrl(): string {
  return process.env.API_BASE_URL || 'http://localhost:3000';
}

/**
 * Get frontend base URL based on environment
 */
export function getFrontendBaseUrl(): string {
  return process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
}

/**
 * Test data generators
 */
export const testData = {
  generateStudent: () => ({
    center_id: 1,
    enrollment_number: `TEST-${Date.now()}`,
    first_name: 'Test',
    last_name: 'Student',
    username: `testuser_${Date.now()}`,
    password: 'testpassword123',
    email: `test_${Date.now()}@example.com`,
    phone: '1234567890',
    date_of_birth: '2000-01-01',
    parent_name: 'Test Parent',
    parent_phone: '0987654321',
    gender: 'Male',
    status: 'Active',
  }),

  generateTeacher: () => ({
    center_id: 1,
    first_name: 'Test',
    last_name: 'Teacher',
    username: `teacher_${Date.now()}`,
    password: 'testpassword123',
    email: `teacher_${Date.now()}@example.com`,
    phone: '1234567890',
    specialization: 'Mathematics',
    status: 'Active',
  }),

  generateClass: () => ({
    center_id: 1,
    class_name: `Test Class ${Date.now()}`,
    subject_id: 1,
    teacher_id: 1,
    schedule: JSON.stringify({ days: ['Monday', 'Wednesday'], time: '10:00' }),
    max_capacity: 30,
    current_enrollment: 0,
    status: 'Active',
  }),
};
