import { FormEvent, useMemo, useState } from 'react';
import { permissionLabels, rolePermissions, roleSummaries } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { createAccount, loadAccounts, updateAccount } from '@/services/accounts';
import type { Permission, RoleId, TeamAccount } from '@/types';

export function UsersPage() {
  const { session, allowed } = useAuth();
  const { state } = useContent();
  const [accounts, setAccounts] = useState<TeamAccount[]>(() => loadAccounts());
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    role: 'team_member' as TeamAccount['role'],
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canManage = allowed('users:manage');

  const submissionsByUser = useMemo(() => {
    const map = new Map<string, number>();
    const bump = (id?: string) => {
      if (!id) return;
      map.set(id, (map.get(id) ?? 0) + 1);
    };
    state.drugs.forEach((d) => bump(d.authorId));
    state.protocols.forEach((d) => bump(d.authorId));
    state.guidelines.forEach((d) => bump(d.authorId));
    state.education.forEach((d) => bump(d.authorId));
    state.chemotherapy.forEach((d) => bump(d.authorId));
    return map;
  }, [state]);

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!canManage) {
      setError('Only administrators may invite team members.');
      return;
    }
    try {
      await createAccount(form);
      setAccounts(loadAccounts());
      setMessage(`Invited ${form.username}. Share the temporary password securely out of band.`);
      setForm({ username: '', displayName: '', email: '', password: '', role: 'team_member' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed.');
    }
  }

  function toggleActive(account: TeamAccount) {
    if (!canManage) return;
    if (account.id === session?.userId) {
      setError('You cannot disable your own account.');
      return;
    }
    updateAccount(account.id, { active: !account.active });
    setAccounts(loadAccounts());
  }

  function changeRole(account: TeamAccount, role: TeamAccount['role']) {
    if (!canManage) return;
    updateAccount(account.id, { role });
    setAccounts(loadAccounts());
  }

  const roles: RoleId[] = ['visitor', 'team_member', 'administrator', 'reviewer'];
  const permissions = Object.keys(permissionLabels) as Permission[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl text-navy">Users & Permissions</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Invite team members and assign roles. There is no public self-registration into privileged roles. When Supabase Auth is
          configured, invitations should use secure email invites instead of browser-local passwords — see docs/BACKEND.md.
        </p>
        <p className="mt-2 text-sm text-muted">
          Signed in as {session?.displayName} · {roleSummaries[session?.role ?? 'visitor'].label}
        </p>
      </div>

      {canManage && (
        <form onSubmit={onInvite} className="panel space-y-4 p-5">
          <h2 className="font-serif text-2xl text-navy">Invite team member</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="ui-label">Username</span>
              <input className="ui-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </label>
            <label className="block">
              <span className="ui-label">Display name</span>
              <input className="ui-input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </label>
            <label className="block">
              <span className="ui-label">Email</span>
              <input className="ui-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block">
              <span className="ui-label">Temporary password (min. 10)</span>
              <input
                className="ui-input"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="ui-label">Role</span>
              <select className="ui-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TeamAccount['role'] })}>
                <option value="team_member">Team Member / Content Editor</option>
                <option value="administrator">Administrator / Supervisor</option>
              </select>
            </label>
          </div>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          {message && <p className="text-sm text-emerald-800">{message}</p>}
          <button type="submit" className="btn-primary">
            Invite
          </button>
        </form>
      )}

      <div className="panel overflow-hidden p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-clinical/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submissions</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No accounts yet. Create the first administrator from the login page.
                </td>
              </tr>
            )}
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-navy">{account.displayName}</p>
                  <p className="text-muted">
                    @{account.username} · {account.email}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <select
                      className="ui-input"
                      value={account.role}
                      onChange={(e) => changeRole(account, e.target.value as TeamAccount['role'])}
                    >
                      <option value="team_member">Team Member</option>
                      <option value="administrator">Administrator</option>
                    </select>
                  ) : (
                    roleSummaries[account.role].label
                  )}
                </td>
                <td className="px-4 py-3">{account.active ? 'Active' : 'Disabled'}</td>
                <td className="px-4 py-3">{submissionsByUser.get(account.id) ?? 0}</td>
                <td className="px-4 py-3">
                  {canManage && (
                    <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => toggleActive(account)}>
                      {account.active ? 'Disable' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel overflow-x-auto p-5">
        <h2 className="font-serif text-2xl text-navy">Privilege map</h2>
        <table className="mt-4 min-w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-4">Permission</th>
              {roles.map((role) => (
                <th key={role} className="px-2 py-2">
                  {roleSummaries[role].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission} className="border-t border-line">
                <td className="py-2 pr-4 text-navy">{permissionLabels[permission]}</td>
                {roles.map((role) => (
                  <td key={role} className="px-2 py-2 text-center">
                    {rolePermissions[role].includes(permission) ? '✓' : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
