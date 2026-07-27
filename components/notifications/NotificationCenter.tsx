/**
 * NotificationCenter Component
 *
 * Full-page notification list with filters, pagination, and bulk actions.
 * Shows all notifications (not just recent 10 like the bell dropdown).
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, Filter } from 'lucide-react';
import { useNotifications } from './useNotifications';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { InAppNotification } from '@/lib/services/in-app-notification-service';

interface NotificationCenterProps {
  userId: string;
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread'>('all');

  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications(userId, {
      limit: 100,
      unreadOnly: filterStatus === 'unread',
    });

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const displayedNotifications =
    filterStatus === 'unread'
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'unread')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All notifications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notifications</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </Card>

      {/* Notification List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        </div>
      ) : displayedNotifications.length === 0 ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <Bell className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No notifications</h3>
            <p className="text-muted-foreground">
              {filterStatus === 'unread'
                ? "You're all caught up! No unread notifications."
                : "You don't have any notifications yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedNotifications.map((notification) => (
            <NotificationCenterItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual notification item in the center (larger than bell dropdown items)
 */
interface NotificationCenterItemProps {
  notification: InAppNotification;
  onMarkAsRead: (id: string) => void;
}

function NotificationCenterItem({
  notification,
  onMarkAsRead,
}: NotificationCenterItemProps) {
  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
  };

  const content = (
    <Card
      className={cn(
        'p-4 hover:bg-accent/50 transition-colors cursor-pointer',
        !notification.is_read && 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
      )}
      onClick={handleClick}
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">
            {notification.icon || '🔔'}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title & Unread Indicator */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{notification.title}</h3>
            {!notification.is_read && (
              <span className="flex-shrink-0 w-2.5 h-2.5 bg-blue-500 rounded-full" />
            )}
          </div>

          {/* Body */}
          <p className="text-muted-foreground mb-3">{notification.body}</p>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4">
            <time className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
              })}
            </time>

            {notification.action_label && notification.action_url && (
              <span className="text-sm font-medium text-primary">
                {notification.action_label} →
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  // Wrap in Link if action_url exists
  if (notification.action_url) {
    return (
      <Link href={notification.action_url} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
