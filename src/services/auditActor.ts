/** Last authenticated actor label for local audit rows. */
let lastActorLabel = 'System';

export function setContentActorLabel(label: string): void {
  lastActorLabel = label || 'System';
}

export function getContentActorLabel(): string {
  return lastActorLabel;
}
