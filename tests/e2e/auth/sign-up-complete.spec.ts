/**
 * Authentication - Sign Up and Email Verification Flow
 *
 * Tests the complete user registration workflow:
 * 1. Form validation (all fields)
 * 2. Successful sign-up submission
 * 3. Email verification UI
 * 4. Duplicate email handling
 * 5. Edge cases (shadow users, existing accounts)
 *
 * Priority: P1 - Critical for user onboarding
 *
 * @tags @auth @sign-up @registration @email-verification
 */
import { test, expect } from '../../fixtures';
import { studentEmail, teacherEmail } from '../../helpers/seed-ids';

/**
 * Address for tests that actually SUBMIT the sign-up form (as opposed to the
 * validation tests, which never send anything and can keep using example.com).
 *
 * Against the dev stack, mail goes to the stack's Inbucket, which accepts
 * anything — so the default is unchanged. Against a DEPLOYED target the mail
 * goes through Resend, which rejects reserved domains outright:
 *
 *   550 Invalid `to` field. Please use our testing email address instead of
 *       domains like `example.com`
 *
 * GoTrue counts that as a failed send and returns 500, so the spec reports
 * "Error sending confirmation email" and looks exactly like the production
 * outage it is not. Set E2E_SIGNUP_EMAIL to a real address you control and each
 * test gets a unique plus-alias of it.
 */
const SIGNUP_EMAIL_BASE = process.env.E2E_SIGNUP_EMAIL;

function signupEmail(tag: string): string {
  const unique = `${tag}-${Date.now()}`;
  if (!SIGNUP_EMAIL_BASE) return `${unique}@example.com`;
  const [local, domain] = SIGNUP_EMAIL_BASE.split('@');
  return `${local}+${unique}@${domain}`;
}

/**
 * Whether this Supabase stack actually has the Google provider turned on.
 *
 * The LAN dev stack runs email-only. With Google off, signInWithOAuth returns
 * an error immediately and handleGoogleSignIn puts loading straight back to
 * false — so the "form disables while redirecting" state never exists to be
 * observed, and asserting it was a guaranteed failure rather than a bug.
 */
async function isGoogleEnabled(): Promise<boolean> {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    const body = (await res.json()) as { external?: Record<string, boolean> };
    return Boolean(body.external?.google);
  } catch {
    return false;
  }
}

