import type { RoleId } from '@/types';

/**
 * Fixed evaluation credentials for the static GitHub Pages prototype.
 * These are intentionally public in frontend source — not real hospital security.
 */
export type LoginTab = 'admin-team' | 'staff';

export interface TestAccount {
  username: string;
  password: string;
  displayName: string;
  role: Extract<RoleId, 'administrator' | 'team_member' | 'staff'>;
  tab: LoginTab;
  /** Stable synthetic user id for session / notifications (not a real directory ID). */
  userId: string;
}

export const TEST_ACCOUNTS: readonly TestAccount[] = [
  {
    username: 'admin.demo',
    password: 'TestAdmin2026!',
    displayName: 'Demo Administrator',
    role: 'administrator',
    tab: 'admin-team',
    userId: 'test-user-admin',
  },
  {
    username: 'team.demo',
    password: 'TestTeam2026!',
    displayName: 'Demo Team Member',
    role: 'team_member',
    tab: 'admin-team',
    userId: 'test-user-team',
  },
  {
    username: 'staff.demo',
    password: 'TestStaff2026!',
    displayName: 'Demo General Staff',
    role: 'staff',
    tab: 'staff',
    userId: 'test-user-staff',
  },
] as const;

export function findTestAccount(username: string, password: string): TestAccount | null {
  const normalized = username.trim().toLowerCase();
  return (
    TEST_ACCOUNTS.find(
      (account) => account.username === normalized && account.password === password,
    ) ?? null
  );
}

export function testAccountsForTab(tab: LoginTab): TestAccount[] {
  return TEST_ACCOUNTS.filter((account) => account.tab === tab);
}

