import { newId } from '@/lib/format';
import type { AppNotification, ContentKind } from '@/types';

const NOTIFICATIONS_KEY = 'kssh-formulary-notifications-v1';

/**
 * Persistent notification store.
 * When Supabase is configured, replace this with the `notifications` table
 * so messages sync across devices for the same user account.
 */
export function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotifications(items: AppNotification[]): void {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items));
}

export function notificationsForUser(userId: string): AppNotification[] {
  return loadNotifications()
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadCount(userId: string): number {
  return notificationsForUser(userId).filter((n) => !n.read).length;
}

export function pushNotification(input: {
  userId: string;
  title: string;
  message: string;
  relatedType: ContentKind | 'review' | 'user';
  relatedId: string;
  href: string;
}): AppNotification {
  const item: AppNotification = {
    id: newId('notif'),
    userId: input.userId,
    title: input.title,
    message: input.message,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    href: input.href,
    createdAt: new Date().toISOString(),
    read: false,
  };
  saveNotifications([item, ...loadNotifications()].slice(0, 500));
  return item;
}

export function markNotificationRead(id: string): void {
  saveNotifications(loadNotifications().map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markAllRead(userId: string): void {
  saveNotifications(loadNotifications().map((n) => (n.userId === userId ? { ...n, read: true } : n)));
}

/** Notify all active administrators (local account registry). */
export function notifyAdministrators(
  accounts: { id: string; role: string; active: boolean }[],
  payload: Omit<Parameters<typeof pushNotification>[0], 'userId'>,
): void {
  accounts
    .filter((a) => a.role === 'administrator' && a.active)
    .forEach((a) => pushNotification({ ...payload, userId: a.id }));
}
