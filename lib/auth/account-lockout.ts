import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import type { TablesUpdate } from '@/types/database.types';

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface LockoutStatus {
	locked: boolean;
	retryAfterMs?: number;
}

export async function checkAccountLockout(email: string): Promise<LockoutStatus> {
	const supabase = createAdminClient();

	const { data, error } = await supabase
		.from('profiles')
		.select('locked_until')
		.eq('email', email.toLowerCase())
		.single();

	if (error || !data) {
		return { locked: false };
	}

	if (data.locked_until) {
		const lockedUntil = new Date(data.locked_until).getTime();
		const now = Date.now();

		if (lockedUntil > now) {
			return { locked: true, retryAfterMs: lockedUntil - now };
		}

		// Lock expired, reset
		await resetFailedAttempts(email);
	}

	return { locked: false };
}

export async function incrementFailedAttempts(email: string): Promise<void> {
	const supabase = createAdminClient();

	const { data, error } = await supabase
		.from('profiles')
		.select('failed_login_attempts')
		.eq('email', email.toLowerCase())
		.single();

	if (error || !data) return;

	const newCount = (data.failed_login_attempts ?? 0) + 1;
	const updates: TablesUpdate<'profiles'> = { failed_login_attempts: newCount };

	if (newCount >= MAX_FAILED_ATTEMPTS) {
		updates.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
		logger.warn(`[Auth] Account locked for ${email} after ${newCount} failed attempts`);
	}

	await supabase
		.from('profiles')
		.update(updates)
		.eq('email', email.toLowerCase());
}

export async function resetFailedAttempts(email: string): Promise<void> {
	const supabase = createAdminClient();

	await supabase
		.from('profiles')
		.update({ failed_login_attempts: 0, locked_until: null })
		.eq('email', email.toLowerCase());
}
