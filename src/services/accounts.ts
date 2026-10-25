import { newId } from '@/lib/format';
import type { TeamAccount } from '@/types';

const ACCOUNTS_KEY = 'kssh-formulary-accounts-v1';

async function digestPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function loadAccounts(): TeamAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TeamAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: TeamAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getAccountById(id: string): TeamAccount | undefined {
  return loadAccounts().find((a) => a.id === id);
}

export async function createAccount(input: {
  username: string;
  displayName: string;
  email: string;
  role: TeamAccount['role'];
  password: string;
}): Promise<TeamAccount> {
  const accounts = loadAccounts();
  const username = input.username.trim().toLowerCase();
  if (!username) throw new Error('Username is required.');
  if (accounts.some((a) => a.username === username)) throw new Error('That username is already in use.');
  if (input.password.length < 10) throw new Error('Password must be at least 10 characters.');

  const id = newId('user');
  const passwordDigest = await digestPassword(input.password, id);
  const account: TeamAccount = {
    id,
    username,
    displayName: input.displayName.trim() || username,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    active: true,
    createdAt: new Date().toISOString(),
    passwordDigest,
  };
  saveAccounts([...accounts, account]);
  return account;
}

export async function verifyCredentials(username: string, password: string): Promise<TeamAccount | null> {
  const accounts = loadAccounts();
  const normalized = username.trim().toLowerCase();
  const account = accounts.find((a) => a.username === normalized);
  if (!account || !account.active || !account.passwordDigest) return null;
  const digest = await digestPassword(password, account.id);
  if (digest !== account.passwordDigest) return null;
  return account;
}

export async function setAccountPassword(id: string, password: string): Promise<void> {
  if (password.length < 10) throw new Error('Password must be at least 10 characters.');
  const accounts = loadAccounts();
  const next = await Promise.all(
    accounts.map(async (a) => {
      if (a.id !== id) return a;
      return { ...a, passwordDigest: await digestPassword(password, a.id) };
    }),
  );
  saveAccounts(next);
}

export function updateAccount(id: string, patch: Partial<Pick<TeamAccount, 'displayName' | 'email' | 'role' | 'active'>>): TeamAccount {
  const accounts = loadAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index < 0) throw new Error('Account not found.');
  const updated = { ...accounts[index], ...patch };
  accounts[index] = updated;
  saveAccounts(accounts);
  return updated;
}

export function accountsInitialized(): boolean {
  return loadAccounts().length > 0;
}
