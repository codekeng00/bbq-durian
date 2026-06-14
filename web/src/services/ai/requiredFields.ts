import type { ExtractedInfo } from "../../data/types";

// Required fields for a complete proposal, in the order the agent asks about them.
export const REQUIRED_FIELDS: (keyof ExtractedInfo)[] = [
  "clientName",
  "value",
  "decisionMaker",
];

export const FIELD_QUESTIONS: Record<string, string> = {
  clientName: "I couldn't identify the client company from the conversation. What is the client's name?",
  value: "I didn't find a budget or deal value. What is the estimated value of this opportunity (in USD)?",
  decisionMaker: "Who is the decision maker on the client side?",
};

// Returns the list of required fields that are still missing from `info`.
export function findMissingFields(info: ExtractedInfo): string[] {
  return REQUIRED_FIELDS.filter((field) => {
    const value = info[field];
    return value === undefined || value === null || value === "";
  });
}
