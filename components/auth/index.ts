export { default as SignUpForm } from './SignUpForm';
export { default as ForgotPasswordForm } from './ForgotPasswordForm';
export { default as ResetPasswordForm } from './ResetPasswordForm';
// Deprecated AuthProvider removed in SSR auth refactor
// export { default as AuthProvider, useAuth } from './AuthProvider';
export { RequireAuth, RequireAdmin, RequireTeacher, RequireStudent } from './RequireRole';

// New Stitch-based auth components
export { AuthLayout, AuthHeader, AuthDivider } from './AuthLayout';
export { GoogleAuthButton } from './GoogleAuthButton';
export { PasswordInput } from './PasswordInput';
export { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
