import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { permissionLabels, rolePermissions, roleSummaries } from '@/config/permissions';
import {
  PROFESSIONAL_DESIGNATION_LABEL,
  isPharmacyProfessional,
} from '@/config/professionalDesignations';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { createAccount, loadAccounts, updateAccount } from '@/services/accounts';
import { sortedHospitals } from '@/services/hospitals';
import type { Permission, ProfessionalDesignation, RoleId, TeamAccount } from '@/types';

export function UsersPage() {
  const { session, allowed } = useAuth();
  const { state } = useContent();
  const [params, setParams] = useSearchParams();
  const professionFilter = params.get('profession') ?? '';
  const [accounts, setAccounts] = useState<TeamAccount[]>(() => loadAccounts());
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    role: 'team_member' as TeamAccount['role'],
    professionalDesignation: 'unspecified' as ProfessionalDesignation,
    hospitalId: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canManage = allowed('users:manage');
  const hospitals = sortedHospitals(state.hospitals ?? []);

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

  const visibleAccounts = useMemo(() => {
    if (professionFilter === 'pharmacy') {
      return accounts.filter((account) => isPharmacyProfessional(account.professionalDesignation));
    }
    if (professionFilter && professionFilter !== 'all') {
      return accounts.filter((account) => (account.professionalDesignation ?? 'unspecified') === professionFilter);
    }
    return accounts;
  }, [accounts, professionFilter]);

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!canManage) {
      setError('Only administrators may invite team members.');
      return;
    }
    try {
      await createAccount({
        ...form,
        hospitalId: form.hospitalId || undefined,
      });
      setAccounts(loadAccounts());
      setMessage(`Added local account ${form.username}. Password stays on this browser only.`);
      setForm({
        username: '',
        displayName: '',
        email: '',
        password: '',
        role: 'team_member',
        professionalDesignation: 'unspecified',
        hospitalId: '',
      });
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

  function changeDesignation(account: TeamAccount, professionalDesignation: ProfessionalDesignation) {
    if (!canManage) return;
    updateAccount(account.id, { professionalDesignation });
    setAccounts(loadAccounts());
  }

  function changeHospital(account: TeamAccount, hospitalId: string) {
    if (!canManage) return;
    updateAccount(account.id, { hospitalId: hospitalId || undefined });
    setAccounts(loadAccounts());
  }

  function setProfessionFilter(value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete('profession');
    else next.set('profession', value);
    setParams(next, { replace: true });
  }

  const roles: RoleId[] = ['visitor', 'staff', 'team_member', 'administrator', 'reviewer'];
  const permissions = Object.keys(permissionLabels) as Permission[];
  const designations = Object.keys(PROFESSIONAL_DESIGNATION_LABEL) as ProfessionalDesignation[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl text-navy">Users & Permissions</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Local workspace accounts only — credentials stay in this browser and are not synchronized across devices. This is not a
          secure multi-user production identity system. Professional designation is separate from application role.
        </p>
        <p className="mt-2 text-sm text-muted">
          Signed in as {session?.displayName} · {roleSummaries[session?.role ?? 'visitor'].label}
        </p>
      </div>

      {canManage && (
        <form onSubmit={onInvite} className="panel space-y-4 p-5">
          <h2 className="font-serif text-2xl text-navy">Add local workspace account</h2>
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
              <span className="ui-label">Application role</span>
              <select className="ui-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TeamAccount['role'] })}>
                <option value="team_member">Team Member / Content Editor</option>
                <option value="administrator">Administrator / Supervisor</option>
              </select>
            </label>
            <label className="block">
              <span className="ui-label">Professional designation</span>
              <select
                className="ui-input"
                value={form.professionalDesignation}
                onChange={(e) =>
                  setForm({ ...form, professionalDesignation: e.target.value as ProfessionalDesignation })
                }
              >
                {designations.map((key) => (
                  <option key={key} value={key}>
                    {PROFESSIONAL_DESIGNATION_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="ui-label">Hospital affiliation</span>
              <select
                className="ui-input"
                value={form.hospitalId}
                onChange={(e) => setForm({ ...form, hospitalId: e.target.value })}
              >
                <option value="">Not specified</option>
                {hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.nameEn}
                  </option>
                ))}
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

      <div className="flex flex-wrap items-end gap-3">
        <label className="block sm:max-w-xs">
          <span className="ui-label">Filter by profession</span>
          <select
            className="ui-input"
            value={professionFilter || 'all'}
            onChange={(e) => setProfessionFilter(e.target.value)}
          >
            <option value="all">All profiles</option>
            <option value="pharmacy">Pharmacy professionals</option>
            {designations.map((key) => (
              <option key={key} value={key}>
                {PROFESSIONAL_DESIGNATION_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="panel overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-clinical/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Professional designation</th>
              <th className="px-4 py-3">Hospital</th>
              <th className="px-4 py-3">App role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submissions</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visibleAccounts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  {professionFilter
                    ? 'No local profiles match this profession filter.'
                    : 'No local workspace accounts yet. Evaluation sign-in uses the documented test accounts on the Login page. Optional local accounts can still be created here for this browser only.'}
                </td>
              </tr>
            )}
            {visibleAccounts.map((account) => (
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
                      value={account.professionalDesignation ?? 'unspecified'}
                      onChange={(e) => changeDesignation(account, e.target.value as ProfessionalDesignation)}
                    >
                      {designations.map((key) => (
                        <option key={key} value={key}>
                          {PROFESSIONAL_DESIGNATION_LABEL[key]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    PROFESSIONAL_DESIGNATION_LABEL[account.professionalDesignation ?? 'unspecified']
                  )}
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <select
                      className="ui-input"
                      value={account.hospitalId ?? ''}
                      onChange={(e) => changeHospital(account, e.target.value)}
                    >
                      <option value="">Not specified</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital.id} value={hospital.id}>
                          {hospital.nameEn}
                        </option>
                      ))}
                    </select>
                  ) : (
                    hospitals.find((h) => h.id === account.hospitalId)?.nameEn ?? 'Not specified'
                  )}
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
