import {
  NotificationCategory,
  NotificationPreference,
  NotificationType,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPE_INFO,
} from '@/types/notifications';

/**
 * Group notification preferences by category
 */
export function groupPreferencesByCategory(
  preferences: NotificationPreference[]
): Record<NotificationCategory, NotificationPreference[]> {
  const grouped: Record<string, NotificationPreference[]> = {
    lessons: [],
    assignments: [],
    achievements: [],
    lifecycle: [],
    digests: [],
    system: [],
  };

  preferences.forEach((pref) => {
    const category = NOTIFICATION_TYPE_INFO[pref.notification_type]?.category;
    if (category && grouped[category]) {
      grouped[category].push(pref);
    }
  });

  return grouped as Record<NotificationCategory, NotificationPreference[]>;
}

/**
 * Check if all preferences in a category are enabled
 */
export function isCategoryEnabled(
  preferences: NotificationPreference[],
  category: NotificationCategory
): boolean {
  const categoryTypes = NOTIFICATION_CATEGORIES[category];
  const categoryPrefs = preferences.filter((p) =>
    categoryTypes.includes(p.notification_type as never)
  );

  if (categoryPrefs.length === 0) return false;
  return categoryPrefs.every((p) => p.enabled);
}

/**
 * Check if all preferences are enabled
 */
export function areAllPreferencesEnabled(preferences: NotificationPreference[]): boolean {
  return preferences.every((p) => p.enabled);
}

/**
 * Get notification type metadata
 */
export function getNotificationTypeInfo(type: NotificationType) {
  return NOTIFICATION_TYPE_INFO[type];
}

/**
 * Sort preferences by notification type order
 */
export function sortPreferences(preferences: NotificationPreference[]): NotificationPreference[] {
  const typeOrder = Object.keys(NOTIFICATION_TYPE_INFO) as NotificationType[];
  return [...preferences].sort((a, b) => {
    const indexA = typeOrder.indexOf(a.notification_type);
    const indexB = typeOrder.indexOf(b.notification_type);
    return indexA - indexB;
  });
}
