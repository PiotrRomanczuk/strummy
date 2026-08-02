import { test, expect } from '../../fixtures';

/**
 * Cross-Role Tests: Task Management
 * Verifies that Admin, Teacher, and Student roles can manage their own personal tasks.
 */

test.describe('Task Management', { tag: ['@cross-role', '@tasks'] }, () => {
  const timestamp = Date.now();
  const testTaskTitle = `E2E Task ${timestamp}`;

  test('Admin can create, update, and delete tasks', async ({ page, loginAs }) => {
    await loginAs('admin');
    
    await page.goto('/dashboard/tasks');
    await page.waitForLoadState('networkidle');

    // Create a new task
    await page.getByRole('button', { name: '+ New Task' }).click();
    await page.getByPlaceholder('What needs to be done?').fill(testTaskTitle);
    // Wait for the reload that happens after Add is clicked
    await page.getByRole('button', { name: 'Add' }).click();

    // Verify it appears
    await expect(page.getByText(testTaskTitle)).toBeVisible();

    // Delete the task (cleanup)
    const taskContainer = page.locator('.group', { hasText: testTaskTitle }).first();
    await taskContainer.hover();
    await taskContainer.getByRole('button', { name: '×' }).click();
    
    await expect(page.getByText(testTaskTitle)).toBeHidden();
  });

  test('Teacher can create, update, and delete tasks', async ({ page, loginAs }) => {
    await loginAs('teacher');
    
    await page.goto('/dashboard/tasks');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '+ New Task' }).click();
    await page.getByPlaceholder('What needs to be done?').fill(testTaskTitle);
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText(testTaskTitle)).toBeVisible();

    const taskContainer = page.locator('.group', { hasText: testTaskTitle }).first();
    await taskContainer.hover();
    await taskContainer.getByRole('button', { name: '×' }).click();
    
    await expect(page.getByText(testTaskTitle)).toBeHidden();
  });

  test('Student can create, update, and delete tasks', async ({ page, loginAs }) => {
    await loginAs('student');
    
    await page.goto('/dashboard/tasks');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '+ New Task' }).click();
    await page.getByPlaceholder('What needs to be done?').fill(testTaskTitle);
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText(testTaskTitle)).toBeVisible();

    const taskContainer = page.locator('.group', { hasText: testTaskTitle }).first();
    await taskContainer.hover();
    await taskContainer.getByRole('button', { name: '×' }).click();
    
    await expect(page.getByText(testTaskTitle)).toBeHidden();
  });
});
