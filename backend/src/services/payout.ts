export interface Milestone { views: number; payout: number }

/** Highest single milestone payout earned at the supplied view count (not a sum). */
export function calculatePayout(views: number, milestones: Milestone[]): number {
  return milestones
    .filter((milestone) => views >= milestone.views)
    .reduce((highest, milestone) => Math.max(highest, milestone.payout), 0);
}

export function calculateAdditionalPayout(views: number, milestones: Milestone[], alreadyAllocated: number): number {
  return Math.max(0, calculatePayout(views, milestones) - alreadyAllocated);
}

export function validateMilestones(milestones: Milestone[]): string | null {
  if (!milestones.length) return 'At least one milestone is required';
  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    if (!Number.isInteger(m.views) || m.views < 1) return 'Milestone views must be positive whole numbers';
    if (!Number.isFinite(m.payout) || m.payout < 0) return 'Milestone payout must be zero or greater';
    if (i > 0 && m.views <= milestones[i - 1].views) return 'Milestone view thresholds must be strictly increasing';
    if (i > 0 && m.payout < milestones[i - 1].payout) return 'Milestone payouts must be non-decreasing';
  }
  return null;
}

/** All-or-nothing budget policy: never allocate a partial milestone increment. */
export function getAllocatablePayout(additionalPayout: number, remainingBudget: number): number {
  if (additionalPayout <= 0 || remainingBudget < 0) return 0;
  return additionalPayout <= remainingBudget ? additionalPayout : 0;
}
