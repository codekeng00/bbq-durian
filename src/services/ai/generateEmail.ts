import type { Email, ExtractedInfo } from "../../data/types";

const DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugDomain(clientName: string): string {
  return clientName.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";
}

export async function generateEmail(info: ExtractedInfo): Promise<Email> {
  await delay(DELAY_MS);

  const client = info.clientName ?? "the client";
  const value = info.value ?? 0;
  const decisionMaker = info.decisionMaker ?? "the team";

  return {
    to: `contact@${slugDomain(client)}`,
    subject: `Proposal for ${client}: ${info.description ?? "Partnership Opportunity"}`,
    body: [
      `Dear ${decisionMaker},`,
      "",
      `Thank you for the productive conversation regarding ${client}'s upcoming initiative. ` +
        `Based on our discussion, we have prepared a tailored proposal valued at approximately $${value.toLocaleString()}.`,
      "",
      "Our solution is designed to accelerate your operations while maintaining full compliance " +
        "with your regional requirements. The attached breakdown details scope, timeline, and commercial terms.",
      "",
      "Would you be available this week for a brief call to walk through the details?",
      "",
      "Best regards,",
      "Alice Chen",
      "DealMaker Sales Team",
    ].join("\n"),
  };
}
