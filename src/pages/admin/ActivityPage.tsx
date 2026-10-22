import { useContent } from '@/hooks/useContent';
import { formatDateTime } from '@/lib/format';

export function ActivityPage() {
  const { state } = useContent();
  return (
    <div>
      <h1 className="font-serif text-4xl text-navy">Activity Log</h1>
      <p className="mt-2 text-sm text-muted">Demonstration actions recorded in this browser. The actor is the generic administrator session.</p>
      <ul className="mt-6 space-y-3">
        {state.audit.length === 0 && <li className="panel p-6 text-sm text-muted">No activity yet.</li>}
        {state.audit.map((entry) => (
          <li key={entry.id} className="panel flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-navy">
                {entry.action} · {entry.targetLabel}
              </p>
              <p className="text-sm text-muted">
                {entry.targetType} · {entry.actorLabel}
              </p>
            </div>
            <time className="text-sm text-muted" dateTime={entry.timestamp}>
              {formatDateTime(entry.timestamp)}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}
