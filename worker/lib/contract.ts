import type { DealRecord } from "../types";

export function buildContractDraft(deal: DealRecord): string {
  const effectiveDate = new Date().toISOString().slice(0, 10);
  return [
    "DRAFT SERVICE AGREEMENT",
    "Not effective until signed by authorized parties.",
    "",
    `Agreement version: ${deal.version}`,
    `Draft date: ${effectiveDate}`,
    `Client: ${deal.extracted.clientName}`,
    `Client decision maker: ${deal.extracted.decisionMaker}`,
    `Client contact: ${deal.extracted.contactEmail}`,
    `Total value: USD ${deal.extracted.value?.toLocaleString("en-US")}`,
    "",
    "1. SCOPE OF SERVICES",
    deal.extracted.description ?? "",
    "",
    "2. COMMERCIAL TERMS",
    "Payment terms are Net 30 from an accepted invoice unless an approved written amendment states otherwise.",
    "Pricing excludes taxes and third-party charges unless explicitly included in the final order form.",
    "",
    "3. DELIVERY AND ACCEPTANCE",
    "Delivery dates and resource availability remain subject to written confirmation by both parties.",
    "Acceptance criteria must be documented in the final statement of work.",
    "",
    "4. LIABILITY AND COMPLIANCE",
    "Liability, confidentiality, data processing, and governing-law terms must use the organization's approved legal clauses.",
    "",
    "5. SIGNATURE STATUS",
    "This generated document is a review draft. An authenticated signature record and any required external counter-signature are still required.",
  ].join("\n");
}

export async function hashDocument(content: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
