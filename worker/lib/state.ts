import type { DealStatus } from "../types";

const TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  draft: ["pending_business_review"],
  pending_business_review: ["approved", "rejected", "draft"],
  rejected: ["pending_business_review"],
  approved: [],
};

export function canTransition(from: DealStatus, to: DealStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: DealStatus, to: DealStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Deal cannot transition from ${from} to ${to}.`);
  }
}

export function isEditable(status: DealStatus): boolean {
  return status === "draft" || status === "rejected";
}