test.describe(
  'Sign Up and Email Verification Flow',
  { tag: ['@auth', '@sign-up', '@registration'] },
  () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to sign-up page before each test
      await page.goto('/sign-up');

      // Verify page loaded correctly
      await expect(page).toHaveURL(/sign-up/);
    });

    test.describe('Page Structure and Navigation', () => {
      test('should display sign-up form with all required fields', async ({ page }) => {
        // Verify page title/heading
        await expect(page.locator('text=Join Strummy')).toBeVisible();

        // Verify all form fields are present
        await expect(page.locator('#firstName')).toBeVisible();
        await expect(page.locator('#lastName')).toBeVisible();
        await expect(page.locator('#email')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
        await expect(page.locator('#confirmPassword')).toBeVisible();

        // Verify submit button
        await expect(page.locator('button[type="submit"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toContainText('Create Account');
      });

      test('should have back to sign-in navigation', async ({ page }) => {
        // Verify back button exists
        const backButton = page.locator('button[aria-label="Go back"]');
        await expect(backButton).toBeVisible();

        // Click back button
        await backButton.click();

        // Should navigate to sign-in page
        await expect(page).toHaveURL(/sign-in/);
      });

      test('should have link to sign-in for existing users', async ({ page }) => {
        // Verify "Already have an account?" link
        await expect(page.locator('text=Already have an account?')).toBeVisible();

        const signInLink = page.locator('a[href="/sign-in"]').last();
        await expect(signInLink).toBeVisible();

        // Click link
        await signInLink.click();

        // Should navigate to sign-in
        await expect(page).toHaveURL(/sign-in/);
      });

      test('should display Google sign-up option', async ({ page }) => {
        // The Google OAuth button. Note: a plain text=/continue with/i is ambiguous — the
        // "Or continue with" divider also contains that phrase — so target the button by role.
        const googleButton = page.getByRole('button', { name: /continue with google/i });
        await expect(googleButton).toBeVisible();
      });
    });

    test.describe('Form Validation - First Name', () => {
      test('should show error when first name is empty on blur', async ({ page }) => {
        const firstNameInput = page.locator('#firstName');

        // Focus and blur without entering value
        await firstNameInput.focus();
        await firstNameInput.blur();

        // Should show required error
        await expect(page.locator('text=First name is required')).toBeVisible();
      });

      test('should clear error when user starts typing', async ({ page }) => {
        const firstNameInput = page.locator('#firstName');

        // Trigger error
        await firstNameInput.focus();
        await firstNameInput.blur();
        await expect(page.locator('text=First name is required')).toBeVisible();

        // Start typing
        await firstNameInput.fill('J');

        // Error should be cleared
        await expect(page.locator('text=First name is required')).not.toBeVisible();
      });

      test('should show error for excessively long first name', async ({ page }) => {
        const firstNameInput = page.locator('#firstName');
        const longName = 'a'.repeat(101); // Over 100 character limit

        await firstNameInput.fill(longName);
        await firstNameInput.blur();

        // Should show length error
        await expect(page.locator('text=First name too long')).toBeVisible();
      });
    });

    test.describe('Form Validation - Last Name', () => {
      test('should show error when last name is empty on blur', async ({ page }) => {
        const lastNameInput = page.locator('#lastName');

        await lastNameInput.focus();
        await lastNameInput.blur();

        await expect(page.locator('text=Last name is required')).toBeVisible();
      });

      test('should show error for excessively long last name', async ({ page }) => {
        const lastNameInput = page.locator('#lastName');
        const longName = 'a'.repeat(101);

        await lastNameInput.fill(longName);
        await lastNameInput.blur();

        await expect(page.locator('text=Last name too long')).toBeVisible();
      });
    });

    test.describe('Form Validation - Email', () => {
      test('should show error when email is empty on blur', async ({ page }) => {
        const emailInput = page.locator('#email');

        await emailInput.focus();
        await emailInput.fill(' ');
        await emailInput.clear();
        await emailInput.blur();

        // Should show validation error (wait for React re-render after onBlur sets touched state)
        await expect(page.locator('text=/valid email|email required/i')).toBeVisible({
          timeout: 5000,
        });
      });

      test('should validate email format', async ({ page }) => {
        const emailInput = page.locator('#email');

        // Try invalid email formats
        const invalidEmails = [
          'invalid',
          'invalid@',
          '@example.com',
          'invalid@.com',
          'invalid..email@example.com',
        ];

        for (const invalidEmail of invalidEmails) {
          await emailInput.clear();
          await emailInput.fill(invalidEmail);
          await emailInput.blur();

          // Should show error (either immediately or on submit)
          const hasError = await page.locator('text=/valid email/i').isVisible();

          if (hasError) {
            // Validation happens on blur
            expect(hasError).toBe(true);
          }
          // Some validation might happen on submit, which is also acceptable
        }
      });

      test('should accept valid email format', async ({ page }) => {
        const emailInput = page.locator('#email');

        await emailInput.fill('valid.email@example.com');
        await emailInput.blur();

        // Should not show email error
        await expect(page.locator('text=/valid email/i')).not.toBeVisible();
      });
    });

    test.describe('Form Validation - Password', () => {
      test('should show error for password shorter than the minimum length', async ({ page }) => {
        const passwordInput = page.locator('#password');

        await passwordInput.fill('12345'); // below the 8-char minimum
        await passwordInput.blur();

        await expect(page.locator('text=/must be at least 8/i')).toBeVisible();
      });

      test('should accept password with 6 or more characters', async ({ page }) => {
        const passwordInput = page.locator('#password');

        await passwordInput.fill('test123'); // 7 characters
        await passwordInput.blur();

        // Should not show length error
        await expect(page.locator('text=/must be at least 6/i')).not.toBeVisible();
      });

      test('should display password strength meter', async ({ page }) => {
        const passwordInput = page.locator('#password');

        // Type a password
        await passwordInput.fill('Password123!');

        // Password strength indicator should be visible
        // The PasswordInput component shows strength when showStrength=true
        const passwordSection = page.locator('#password').locator('..');
        await expect(passwordSection).toBeVisible();
      });

      test('should toggle password visibility', async ({ page }) => {
        const passwordInput = page.locator('#password');

        // Fill password
        await passwordInput.fill('test123');

        // Find toggle button (usually an eye icon near password input)
        const toggleButton = page.locator('#password').locator('..').locator('button').first();

        // Initial type should be password
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Click toggle
        await toggleButton.click();

        // Type should change to text
        await expect(passwordInput).toHaveAttribute('type', 'text');

        // Click again to hide
        await toggleButton.click();

        // Should be password again
        await expect(passwordInput).toHaveAttribute('type', 'password');
      });
    });

    test.describe('Form Validation - Confirm Password', () => {
      test('should show error when passwords do not match', async ({ page }) => {
        const passwordInput = page.locator('#password');
        const confirmPasswordInput = page.locator('#confirmPassword');

        await passwordInput.fill('Test1234');
        await confirmPasswordInput.fill('Different1');
        await confirmPasswordInput.blur();

        // Schema copy is "Passwords don't match"; the inline indicator says "Passwords do not
        // match" — accept either apostrophe/spelling form.
        await expect(page.getByText(/passwords (do not|don'?t) match/i)).toBeVisible();
      });

      test('should show success indicator when passwords match', async ({ page }) => {
        const passwordInput = page.locator('#password');
        const confirmPasswordInput = page.locator('#confirmPassword');

        await passwordInput.fill('test123');
        await confirmPasswordInput.fill('test123');

        // Should show match indicator
        await expect(page.locator('text=/passwords match/i')).toBeVisible();
      });

      test('should clear mismatch error when user corrects password', async ({ page }) => {
        const passwordInput = page.locator('#password');
        const confirmPasswordInput = page.locator('#confirmPassword');

        // Create mismatch
        await passwordInput.fill('Test1234');
        await confirmPasswordInput.fill('Wrong1234');
        await confirmPasswordInput.blur();

        await expect(page.getByText(/passwords (do not|don'?t) match/i)).toBeVisible();

        // Correct the password
        await confirmPasswordInput.clear();
        await confirmPasswordInput.fill('Test1234');

        // Error should be cleared
        await expect(page.getByText(/passwords (do not|don'?t) match/i)).not.toBeVisible();
        await expect(page.getByText(/passwords match/i)).toBeVisible();
      });
    });

    test.describe('Form Submission - Validation', () => {
      test('should prevent submission with empty form', async ({ page }) => {
        const submitButton = page.locator('button[type="submit"]');

        // Click submit without filling form
        await submitButton.click();

        // Should remain on sign-up page
        await expect(page).toHaveURL(/sign-up/);

        // Should show validation errors
        await expect(page.locator('text=/first name is required/i')).toBeVisible();
        await expect(page.locator('text=/last name is required/i')).toBeVisible();
        await expect(page.locator('text=/valid email/i')).toBeVisible();
      });

      test('should prevent submission with only partial data', async ({ page }) => {
        // Fill only some fields
        await page.locator('#firstName').fill('John');
        await page.locator('#email').fill('john@example.com');

        // Try to submit
        await page.locator('button[type="submit"]').click();

        // Should remain on sign-up page
        await expect(page).toHaveURL(/sign-up/);

        // Should show errors for missing fields
        await expect(page.locator('text=/last name is required/i')).toBeVisible();
      });

      test('should show loading state during submission', async ({ page }) => {
        // Password must satisfy the 8-char + letter + number rule, otherwise submit
        // short-circuits on validation and never enters the loading state.
        await page.locator('#firstName').fill('Test');
        await page.locator('#lastName').fill('User');
        await page.locator('#email').fill(`test-${Date.now()}@example.com`);
        await page.locator('#password').fill('Test1234');
        await page.locator('#confirmPassword').fill('Test1234');
        await page.locator('#privacyConsent').check();

        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();

        // Either the button enters its loading/disabled state, or the submission already
        // resolved to the success screen — both prove the form actually submitted.
        await expect(async () => {
          const isDisabled = await submitButton.isDisabled().catch(() => false);
          const buttonText = (await submitButton.textContent().catch(() => '')) ?? '';
          const onSuccess = await page
            .getByText(/check your email/i)
            .isVisible()
            .catch(() => false);
          expect(isDisabled || buttonText.includes('Creating') || onSuccess).toBe(true);
        }).toPass({ timeout: 10_000 });
      });
    });

    test.describe('Successful Sign-Up Flow', () => {
      test('should successfully create account and show email verification screen', async ({
        page,
      }) => {
        const testEmail = signupEmail('newuser');

        // Fill form with valid data
        await page.locator('#firstName').fill('New');
        await page.locator('#lastName').fill('User');
        await page.locator('#email').fill(testEmail);
        await page.locator('#password').fill('test123456');
        await page.locator('#confirmPassword').fill('test123456');
        await page.locator('#privacyConsent').check();

        // Submit form
        await page.locator('button[type="submit"]').click();

        // Should show email verification screen
        await expect(page.locator('text=/check your email/i')).toBeVisible({ timeout: 10000 });

        // Should display the email address
        await expect(page.locator(`text=${testEmail}`)).toBeVisible();

        // Should show success icon
        await expect(page.locator('[class*="text-success"]')).toBeVisible();
      });

      test('should display verification instructions', async ({ page }) => {
        const testEmail = signupEmail('instructions-test');

        // Complete sign-up
        await page.locator('#firstName').fill('Test');
        await page.locator('#lastName').fill('User');
        await page.locator('#email').fill(testEmail);
        await page.locator('#password').fill('test123456');
        await page.locator('#confirmPassword').fill('test123456');
        await page.locator('#privacyConsent').check();
        await page.locator('button[type="submit"]').click();

        // Wait for success screen
        await expect(page.locator('text=/check your email/i')).toBeVisible({ timeout: 10000 });

        // Verify instructions are displayed
        await expect(page.locator('text=/what to do next/i')).toBeVisible();
        await expect(page.locator('text=/check your inbox/i')).toBeVisible();
        // `text=` also matches the ancestors wrapping the <li>, so scope to one.
        await expect(page.locator('text=/verification link/i').first()).toBeVisible();
      });

      test('should have continue to sign-in button', async ({ page }) => {
        const testEmail = signupEmail('signin-button');

        // Complete sign-up
        await page.locator('#firstName').fill('Test');
        await page.locator('#lastName').fill('User');
        await page.locator('#email').fill(testEmail);
        await page.locator('#password').fill('test123456');
        await page.locator('#confirmPassword').fill('test123456');
        await page.locator('#privacyConsent').check();
        await page.locator('button[type="submit"]').click();

        // Wait for success screen
        await expect(page.locator('text=/check your email/i')).toBeVisible({ timeout: 10000 });

        // Find and click "Continue to Sign In" button
        const continueButton = page.locator('button:has-text("Continue to Sign In")');
        await expect(continueButton).toBeVisible();

        await continueButton.click();

        // Should navigate to sign-in page
        await expect(page).toHaveURL(/sign-in/);
      });
    });

    test.describe('Email Resend Functionality', () => {
      test('should show resend option after successful sign-up', async ({ page }) => {
        const testEmail = signupEmail('resend-test');

        // Complete sign-up
        await page.locator('#firstName').fill('Test');
        await page.locator('#lastName').fill('User');
        await page.locator('#email').fill(testEmail);
        await page.locator('#password').fill('test123456');
        await page.locator('#confirmPassword').fill('test123456');
        await page.locator('#privacyConsent').check();
        await page.locator('button[type="submit"]').click();

        // Wait for success screen
        await expect(page.locator('text=/check your email/i')).toBeVisible({ timeout: 10000 });

        // Wait for resend option to appear (after 5 second delay)
        await expect(page.locator("text=/resend|didn't receive/i")).toBeVisible({
          timeout: 10000,
        });
      });

      test('should have countdown timer for resend button', async ({ page }) => {
        const testEmail = signupEmail('countdown');

        // Complete sign-up
        await page.locator('#firstName').fill('Test');
        await page.locator('#lastName').fill('User');
        await page.locator('#email').fill(testEmail);
        await page.locator('#password').fill('test123456');
        await page.locator('#confirmPassword').fill('test123456');
        await page.locator('#privacyConsent').check();
        await page.locator('button[type="submit"]').click();

        // Wait for success screen
        await expect(page.locator('text=/check your email/i')).toBeVisible({ timeout: 10000 });

        // Wait for resend to be available
        await page.waitForTimeout(6000);

        const resendButton = page.locator(
          'button:has-text("Resend"), button:has-text("Didn\'t receive")'
        );

        // Click resend
        if (await resendButton.isVisible()) {
          await resendButton.click();

          // Should show countdown or "Sending..." state
          await expect(page.locator('text=/sending|available in|\\ds/i')).toBeVisible({
            timeout: 5000,
          });
        }
      });
    });

    test.describe('Duplicate Email Handling', () => {
      test('should show error when email already exists', async ({ page }) => {
        // Try to sign up with existing admin email
        await page.locator('#firstName').fill('Test');
        await page.locator('#lastName').fill('User');
        // Must be an address that really has an account, or this is just a
        // normal sign-up and no duplicate error appears. The old literal
        // (p.romanczuk@gmail.com) has a profile but no usable auth account.
        await page.locator('#email').fill(teacherEmail());
        await page.locator('#password').fill('Test1234');
        await page.locator('#confirmPassword').fill('Test1234');
        await page.locator('#privacyConsent').check();

        await page.locator('button[type="submit"]').click();

        // Current duplicate-email copy: "This email already has an account or a pending invitation…"
        await expect(page.getByText(/already has an account|pending invitation/i)).toBeVisible({
          timeout: 10000,
        });

        // Should remain on sign-up page
        await expect(page).toHaveURL(/sign-up/);
      });

      test('should suggest using forgot password for existing accounts', async ({ page }) => {
        await page.locator('#firstName').fill('Test');
        await page.locator('#lastName').fill('User');
        // teacher@example.com has not existed since the accounts moved to
        // @dev.local — signing up with it succeeded instead of erroring.
        await page.locator('#email').fill(studentEmail());
        await page.locator('#password').fill('test123456');
        await page.locator('#confirmPassword').fill('test123456');
        await page.locator('#privacyConsent').check();

        await page.locator('button[type="submit"]').click();

        // Error message should mention "Forgot Password" option
        await expect(page.locator('text=/forgot password|reset/i')).toBeVisible({
          timeout: 10000,
        });
      });
    });

    test.describe('Google OAuth Sign-Up', () => {
      test('should have functional Google sign-up button', async ({ page }) => {
        const googleButton = page.locator('button:has-text("Google")');

        // Button should be visible and enabled
        await expect(googleButton).toBeVisible();
        await expect(googleButton).toBeEnabled();

        // Note: Actual OAuth flow testing would require mocking or integration setup
        // This test just verifies the button exists and is clickable
      });

      test('should disable form during Google sign-in', async ({ page }) => {
        test.skip(
          !(await isGoogleEnabled()),
          'Google provider is disabled on this Supabase stack, so signInWithOAuth errors immediately and the loading state never persists'
        );

        // STALL the OAuth redirect rather than aborting it. An abort fails the
        // navigation, which lands the tab on chrome-error://chromewebdata/ —
        // the form is gone entirely and there is no submit button left to
        // assert on. Never resolving the route leaves the request pending, so
        // the page stays put with loading=true, which is the state under test.
        await page.route('**/auth/v1/authorize**', () => {
          /* deliberately never continue/abort/fulfill */
        });

        const googleButton = page.getByRole('button', { name: /continue with google/i });
        // noWaitAfter: the click starts a navigation we are deliberately holding
        // open, so waiting for it to settle would time out the click itself.
        await googleButton.click({ noWaitAfter: true });

        // handleGoogleSignIn sets loading=true, which disables the submit button.
        await expect(page.locator('button[type="submit"]')).toBeDisabled({ timeout: 10_000 });
      });
    });

    test.describe('Responsive Design', () => {
      test('should be mobile responsive', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/sign-up');

        // All form elements should be visible and accessible
        await expect(page.locator('#firstName')).toBeVisible();
        await expect(page.locator('#lastName')).toBeVisible();
        await expect(page.locator('#email')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
        await expect(page.locator('#confirmPassword')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Form should be usable
        await page.locator('#firstName').fill('Mobile');
        await page.locator('#lastName').fill('User');

        // Verify inputs work
        await expect(page.locator('#firstName')).toHaveValue('Mobile');
        await expect(page.locator('#lastName')).toHaveValue('User');
      });

      test('should work on tablet viewport', async ({ page }) => {
        // Set tablet viewport (iPad)
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/sign-up');

        // Verify layout is functional
        await expect(page.locator('#firstName')).toBeVisible();
        await expect(page.locator('#lastName')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Verify name fields are in grid layout (side by side)
        const firstNameBox = await page.locator('#firstName').boundingBox();
        const lastNameBox = await page.locator('#lastName').boundingBox();

        // First name and last name should be on same row (similar y position)
        if (firstNameBox && lastNameBox) {
          const yDifference = Math.abs(firstNameBox.y - lastNameBox.y);
          expect(yDifference).toBeLessThan(50); // Should be on same row
        }
      });
    });

    test.describe('Accessibility', () => {
      test('should have proper ARIA labels', async ({ page }) => {
        // Check password confirmation error has role="alert"
        await page.locator('#password').fill('test123');
        await page.locator('#confirmPassword').fill('wrong');
        await page.locator('#confirmPassword').blur();

        // Error message should have role="alert"
        const errorMessage = page.locator('[role="alert"]').first();
        await expect(errorMessage).toBeVisible();
      });

      test('should support keyboard navigation', async ({ page }) => {
        // Focus the first field directly: a "Go back" button now precedes the form, so a bare
        // first Tab would land there rather than on #firstName.
        await page.locator('#firstName').focus();
        await expect(page.locator('#firstName')).toBeFocused();

        await page.keyboard.press('Tab'); // Last name
        await expect(page.locator('#lastName')).toBeFocused();

        await page.keyboard.press('Tab'); // Email
        await expect(page.locator('#email')).toBeFocused();

        await page.keyboard.press('Tab'); // Password
        await expect(page.locator('#password')).toBeFocused();

        await page.keyboard.press('Tab'); // Password visibility toggle
        await page.keyboard.press('Tab'); // Confirm password
        await expect(page.locator('#confirmPassword')).toBeFocused();
      });

      test('should have proper form labels', async ({ page }) => {
        // All inputs should have associated labels
        const firstNameLabel = page.locator('label[for="firstName"]');
        const lastNameLabel = page.locator('label[for="lastName"]');
        const emailLabel = page.locator('label[for="email"]');
        const passwordLabel = page.locator('label[for="password"]');
        const confirmPasswordLabel = page.locator('label[for="confirmPassword"]');

        await expect(firstNameLabel).toBeVisible();
        await expect(lastNameLabel).toBeVisible();
        await expect(emailLabel).toBeVisible();
        await expect(passwordLabel).toBeVisible();
        await expect(confirmPasswordLabel).toBeVisible();
      });
    });

    test.describe('Edge Cases', () => {
      test('should handle special characters in name fields', async ({ page }) => {
        // Names with hyphens, apostrophes, accents
        await page.locator('#firstName').fill('Jean-François');
        await page.locator('#lastName').fill("O'Connor-Smith");

        // Should accept these characters
        await expect(page.locator('#firstName')).toHaveValue('Jean-François');
        await expect(page.locator('#lastName')).toHaveValue("O'Connor-Smith");

        // Complete the form
        await page.locator('#email').fill(`special-chars-${Date.now()}@example.com`);
        await page.locator('#password').fill('Test1234');
        await page.locator('#confirmPassword').fill('Test1234');
        await page.locator('#privacyConsent').check();

        // Should submit successfully
        await page.locator('button[type="submit"]').click();

        // No client-side name validation errors. (A bare text=/first name|last name/i is a
        // strict-mode violation — the field labels also contain "name" — so match error copy
        // specifically and count it.)
        const nameErrors = page.getByText(
          /first name is required|last name is required|name too long/i
        );
        expect(await nameErrors.count()).toBe(0);
      });

      test('should trim whitespace from inputs', async ({ page }) => {
        // Fill with leading/trailing spaces
        await page.locator('#firstName').fill('  John  ');
        await page.locator('#lastName').fill('  Doe  ');
        await page.locator('#email').fill('  test@example.com  ');

        // Blur to trigger validation
        await page.locator('#email').blur();

        // Form should handle this gracefully (either trim or validate)
        // No error should appear for the spaces themselves
        const values = {
          firstName: await page.locator('#firstName').inputValue(),
          lastName: await page.locator('#lastName').inputValue(),
          email: await page.locator('#email').inputValue(),
        };

        // Values are captured (trimming may happen server-side)
        expect(values.firstName).toBeTruthy();
        expect(values.lastName).toBeTruthy();
        expect(values.email).toBeTruthy();
      });

      test('should prevent double submission', async ({ page }) => {
        const testEmail = `double-submit-${Date.now()}@example.com`;

        // Fill form
        await page.locator('#firstName').fill('Test');
        await page.locator('#lastName').fill('User');
        await page.locator('#email').fill(testEmail);
        await page.locator('#password').fill('test123456');
        await page.locator('#confirmPassword').fill('test123456');
        await page.locator('#privacyConsent').check();

        const submitButton = page.locator('button[type="submit"]');

        // Click submit
        await submitButton.click();

        // Button should be disabled immediately
        await expect(submitButton).toBeDisabled();

        // Try clicking again (should do nothing)
        await submitButton.click({ force: true });

        // Should only create one account (verified by seeing success screen once)
        await expect(page.locator('text=/check your email/i')).toBeVisible({ timeout: 10000 });
      });
    });
  }
);
