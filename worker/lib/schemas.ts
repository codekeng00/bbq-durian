import { z } from "zod";

const shortText = z.string().trim().min(1).max(200);
const longText = z.string().trim().min(1).max(100_000);

export const teamSchema = z.enum(["sales", "business"]);

export const extractedInfoSchema = z
  .object({
    clientName: shortText.optional(),
    value: z.number().finite().positive().max(1_000_000_000).optional(),
    description: z.string().trim().min(1).max(5_000).optional(),
    decisionMaker: shortText.optional(),
    contactEmail: z.string().trim().email().max(320).optional(),
  })
  .strict();

export const completeExtractedInfoSchema = extractedInfoSchema.extend({
  clientName: shortText,
  value: z.number().finite().positive().max(1_000_000_000),
  description: z.string().trim().min(1).max(5_000),
  decisionMaker: shortText,
  contactEmail: z.string().trim().email().max(320),
});

export const emailSchema = z
  .object({
    to: z.string().trim().email().max(320),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(30_000),
  })
  .strict();

export const chatMessageSchema = z
  .object({
    role: z.enum(["agent", "user"]),
    text: z.string().trim().min(1).max(5_000),
  })
  .strict();

export const createDealSchema = z
  .object({
    rawConversation: longText,
    extracted: completeExtractedInfoSchema,
    chatHistory: z.array(chatMessageSchema).max(50),
    email: emailSchema,
    validationIssues: z.array(z.string().trim().min(1).max(500)).max(25).default([]),
    validationMode: z.enum(["live_ai", "rules_only"]),
    validationFailure: z.string().trim().min(1).max(2_000).optional(),
    bandRoomId: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.validationMode === "rules_only" && value.validationIssues.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["validationIssues"],
        message: "Rules-only validation requires a manual-review warning.",
      });
    }
  });

export const analyzeSchema = z.object({ rawText: longText }).strict();

export const missingInfoSchema = z
  .object({
    current: extractedInfoSchema,
    field: z.enum([
      "clientName",
      "value",
      "description",
      "decisionMaker",
      "contactEmail",
    ]),
    answer: z.string().trim().min(1).max(1_000),
  })
  .strict();

export const generateEmailSchema = z
  .object({
    info: completeExtractedInfoSchema,
    rawConversation: z.string().max(100_000).default(""),
  })
  .strict();

export const updateEmailSchema = z
  .object({
    email: emailSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const versionedActionSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const submitSchema = versionedActionSchema.extend({
  acknowledgeWarnings: z.boolean().default(false),
});

export const approveSchema = versionedActionSchema.extend({
  evaluationId: z.string().uuid(),
  overrideReason: z.string().trim().min(20).max(2_000).optional(),
});

export const rejectSchema = versionedActionSchema.extend({
  evaluationId: z.string().uuid(),
  category: z.enum(["risk", "compliance", "incomplete", "commercial", "other"]),
  details: z.string().trim().min(10).max(2_000),
});

export const signatureSchema = versionedActionSchema.extend({
  typedName: z.string().trim().min(2).max(120),
  consent: z.literal(true),
});

export const devLoginSchema = z.object({ team: teamSchema }).strict();
