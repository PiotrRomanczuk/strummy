/**
 * NotificationBell Component
 *
 * Bell icon with badge showing unread count and dropdown with notifications.
 * Integrates with real-time Supabase subscription for instant updates.
 */

'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';
import { useNotifications } from './useNotifications';
import { NotificationBellItem } from './NotificationBell.Item';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotificationBellProps {
  userId?: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const t = useTranslations('Notifications');
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications(
    userId,
    { limit: 10 }
  );

  if (!userId) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0 ? t('bellAriaLabelUnread', { count: unreadCount }) : t('bellAriaLabel')
          }
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">{t('bellHeaderTitle')}</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={markAllAsRead}>
              {t('bellMarkAllRead')}
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              {t('bellLoading')}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">{t('bellEmptyTitle')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('bellEmptySubtitle')}</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationBellItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t bg-muted/50">
            <Button variant="ghost" className="w-full h-9 text-sm" asChild>
              <Link href="/dashboard/notifications">{t('bellViewAll')}</Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
