import { describe, expect, it } from "vitest";
import { canTransition, isEditable } from "./state";

describe("deal state machine", () => {
  it("allows only the documented production transitions", () => {
    expect(canTransition("draft", "pending_business_review")).toBe(true);
    expect(canTransition("pending_business_review", "approved")).toBe(true);
    expect(canTransition("pending_business_review", "rejected")).toBe(true);
    expect(canTransition("pending_business_review", "draft")).toBe(true);
    expect(canTransition("rejected", "pending_business_review")).toBe(true);
  });

  it("blocks bypasses and mutation of approved outcomes", () => {
    expect(canTransition("draft", "approved")).toBe(false);
    expect(canTransition("approved", "rejected")).toBe(false);
    expect(canTransition("approved", "draft")).toBe(false);
  });

  it("makes pending and approved proposals read-only", () => {
    expect(isEditable("draft")).toBe(true);
    expect(isEditable("rejected")).toBe(true);
    expect(isEditable("pending_business_review")).toBe(false);
    expect(isEditable("approved")).toBe(false);
  });
});
