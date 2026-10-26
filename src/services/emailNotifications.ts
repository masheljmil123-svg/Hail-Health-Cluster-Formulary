/**
 * Email notifications are disabled in the static GitHub Pages build.
 * Local in-app notifications (IndexedDB / localStorage) remain available in the admin workspace.
 */

export type WorkflowEmailEvent =
  | 'submitted'
  | 'changes-requested'
  | 'rejected'
  | 'approved'
  | 'published'
  | 'invite';

export function isEmailConfigured(): boolean {
  return false;
}

export async function dispatchWorkflowEmail(_input: {
  event: WorkflowEmailEvent;
  toUserIds?: string[];
  subject: string;
  body: string;
}): Promise<{ sent: boolean; reason: string }> {
  return {
    sent: false,
    reason: 'Outgoing email is not available in the static site. Use in-app notifications in this browser only.',
  };
}
