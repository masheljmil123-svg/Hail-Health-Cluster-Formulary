import { permissionLabels, rolePermissions, roleSummaries } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { Permission, RoleId } from '@/types';

const roles: RoleId[] = ['visitor', 'administrator', 'reviewer'];
const permissions = Object.keys(permissionLabels) as Permission[];

export function UsersPage() {
  const { session } = useAuth();
  return (
    <div>
      <h1 className="font-serif text-4xl text-navy">Users & Permissions</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        This prototype has one demonstration administrator session. It does not create hospital accounts. Reviewer access is reserved for a future clinical approval workflow. A secure backend must enforce these permissions before production.
      </p>
      <div className="panel mt-6 p-5">
        <p className="text-sm text-muted">Current session</p>
        <p className="mt-1 font-serif text-2xl text-navy">{session?.displayName ?? 'Administrator'}</p>
        <p className="text-sm text-muted">Role: {roleSummaries[session?.role ?? 'administrator'].label} · Mode: demonstration</p>
      </div>
      <div className="mt-6 space-y-4">
        {roles.map((role) => (
          <article key={role} className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-2xl text-navy">{roleSummaries[role].label}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleSummaries[role].active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {roleSummaries[role].active ? 'Available in this prototype' : 'Reserved'}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">{roleSummaries[role].summary}</p>
          </article>
        ))}
      </div>
      <div className="panel mt-6 overflow-x-auto p-5">
        <h2 className="font-serif text-2xl text-navy">Privilege map</h2>
        <table className="mt-4 w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 pr-4 font-medium">Permission</th>
              {roles.map((role) => (
                <th key={role} className="px-3 py-2 font-medium">
                  {roleSummaries[role].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission} className="border-b border-line/80">
                <th className="py-3 pr-4 font-medium text-navy">{permissionLabels[permission]}</th>
                {roles.map((role) => (
                  <td key={role} className="px-3 py-3">
                    {rolePermissions[role].includes(permission) ? 'Yes' : '—'}
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
