import { describe, expect, it } from "vitest";
import {
  approveSchema,
  createDealSchema,
  missingInfoSchema,
  rejectSchema,
} from "./schemas";

const validDeal = {
  rawConversation: "A sufficiently detailed conversation.",
  extracted: {
    clientName: "Acme Corporation",
    value: 125000,
    description: "Managed implementation services",
    decisionMaker: "Jamie Lee",
    contactEmail: "jamie@acme.example",
  },
  chatHistory: [],
  email: {
    to: "jamie@acme.example",
    subject: "Implementation proposal",
    body: "A complete proposal message.",
  },
  validationIssues: [],
  validationMode: "live_ai",
};

describe("API request schemas", () => {
  it("accepts a complete deal", () => {
    expect(createDealSchema.safeParse(validDeal).success).toBe(true);
  });

  it("rejects malformed email and missing business facts", () => {
    const result = createDealSchema.safeParse({
      ...validDeal,
      extracted: {},
      email: { to: "not-an-email", subject: "", body: "" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown missing-info fields", () => {
    expect(
      missingInfoSchema.safeParse({
        current: {},
        field: "organizationId",
        answer: "attacker-controlled",
      }).success,
    ).toBe(false);
  });

  it("requires a documented rules-only override when supplied", () => {
    expect(
      approveSchema.safeParse({
        expectedVersion: 2,
        evaluationId: crypto.randomUUID(),
        overrideReason: "too short",
      }).success,
    ).toBe(false);
  });

  it("requires structured rejection remediation", () => {
    expect(
      rejectSchema.safeParse({
        expectedVersion: 2,
        evaluationId: crypto.randomUUID(),
        category: "compliance",
        details: "short",
      }).success,
    ).toBe(false);
  });
});
