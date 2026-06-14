import type { ExtractedInfo } from "../../data/types";
import { findMissingFields, FIELD_QUESTIONS } from "./requiredFields";

export type ProvideResult = {
  extracted: ExtractedInfo;
  missingFields: string[];
  nextQuestion?: string;
};

const DELAY_MS = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Coerce the user's free-text answer into the right type for the field.
function coerce(field: string, answer: string): string | number {
  if (field === "value") {
    const match = answer.match(/([\d,]+(?:\.\d+)?)\s?([kKmM])?/);
    if (match) {
      let n = parseFloat(match[1].replace(/,/g, ""));
      const suffix = match[2]?.toLowerCase();
      if (suffix === "k") n *= 1_000;
      if (suffix === "m") n *= 1_000_000;
      return Math.round(n);
    }
    return 0;
  }
  return answer.trim();
}

export async function provideMissingInfo(
  current: ExtractedInfo,
  field: string,
  answer: string,
): Promise<ProvideResult> {
  await delay(DELAY_MS);

  const extracted: ExtractedInfo = {
    ...current,
    [field]: coerce(field, answer),
  };

  const missingFields = findMissingFields(extracted);
  const nextQuestion = missingFields.length > 0 ? FIELD_QUESTIONS[missingFields[0]] : undefined;

  return { extracted, missingFields, nextQuestion };
}
