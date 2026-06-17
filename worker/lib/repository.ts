import { HttpError } from "./http";
import { assertTransition, isEditable } from "./state";
import type {
  AuthenticatedUser,
  DealRecord,
  DealStatus,
  Env,
  EvaluationRecord,
} from "../types";

type DealRow = {
  id: string;
  organization_id: string;
  created_by: string;
  assigned_to: string | null;
  version: number;
  status: DealRecord["status"];
  raw_conversation: string;
  extracted_json: string;
  chat_history_json: string;
  email_json: string | null;
  validation_issues_json: string | null;
  validation_mode: DealRecord["validationMode"];
  validation_failure: string | null;
  risk_score: DealRecord["riskScore"] | null;
  compliance_notes_json: string | null;
  reject_reason: string | null;
  contract_content: string | null;
  contract_status: DealRecord["contractStatus"] | null;
  contract_hash: string | null;
  evaluation_id: string | null;
  band_room_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type EvaluationRow = {
  id: string;
  deal_id: string;
  proposal_version: number;
  risk_score: EvaluationRecord["riskScore"];
  profit_score: number;
  compliance_score: number;
  priority_score: number;
  compliance_notes_json: string;
  recommendation: EvaluationRecord["recommendation"];
  reason: string;
  mode: EvaluationRecord["mode"];
  provider: string;
  policy_sources_json: string;
  failure_reason: string | null;
  contract_document: string | null;
  created_by: string;
  created_at: string;
};

function parse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toEvaluation(row: EvaluationRow): EvaluationRecord {
  return {
    id: row.id,
    dealId: row.deal_id,
    proposalVersion: row.proposal_version,
    riskScore: row.risk_score,
    profitScore: row.profit_score,
    complianceScore: row.compliance_score,
    priorityScore: row.priority_score,
    complianceNotes: parse(row.compliance_notes_json, []),
    recommendation: row.recommendation,
    reason: row.reason,
    mode: row.mode,
    provider: row.provider,
    policySources: parse(row.policy_sources_json, []),
    failureReason: row.failure_reason ?? undefined,
    contractDocument: row.contract_document ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toDeal(row: DealRow, evaluation?: EvaluationRecord): DealRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    assignedTo: row.assigned_to ?? undefined,
    version: row.version,
    status: row.status,
    rawConversation: row.raw_conversation,
    extracted: parse(row.extracted_json, {}),
    chatHistory: parse(row.chat_history_json, []),
    email: parse(row.email_json, undefined),
    validationIssues: parse(row.validation_issues_json, []),
    validationMode: row.validation_mode,
    validationFailure: row.validation_failure ?? undefined,
    riskScore: row.risk_score ?? undefined,
    complianceNotes: parse(row.compliance_notes_json, undefined),
    rejectReason: row.reject_reason ?? undefined,
    contractContent: row.contract_content ?? undefined,
    contractStatus: row.contract_status ?? undefined,
    contractHash: row.contract_hash ?? undefined,
    evaluation,
    bandRoomId: row.band_room_id ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_DEAL = `
  SELECT id, organization_id, created_by, assigned_to, version, status,
    raw_conversation, extracted_json, chat_history_json, email_json,
    validation_issues_json, validation_mode, validation_failure, risk_score,
    compliance_notes_json, reject_reason,
    contract_content, contract_status, contract_hash, evaluation_id,
    band_room_id, archived_at, created_at, updated_at
  FROM deals
`;

const SELECT_EVALUATION = `
  SELECT id, deal_id, proposal_version, risk_score, profit_score,
    compliance_score, priority_score, compliance_notes_json, recommendation,
    reason, mode, provider, policy_sources_json, failure_reason, contract_document,
    created_by, created_at
  FROM evaluations
`;

async function evaluationById(
  env: Env,
  organizationId: string,
  id: string | null,
): Promise<EvaluationRecord | undefined> {
  if (!id) return undefined;
  const row = await env.DB.prepare(
    `${SELECT_EVALUATION} WHERE organization_id = ? AND id = ?`,
  )
    .bind(organizationId, id)
    .first<EvaluationRow>();
  return row ? toEvaluation(row) : undefined;
}

export async function listDeals(
  env: Env,
  user: AuthenticatedUser,
): Promise<DealRecord[]> {
  const result = await env.DB.prepare(
    `${SELECT_DEAL}
     WHERE organization_id = ? AND archived_at IS NULL
     ORDER BY updated_at DESC`,
  )
    .bind(user.organizationId)
    .all<DealRow>();
  return Promise.all(
    result.results.map(async (row) =>
      toDeal(row, await evaluationById(env, user.organizationId, row.evaluation_id)),
    ),
  );
}

export async function getDeal(
  env: Env,
  user: AuthenticatedUser,
  id: string,
): Promise<DealRecord | null> {
  const row = await env.DB.prepare(
    `${SELECT_DEAL} WHERE organization_id = ? AND id = ?`,
  )
    .bind(user.organizationId, id)
    .first<DealRow>();
  if (!row) return null;
  return toDeal(
    row,
    await evaluationById(env, user.organizationId, row.evaluation_id),
  );
}

export async function createDeal(
  env: Env,
  deal: DealRecord,
): Promise<DealRecord> {
  await env.DB.prepare(
    `INSERT INTO deals (
      id, organization_id, created_by, assigned_to, version, status,
      raw_conversation, extracted_json, chat_history_json, email_json,
      validation_issues_json, validation_mode, validation_failure, band_room_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      deal.id,
      deal.organizationId,
      deal.createdBy,
      deal.assignedTo ?? null,
      deal.version,
      deal.status,
      deal.rawConversation,
      JSON.stringify(deal.extracted),
      JSON.stringify(deal.chatHistory),
      JSON.stringify(deal.email),
      JSON.stringify(deal.validationIssues),
      deal.validationMode,
      deal.validationFailure ?? null,
      deal.bandRoomId ?? null,
      deal.createdAt,
      deal.updatedAt,
    )
    .run();
  return deal;
}

function assertVersion(deal: DealRecord, expectedVersion: number): void {
  if (deal.version !== expectedVersion) {
    throw new HttpError(409, "This deal changed. Reload it before continuing.");
  }
}

async function ensureChanged(result: D1Result): Promise<void> {
  if ((result.meta.changes ?? 0) !== 1) {
    throw new HttpError(409, "This deal changed. Reload it before continuing.");
  }
}

export async function updateDealEmail(
  env: Env,
  user: AuthenticatedUser,
  deal: DealRecord,
  email: DealRecord["email"],
  expectedVersion: number,
): Promise<DealRecord> {
  assertVersion(deal, expectedVersion);
  if (!isEditable(deal.status)) {
    throw new HttpError(409, "Only draft or returned proposals can be edited.");
  }
  const updatedAt = new Date().toISOString();
  const result = await env.DB.prepare(
    `UPDATE deals SET email_json = ?, version = version + 1, updated_at = ?
     WHERE id = ? AND organization_id = ? AND version = ?
       AND status IN ('draft', 'rejected')`,
  )
    .bind(
      JSON.stringify(email),
      updatedAt,
      deal.id,
      user.organizationId,
      expectedVersion,
    )
    .run();
  await ensureChanged(result);
  return (await getDeal(env, user, deal.id))!;
}

export async function transitionDeal(
  env: Env,
  user: AuthenticatedUser,
  deal: DealRecord,
  to: DealStatus,
  expectedVersion: number,
  patch: {
    rejectReason?: string | null;
    riskScore?: DealRecord["riskScore"];
    complianceNotes?: string[];
    evaluationId?: string | null;
    contractContent?: string;
    contractStatus?: DealRecord["contractStatus"];
    contractHash?: string | null;
  } = {},
): Promise<DealRecord> {
  assertVersion(deal, expectedVersion);
  try {
    assertTransition(deal.status, to);
  } catch (error) {
    throw new HttpError(409, error instanceof Error ? error.message : "Invalid transition.");
  }
  const updatedAt = new Date().toISOString();
  const result = await env.DB.prepare(
    `UPDATE deals SET
      status = ?, reject_reason = ?, risk_score = ?, compliance_notes_json = ?,
      evaluation_id = ?, contract_content = ?, contract_status = ?,
      contract_hash = ?, version = version + 1, updated_at = ?
     WHERE id = ? AND organization_id = ? AND version = ? AND status = ?`,
  )
    .bind(
      to,
      patch.rejectReason === undefined ? deal.rejectReason ?? null : patch.rejectReason,
      patch.riskScore ?? deal.riskScore ?? null,
      JSON.stringify(patch.complianceNotes ?? deal.complianceNotes ?? []),
      patch.evaluationId === undefined ? deal.evaluation?.id ?? null : patch.evaluationId,
      patch.contractContent ?? deal.contractContent ?? null,
      patch.contractStatus ?? deal.contractStatus ?? null,
      patch.contractHash === undefined ? deal.contractHash ?? null : patch.contractHash,
      updatedAt,
      deal.id,
      user.organizationId,
      expectedVersion,
      deal.status,
    )
    .run();
  await ensureChanged(result);
  return (await getDeal(env, user, deal.id))!;
}

export async function archiveDeal(
  env: Env,
  user: AuthenticatedUser,
  deal: DealRecord,
  expectedVersion: number,
): Promise<void> {
  assertVersion(deal, expectedVersion);
  if (deal.status !== "approved" && deal.status !== "rejected") {
    throw new HttpError(409, "Only completed or rejected deals can be archived.");
  }
  const result = await env.DB.prepare(
    `UPDATE deals SET archived_at = ?, version = version + 1, updated_at = ?
     WHERE id = ? AND organization_id = ? AND version = ?`,
  )
    .bind(
      new Date().toISOString(),
      new Date().toISOString(),
      deal.id,
      user.organizationId,
      expectedVersion,
    )
    .run();
  await ensureChanged(result);
}

export async function clearAllDeals(
  env: Env,
  user: AuthenticatedUser,
): Promise<void> {
  const org = user.organizationId;
  await env.DB.prepare(`DELETE FROM signatures WHERE organization_id = ?`).bind(org).run();
  await env.DB.prepare(`DELETE FROM audit_events WHERE organization_id = ?`).bind(org).run();
  await env.DB.prepare(`DELETE FROM agent_events WHERE organization_id = ?`).bind(org).run();
  await env.DB.prepare(`DELETE FROM evaluations WHERE organization_id = ?`).bind(org).run();
  await env.DB.prepare(`DELETE FROM deals WHERE organization_id = ?`).bind(org).run();
}

export async function findEvaluation(
  env: Env,
  user: AuthenticatedUser,
  dealId: string,
  proposalVersion: number,
): Promise<EvaluationRecord | null> {
  const row = await env.DB.prepare(
    `${SELECT_EVALUATION}
     WHERE organization_id = ? AND deal_id = ? AND proposal_version = ?`,
  )
    .bind(user.organizationId, dealId, proposalVersion)
    .first<EvaluationRow>();
  return row ? toEvaluation(row) : null;
}

export async function createEvaluation(
  env: Env,
  user: AuthenticatedUser,
  evaluation: EvaluationRecord,
): Promise<EvaluationRecord> {
  await env.DB.prepare(
    `INSERT INTO evaluations (
      id, organization_id, deal_id, proposal_version, risk_score, profit_score,
      compliance_score, priority_score, compliance_notes_json, recommendation,
      reason, mode, provider, policy_sources_json, failure_reason, contract_document,
      created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      evaluation.id,
      user.organizationId,
      evaluation.dealId,
      evaluation.proposalVersion,
      evaluation.riskScore,
      evaluation.profitScore,
      evaluation.complianceScore,
      evaluation.priorityScore,
      JSON.stringify(evaluation.complianceNotes),
      evaluation.recommendation,
      evaluation.reason,
      evaluation.mode,
      evaluation.provider,
      JSON.stringify(evaluation.policySources),
      evaluation.failureReason ?? null,
      evaluation.contractDocument ?? null,
      evaluation.createdBy,
      evaluation.createdAt,
    )
    .run();
  await env.DB.prepare(
    `UPDATE deals SET evaluation_id = ?, risk_score = ?,
      compliance_notes_json = ?, band_room_id = COALESCE(?, band_room_id),
      updated_at = ?
     WHERE id = ? AND organization_id = ? AND version = ?`,
  )
    .bind(
      evaluation.id,
      evaluation.riskScore,
      JSON.stringify(evaluation.complianceNotes),
      null,
      new Date().toISOString(),
      evaluation.dealId,
      user.organizationId,
      evaluation.proposalVersion,
    )
    .run();
  return evaluation;
}

export async function recordAuditEvent(
  env: Env,
  user: AuthenticatedUser,
  action: string,
  dealId: string | null,
  payload: unknown = {},
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO audit_events (
      id, organization_id, actor_user_id, deal_id, action, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      user.organizationId,
      user.id,
      dealId,
      action,
      JSON.stringify(payload),
      new Date().toISOString(),
    )
    .run();
}

export async function recordAgentEvent(
  env: Env,
  organizationId: string,
  dealId: string | null,
  roomId: string | undefined,
  agent: string,
  stage: string,
  payload: unknown,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO agent_events (
      id, organization_id, deal_id, band_room_id, agent_name, stage,
      payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      organizationId,
      dealId,
      roomId ?? null,
      agent,
      stage,
      JSON.stringify(payload),
      new Date().toISOString(),
    )
    .run();
}

export async function attachAgentEvents(
  env: Env,
  organizationId: string,
  roomId: string | undefined,
  dealId: string,
): Promise<void> {
  if (!roomId) return;
  await env.DB.prepare(
    `UPDATE agent_events SET deal_id = ?
     WHERE organization_id = ? AND band_room_id = ? AND deal_id IS NULL`,
  )
    .bind(dealId, organizationId, roomId)
    .run();
}

export type AgentEventRecord = {
  agentName: string;
  stage: string;
  payload: unknown;
  roomId: string | null;
  createdAt: string;
};

export async function getAgentEvents(
  env: Env,
  organizationId: string,
  dealId: string,
): Promise<AgentEventRecord[]> {
  const rows = await env.DB.prepare(
    `SELECT agent_name, stage, payload_json, band_room_id, created_at
     FROM agent_events
     WHERE organization_id = ? AND deal_id = ?
     ORDER BY created_at ASC`,
  )
    .bind(organizationId, dealId)
    .all<{
      agent_name: string;
      stage: string;
      payload_json: string;
      band_room_id: string | null;
      created_at: string;
    }>();
  return rows.results.map((row) => ({
    agentName: row.agent_name,
    stage: row.stage,
    payload: ((): unknown => {
      try {
        return JSON.parse(row.payload_json);
      } catch {
        return row.payload_json;
      }
    })(),
    roomId: row.band_room_id,
    createdAt: row.created_at,
  }));
}

export async function recordSignature(
  env: Env,
  user: AuthenticatedUser,
  deal: DealRecord,
  typedName: string,
  documentHash: string,
  request: Request,
): Promise<void> {
  const updated = await env.DB.prepare(
    `UPDATE deals SET contract_status = 'signed', contract_hash = ?,
      version = version + 1, updated_at = ?
     WHERE id = ? AND organization_id = ? AND version = ?
       AND status = 'approved' AND contract_status = 'draft'`,
  )
    .bind(
      documentHash,
      new Date().toISOString(),
      deal.id,
      user.organizationId,
      deal.version,
    )
    .run();
  await ensureChanged(updated);
  try {
    await env.DB.prepare(
      `INSERT INTO signatures (
        id, organization_id, deal_id, deal_version, signer_user_id, signer_name,
        signer_email, document_hash, consent_text, user_agent, ip_address,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        user.organizationId,
        deal.id,
        deal.version,
        user.id,
        typedName,
        user.email,
        documentHash,
        "I approve this internal agreement draft and consent to this electronic signature record.",
        request.headers.get("user-agent"),
        request.headers.get("cf-connecting-ip"),
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
    await env.DB.prepare(
      `UPDATE deals SET contract_status = 'draft', version = version + 1,
        updated_at = ? WHERE id = ? AND organization_id = ?`,
    )
      .bind(new Date().toISOString(), deal.id, user.organizationId)
      .run();
    throw error;
  }
}

export async function enforceRateLimit(
  env: Env,
  user: AuthenticatedUser,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  const key = `${user.organizationId}:${user.id}:${action}:${bucket}`;
  const expiresAt = (bucket + 1) * windowSeconds;
  await env.DB.prepare(
    `INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET count = count + 1`,
  )
    .bind(key, expiresAt)
    .run();
  const row = await env.DB.prepare(
    "SELECT count FROM rate_limits WHERE key = ?",
  )
    .bind(key)
    .first<{ count: number }>();
  if ((row?.count ?? 0) > limit) {
    throw new HttpError(429, "Too many requests. Please wait and try again.");
  }
}
