# Error Handling & Logging Standards

**Status**: Established via discovery Q&A (Q5, Q17, Q21)  
**Last Updated**: October 26, 2025  
**Enforced By**: Code review, ESLint (no console.log), Sentry monitoring

---

## Purpose

Establish consistent error handling and logging patterns to ensure:

- Production visibility (debug real issues)
- Graceful degradation (don't crash, inform user)
- Type-safe error objects (machine-readable)
- Security compliance (no PII in logs)

---

## Core Principles

1. **Error Boundaries at Page Level**: Use Next.js `error.tsx` files
2. **Structured Error Objects**: All errors follow consistent type
3. **User-Friendly Messages**: Show helpful text, not stack traces
4. **Sentry for Production**: Centralized error tracking and monitoring
5. **No console.log in Production**: Only structured logging

---

## Error Architecture

### Error Types

Define all error types in one place:

```typescript
// types/errors.ts
export type ErrorType =
	| 'AUTHORIZATION'
	| 'AUTHENTICATION'
	| 'VALIDATION'
	| 'NOT_FOUND'
	| 'CONFLICT'
	| 'RATE_LIMIT'
	| 'SERVER_ERROR'
	| 'NETWORK_ERROR'
	| 'UNKNOWN';

export interface AppError {
	type: ErrorType;
	message: string; // User-friendly
	statusCode: number;
	details?: Record<string, unknown>; // Technical context
	timestamp: string;
}
```

### Error Factory Functions

```typescript
// lib/errors.ts
import { AppError, ErrorType } from '@/types/errors';

export function createAppError(
	type: ErrorType,
	message: string,
	statusCode: number = 500,
	details?: Record<string, unknown>
): AppError {
	return {
		type,
		message,
		statusCode,
		details,
		timestamp: new Date().toISOString(),
	};
}

// Common errors
export const Errors = {
	unauthorized: (details?: Record<string, unknown>) =>
		createAppError(
			'AUTHORIZATION',
			'You do not have permission to access this resource.',
			403,
			details
		),

	notFound: (resource: string, details?: Record<string, unknown>) =>
		createAppError(
			'NOT_FOUND',
			`${resource} not found. Please check and try again.`,
			404,
			details
		),

	validation: (message: string, details?: Record<string, unknown>) =>
		createAppError('VALIDATION', message, 400, details),

	serverError: (details?: Record<string, unknown>) =>
		createAppError(
			'SERVER_ERROR',
			'Something went wrong. Our team has been notified.',
			500,
			details
		),

	networkError: (details?: Record<string, unknown>) =>
		createAppError(
			'NETWORK_ERROR',
			'Connection failed. Please check your internet and try again.',
			0,
			details
		),
};

// Usage
throw Errors.notFound('Lesson');
throw Errors.validation('Email is required');
```

---

## Error Boundaries (Next.js)

### Page-Level Error Boundary

```typescript
// app/lessons/[id]/error.tsx
'use client';

import { useEffect } from 'react';
import { AppError } from '@/types/errors';
import * as Sentry from '@sentry/nextjs';

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log to Sentry
		Sentry.captureException(error, {
			tags: { component: 'lessons/[id]' },
		});
	}, [error]);

	const appError = error as AppError;

	return (
		<div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4'>
			<div className='max-w-md w-full text-center'>
				{appError.type === 'NOT_FOUND' && (
					<>
						<h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
							Lesson Not Found
						</h1>
						<p className='mt-2 text-gray-600 dark:text-gray-400'>
							{appError.message}
						</p>
						<a
							href='/lessons'
							className='mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
						>
							Back to Lessons
						</a>
					</>
				)}

				{appError.type === 'AUTHORIZATION' && (
					<>
						<h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
							Access Denied
						</h1>
						<p className='mt-2 text-gray-600 dark:text-gray-400'>
							{appError.message}
						</p>
						<a
							href='/'
							className='mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
						>
							Go Home
						</a>
					</>
				)}

				{appError.type === 'SERVER_ERROR' && (
					<>
						<h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
							Something Went Wrong
						</h1>
						<p className='mt-2 text-gray-600 dark:text-gray-400'>
							{appError.message}
						</p>
						<button
							onClick={() => reset()}
							className='mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
						>
							Try Again
						</button>
					</>
				)}

				<p className='mt-4 text-xs text-gray-500'>Error ID: {error.digest}</p>
			</div>
		</div>
	);
}
```

### Root Error Boundary

```typescript
// app/error.tsx (Catches all unhandled errors)
'use client';

import * as Sentry from '@sentry/nextjs';

export default function RootError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	Sentry.captureException(error, { level: 'fatal' });

	return (
		<html>
			<body>
				<div className='min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/20'>
					<div className='text-center'>
						<h1 className='text-3xl font-bold text-red-600 dark:text-red-400'>
							Application Error
						</h1>
						<p className='mt-2 text-gray-600 dark:text-gray-400'>
							We're sorry, but something went wrong. Our team has been notified.
						</p>
						<button
							onClick={() => reset()}
							className='mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700'
						>
							Try Again
						</button>
					</div>
				</div>
			</body>
		</html>
	);
}
```

---

## Server Component Error Handling

```typescript
// app/lessons/[studentId]/page.tsx
import { supabase } from '@/lib/supabase';
import { LessonSchema } from '@/schemas/LessonSchema';
import { Errors } from '@/lib/errors';
import * as Sentry from '@sentry/nextjs';
import { StudentLessonClient } from './StudentLesson.client';

export default async function StudentLessonPage({
	params,
}: {
	params: { studentId: string };
}) {
	try {
		// Validate input
		if (!params.studentId) {
			throw Errors.validation('Student ID is required');
		}

		// Fetch data
		const { data, error } = await supabase
			.from('lessons')
			.select('*')
			.eq('student_id', params.studentId);

		if (error) {
			// Supabase error
			Sentry.captureException(error, {
				tags: {
					source: 'supabase',
					table: 'lessons',
					action: 'select',
				},
				extra: {
					studentId: params.studentId,
					error: error.message,
				},
			});

			throw Errors.serverError({
				originalError: error.message,
				code: error.code,
			});
		}

		// Validate response
		const lessons = data.map((item) => LessonSchema.parse(item));

		return <StudentLessonClient initialLessons={lessons} />;
	} catch (err) {
		// Re-throw to error.tsx
		if (err instanceof AppError) {
			throw err;
		}

		// Unexpected error
		Sentry.captureException(err, {
			tags: { page: 'lessons/[studentId]' },
		});

		throw Errors.serverError();
	}
}
```

---

## Client Component Error Handling

### Try-Catch in Async Operations

```tsx
'use client';

import { useState } from 'react';
import { Errors } from '@/lib/errors';
import { AppError } from '@/types/errors';

export function CreateLessonForm() {
	const [error, setError] = useState<AppError | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(formData: FormData) {
		setError(null);
		setIsSubmitting(true);

		try {
			const response = await fetch('/api/lessons', {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw {
					type: errorData.type,
					message: errorData.message,
					statusCode: response.status,
				} as AppError;
			}

			// Success
			window.location.href = '/lessons';
		} catch (err) {
			if (err instanceof AppError) {
				setError(err);
			} else {
				setError(Errors.networkError());
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				handleSubmit(new FormData(e.currentTarget));
			}}
		>
			{error && (
				<ErrorAlert
					message={error.message}
					type={error.type}
					onDismiss={() => setError(null)}
				/>
			)}
			{/* form fields */}
		</form>
	);
}
```

### Error Display Component

```tsx
interface ErrorAlertProps {
	message: string;
	type: ErrorType;
	onDismiss: () => void;
}

export function ErrorAlert({ message, type, onDismiss }: ErrorAlertProps) {
	const bgColor =
		{
			VALIDATION: 'bg-yellow-50 dark:bg-yellow-900/20',
			AUTHORIZATION: 'bg-red-50 dark:bg-red-900/20',
			NOT_FOUND: 'bg-blue-50 dark:bg-blue-900/20',
			SERVER_ERROR: 'bg-red-50 dark:bg-red-900/20',
			NETWORK_ERROR: 'bg-orange-50 dark:bg-orange-900/20',
		}[type] || 'bg-gray-50 dark:bg-gray-900/20';

	const textColor =
		{
			VALIDATION: 'text-yellow-700 dark:text-yellow-300',
			AUTHORIZATION: 'text-red-700 dark:text-red-300',
			NOT_FOUND: 'text-blue-700 dark:text-blue-300',
			SERVER_ERROR: 'text-red-700 dark:text-red-300',
			NETWORK_ERROR: 'text-orange-700 dark:text-orange-300',
		}[type] || 'text-gray-700 dark:text-gray-300';

	return (
		<div
			className={`p-4 rounded-lg ${bgColor} ${textColor} flex items-start justify-between`}
		>
			<p className='text-sm'>{message}</p>
			<button
				onClick={onDismiss}
				className='ml-2 text-lg font-bold leading-none cursor-pointer'
			>
				×
			</button>
		</div>
	);
}
```

---

## Logging with Sentry

### Setup

```typescript
// instrumentation-client.ts (Next 16 / Turbopack reads this name, NOT
// sentry.client.config.ts — the old name is silently ignored at build time)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	environment: process.env.NODE_ENV,
	tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
	integrations: [
		new Sentry.Replay({
			maskAllText: true,
			blockAllMedia: true,
		}),
	],
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
});
```

### Logging Levels

```typescript
import * as Sentry from '@sentry/nextjs';

// Critical: App-breaking errors
Sentry.captureException(new Error('Auth failed'), {
	level: 'fatal',
	tags: { feature: 'authentication' },
});

// High: Feature broken but app runs
Sentry.captureException(error, {
	level: 'error',
	tags: { feature: 'lesson-management' },
});

// Medium: Unexpected but handled
Sentry.captureException(error, {
	level: 'warning',
	tags: { feature: 'song-search' },
});

// Low: Informational
Sentry.captureMessage('User logged in', 'info', {
	tags: { feature: 'authentication' },
});
```

### With Context

```typescript
// Add context before error
Sentry.setUser({
	id: user.id,
	email: user.email,
});

Sentry.setContext('lesson', {
	lessonId: lessonId,
	studentId: studentId,
	songCount: songs.length,
});

// Then if error happens, context included
Sentry.captureException(error);
```

---

## Performance Monitoring

### Track Key Operations

```typescript
// Track lesson save time
const transaction = Sentry.startTransaction({
	name: 'Save Lesson Progress',
	op: 'lesson.save',
});

const span = transaction.startChild({
	op: 'db.update',
	description: 'Update lesson_songs table',
});

try {
	await saveLessonProgress(data);
	span.setStatus('ok');
} catch (err) {
	span.setStatus('error');
	Sentry.captureException(err);
} finally {
	span.finish();
	transaction.finish();
}
```

---

## No console.log Policy

### ❌ Production Code

```tsx
// DON'T
console.log('Fetching lessons...', studentId);
console.error('Error:', error);
console.debug('User:', user);
```

### ✅ Use Sentry Instead

```tsx
// DO
Sentry.captureMessage('Fetching lessons', 'info', {
	extra: { studentId },
});

Sentry.captureException(error, {
	tags: { action: 'fetch-lessons' },
});
```

### ✅ Development Only

```tsx
if (process.env.NODE_ENV === 'development') {
	console.log('Debug info:', data);
}
```

**ESLint Enforcement**: `no-console` rule blocks all console usage in production files.

---

## Common Error Patterns

### Handling Supabase Errors

```typescript
const { data, error } = await supabase
	.from('lessons')
	.select('*')
	.eq('id', lessonId);

if (error) {
	// Map Supabase errors to app errors
	if (error.code === 'PGRST116') {
		throw Errors.notFound('Lesson');
	}
	if (error.code === 'PGRST204') {
		throw Errors.notFound('Lesson');
	}
	if (error.code === 'PGRST401') {
		throw Errors.unauthorized();
	}

	// Default
	throw Errors.serverError({
		supabaseCode: error.code,
		supabaseMessage: error.message,
	});
}
```

### Handling Zod Validation Errors

```typescript
import { z } from 'zod';

try {
	const validated = LessonSchema.parse(data);
} catch (err) {
	if (err instanceof z.ZodError) {
		const fieldErrors = err.flatten().fieldErrors;
		throw Errors.validation('Invalid lesson data', {
			fields: fieldErrors,
		});
	}
	throw err;
}
```

### Handling Network Errors

```typescript
async function fetchWithErrorHandling(url: string) {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		return await response.json();
	} catch (err) {
		if (err instanceof TypeError) {
			// Network error
			throw Errors.networkError({
				originalError: err.message,
			});
		}
		throw err;
	}
}
```

---

## Testing Error Handling

```typescript
import { Errors } from '@/lib/errors';

describe('Error Handling', () => {
	it('should create validation error with field info', () => {
		const error = Errors.validation('Invalid input', {
			field: 'email',
			reason: 'Invalid format',
		});

		expect(error.type).toBe('VALIDATION');
		expect(error.statusCode).toBe(400);
		expect(error.details).toEqual({
			field: 'email',
			reason: 'Invalid format',
		});
	});

	it('should create not found error with resource name', () => {
		const error = Errors.notFound('Lesson');

		expect(error.type).toBe('NOT_FOUND');
		expect(error.message).toContain('Lesson');
		expect(error.statusCode).toBe(404);
	});
});
```

---

## Checklist Before Committing

- [ ] All errors use `createAppError()` or `Errors.*`
- [ ] No hardcoded error messages
- [ ] Page-level `error.tsx` files handle failures gracefully
- [ ] Sentry context set before operations
- [ ] No `console.log` in production code
- [ ] Error types match `ErrorType` enum
- [ ] User-friendly messages (not technical jargon)
- [ ] Details field sanitized (no PII)
- [ ] Tests cover error paths
- [ ] Mobile error display tested

---

## Resources

- Error types: `types/errors.ts`
- Error factory: `lib/errors.ts`
- Sentry docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Next.js error boundaries: https://nextjs.org/docs/app/api-reference/file-conventions/error
