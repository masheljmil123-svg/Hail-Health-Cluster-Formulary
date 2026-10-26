/** Last authenticated actor for local audit rows. */

let lastActorLabel = 'System';
let lastActorId: string | undefined;

export function setContentActorLabel(label: string, userId?: string): void {
  lastActorLabel = label || 'System';
  lastActorId = userId;
}

export function getContentActorLabel(): string {
  return lastActorLabel;
}

export function getContentActorId(): string | undefined {
  return lastActorId;
}
