import type { ExtractedInfo } from "../../data/types";
import { findMissingFields, FIELD_QUESTIONS } from "./requiredFields";

export type AnalyzeResult = {
  extracted: ExtractedInfo;
  missingFields: string[];
  nextQuestion?: string;
};

// Simulated processing delay so the pipeline animation feels real.
const DELAY_MS = 1200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Lightweight keyword extraction. Goal is to simulate a real flow, not perfect NLP.
function extractClientName(text: string): string | undefined {
  // First capitalized multi-word phrase followed by a corporate suffix, else first 2-word Capitalized phrase.
  const suffixMatch = text.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:Corp|Corporation|Inc|LLC|Ltd|Systems|Industries|Technologies|Tech))/);
  if (suffixMatch) return suffixMatch[1].trim();
  const capMatch = text.match(/([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+)/);
  return capMatch ? capMatch[1].trim() : undefined;
}

function extractValue(text: string): number | undefined {
  // First $-prefixed number, allowing commas and k/m suffixes.
  const match = text.match(/\$\s?([\d,]+(?:\.\d+)?)\s?([kKmM])?/);
  if (!match) return undefined;
  let n = parseFloat(match[1].replace(/,/g, ""));
  const suffix = match[2]?.toLowerCase();
  if (suffix === "k") n *= 1_000;
  if (suffix === "m") n *= 1_000_000;
  return Math.round(n);
}

export async function analyzeConversation(rawText: string): Promise<AnalyzeResult> {
  await delay(DELAY_MS);

  const extracted: ExtractedInfo = {
    clientName: extractClientName(rawText),
    value: extractValue(rawText),
    description: "AI-generated proposal from sales conversation",
    // decisionMaker intentionally not extracted by keyword rules → drives the gap-filling chat.
  };

  const missingFields = findMissingFields(extracted);
  const nextQuestion = missingFields.length > 0 ? FIELD_QUESTIONS[missingFields[0]] : undefined;

  return { extracted, missingFields, nextQuestion };
}
