import { runBusinessGraph } from "./agents/businessGraph";
import { generateClarifyingQuestion, parseConversation, runSalesGraph } from "./agents/salesGraph";
import {
  clearDevSessionCookie,
  createDevSession,
  devAuthEnabled,
  optionalUser,
  requireUser,
} from "./lib/auth";
import { fetchRoomTranscript } from "./lib/band";
import { buildContractDraft, hashDocument } from "./lib/contract";
import { errorResponse, HttpError, json, readJson, routeParam } from "./lib/http";
import { reindexKnowledge } from "./lib/rag";
import {
  analyzeSchema,
  approveSchema,
  createDealSchema,
  devLoginSchema,
  generateEmailSchema,
  missingInfoSchema,
  rejectSchema,
  signatureSchema,
  submitSchema,
  updateEmailSchema,
  versionedActionSchema,
} from "./lib/schemas";
import {
  archiveDeal,
  attachAgentEvents,
  clearAllDeals,
  createDeal,
  createEvaluation,
  enforceRateLimit,
  findEvaluation,
  getAgentEvents,
  getDeal,
  listDeals,
  recordAuditEvent,
  recordSignature,
  transitionDeal,
  updateDealEmail,
} from "./lib/repository";
import type {
  AgentName,
  DealRecord,
  Env,
  EvaluationRecord,
  ExtractedInfo,
} from "./types";

function createSseStream() {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  function emit(event: string, data: unknown) {
    void writer.write(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
    );
  }

  function close() {
    void writer.close();
  }

  const response = new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });

  return { response, emit, close };
}

const REQUIRED_FIELDS: Array<keyof ExtractedInfo> = [
  "clientName",
  "value",
  "description",
  "decisionMaker",
  "contactEmail",
];

const FIELD_QUESTIONS: Record<keyof ExtractedInfo, string> = {
  clientName: "What is the client's legal or trading name?",
  value: "What is the estimated deal value in USD?",
  description: "What product, service, and business outcome are in scope?",
  decisionMaker: "Who is the decision maker on the client side?",
  contactEmail: "What verified email address should receive the proposal?",
};

function missingFields(info: ExtractedInfo): Array<keyof ExtractedInfo> {
  return REQUIRED_FIELDS.filter((field) => {
    const value = info[field];
    return value === undefined || value === null || value === "";
  });
}

function coerceMissing(
  field: keyof ExtractedInfo,
  answer: string,
): string | number {
  if (field !== "value") return answer.trim();
  const match = answer.match(/([\d,]+(?:\.\d+)?)\s?([kKmM])?/);
  if (!match) throw new HttpError(400, "Enter a valid positive deal value.");
  let value = Number(match[1].replace(/,/g, ""));
  if (match[2]?.toLowerCase() === "k") value *= 1_000;
  if (match[2]?.toLowerCase() === "m") value *= 1_000_000;
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000_000) {
    throw new HttpError(400, "Enter a deal value between 1 and 1,000,000,000.");
  }
  return Math.round(value);
}

async function timingSafeToken(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === "/api/health" && request.method === "GET") {
    return json({
      ok: true,
      services: {
        d1: true,
        vectorize: Boolean(env.KNOWLEDGE),
        featherlessLlm: Boolean(env.FEATHERLESS_API_KEY),
        band: Boolean(env.BAND_AGENTS_JSON),
      },
    });
  }

  if (pathname === "/api/auth/session" && request.method === "GET") {
    const user = await optionalUser(request, env);
    return json({
      authenticated: Boolean(user),
      user,
      devMode: devAuthEnabled(request, env),
    });
  }

  if (pathname === "/api/auth/session" && request.method === "POST") {
    const body = await readJson(request, devLoginSchema, 1_000);
    const session = await createDevSession(request, env, body.team);
    return json(
      { authenticated: true, user: session.user, devMode: true },
      { headers: { "set-cookie": session.cookie } },
    );
  }

  if (pathname === "/api/auth/session" && request.method === "DELETE") {
    return json(
      { ok: true },
      { headers: { "set-cookie": clearDevSessionCookie() } },
    );
  }

  const user = await requireUser(request, env);

  if (pathname === "/api/deals" && request.method === "GET") {
    return json({ deals: await listDeals(env, user) });
  }

  if (pathname === "/api/deals" && request.method === "DELETE") {
    await clearAllDeals(env, user);
    return json({ ok: true });
  }

  if (pathname === "/api/deals" && request.method === "POST") {
    if (user.team !== "sales") throw new HttpError(403, "sales role required.");
    await enforceRateLimit(env, user, "create-deal", 30, 60);
    const body = await readJson(request, createDealSchema);
    const now = new Date().toISOString();
    const deal: DealRecord = {
      id: crypto.randomUUID(),
      organizationId: user.organizationId,
      createdBy: user.id,
      version: 1,
      status: "draft",
      rawConversation: body.rawConversation,
      extracted: body.extracted,
      chatHistory: body.chatHistory,
      email: body.email,
      validationIssues: body.validationIssues,
      validationMode: body.validationMode,
      validationFailure: body.validationFailure,
      bandRoomId: body.bandRoomId,
      createdAt: now,
      updatedAt: now,
    };
    const created = await createDeal(env, deal);
    await attachAgentEvents(env, user.organizationId, body.bandRoomId, created.id);
    await recordAuditEvent(env, user, "deal.created", created.id, {
      version: created.version,
      validationIssues: created.validationIssues,
    });
    return json({ deal: created }, { status: 201 });
  }

  const dealId = routeParam(pathname, /^\/api\/deals\/([^/]+)$/);
  if (dealId && request.method === "GET") {
    const deal = await getDeal(env, user, dealId);
    if (!deal) throw new HttpError(404, "Deal not found.");
    return json({ deal });
  }

  const eventsDealId = routeParam(pathname, /^\/api\/deals\/([^/]+)\/events$/);
  if (eventsDealId && request.method === "GET") {
    const deal = await getDeal(env, user, eventsDealId);
    if (!deal) throw new HttpError(404, "Deal not found.");
    const events = await getAgentEvents(env, user.organizationId, eventsDealId);

    // Real Band @mention transcript, merged per room from the participating agents.
    const byRoom = new Map<string, Set<AgentName>>();
    for (const event of events) {
      if (!event.roomId) continue;
      const set = byRoom.get(event.roomId) ?? new Set<AgentName>();
      set.add(event.agentName as AgentName);
      byRoom.set(event.roomId, set);
    }
    const transcript: Array<{ roomId: string; sender: string; content: string; at: string }> = [];
    for (const [roomId, names] of byRoom) {
      const messages = await fetchRoomTranscript(env, roomId, [...names]);
      for (const message of messages) {
        transcript.push({ roomId, sender: message.sender, content: message.content, at: message.at });
      }
    }
    transcript.sort((a, b) => a.at.localeCompare(b.at));

    return json({ events, transcript });
  }

  if (pathname === "/api/agents/analyze" && request.method === "POST") {
    if (user.team !== "sales") throw new HttpError(403, "sales role required.");
    await enforceRateLimit(env, user, "analyze", 20, 60);
    const body = await readJson(request, analyzeSchema, 150_000);
    const extracted = await parseConversation(env, body.rawText);
    const missing = missingFields(extracted);
    return json({
      extracted,
      missingFields: missing,
      nextQuestion: missing[0]
        ? await generateClarifyingQuestion(env, missing[0], extracted, body.rawText, FIELD_QUESTIONS[missing[0]])
        : undefined,
    });
  }

  if (pathname === "/api/agents/missing-info" && request.method === "POST") {
    if (user.team !== "sales") throw new HttpError(403, "sales role required.");
    const body = await readJson(request, missingInfoSchema, 20_000);
    const extracted = {
      ...body.current,
      [body.field]: coerceMissing(body.field, body.answer),
    };
    const missing = missingFields(extracted);
    return json({
      extracted,
      missingFields: missing,
      nextQuestion: missing[0]
        ? await generateClarifyingQuestion(
            env,
            missing[0],
            extracted,
            "",
            FIELD_QUESTIONS[missing[0]],
          )
        : undefined,
    });
  }

  if (pathname === "/api/agents/generate-email" && request.method === "POST") {
    if (user.team !== "sales") throw new HttpError(403, "sales role required.");
    await enforceRateLimit(env, user, "generate-email", 10, 60);
    const body = await readJson(request, generateEmailSchema, 150_000);

    const { response, emit, close } = createSseStream();

    void (async () => {
      try {
        const result = await runSalesGraph(
          env,
          body.info,
          body.rawConversation,
          { organizationId: user.organizationId, salespersonName: user.name },
          (agentName, to, message) => emit("agent_step", { agentName, to, message }),
        );
        emit("done", result);
      } catch (err) {
        emit("error", { message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        close();
      }
    })();

    return response;
  }

  const emailDealId = routeParam(pathname, /^\/api\/deals\/([^/]+)\/email$/);
  if (emailDealId && request.method === "PATCH") {
    if (user.team !== "sales") throw new HttpError(403, "sales role required.");
    const body = await readJson(request, updateEmailSchema, 50_000);
    const deal = await getDeal(env, user, emailDealId);
    if (!deal) throw new HttpError(404, "Deal not found.");
    const updated = await updateDealEmail(
      env,
      user,
      deal,
      body.email,
      body.expectedVersion,
    );
    await recordAuditEvent(env, user, "deal.email_updated", deal.id, {
      fromVersion: deal.version,
      toVersion: updated.version,
    });
    return json({ deal: updated });
  }

  const submitDealId = routeParam(pathname, /^\/api\/deals\/([^/]+)\/submit$/);
  if (submitDealId && request.method === "POST") {
    if (user.team !== "sales") throw new HttpError(403, "sales role required.");
    const body = await readJson(request, submitSchema, 5_000);
    const deal = await getDeal(env, user, submitDealId);
    if (!deal) throw new HttpError(404, "Deal not found.");
    if (deal.validationIssues.length > 0 && !body.acknowledgeWarnings) {
      throw new HttpError(409, "Acknowledge proposal validation warnings first.");
    }
    const updated = await transitionDeal(
      env,
      user,
      deal,
      "pending_business_review",
      body.expectedVersion,
      { rejectReason: null, evaluationId: null },
    );
    await recordAuditEvent(env, user, "deal.submitted", deal.id, {
      proposalVersion: updated.version,
      warningsAcknowledged: body.acknowledgeWarnings,
    });
    return json({ deal: updated });
  }

  const withdrawDealId = routeParam(pathname, /^\/api\/deals\/([^/]+)\/withdraw$/);
  if (withdrawDealId && request.method === "POST") {
    if (user.team !== "sales") throw new HttpError(403, "sales role required.");
    const body = await readJson(request, versionedActionSchema, 2_000);
    const deal = await getDeal(env, user, withdrawDealId);
    if (!deal) throw new HttpError(404, "Deal not found.");
    const updated = await transitionDeal(
      env,
      user,
      deal,
      "draft",
      body.expectedVersion,
      { evaluationId: null },
    );
    await recordAuditEvent(env, user, "deal.withdrawn", deal.id, {
      fromVersion: deal.version,
      toVersion: updated.version,
    });
    return json({ deal: updated });
  }

  const evaluateDealId = routeParam(pathname, /^\/api\/deals\/([^/]+)\/evaluate$/);
  if (evaluateDealId && request.method === "POST") {
    if (user.team !== "business") throw new HttpError(403, "business role required.");
    await enforceRateLimit(env, user, "evaluate", 10, 60);
    const deal = await getDeal(env, user, evaluateDealId);
    if (!deal) throw new HttpError(404, "Deal not found.");
    if (deal.status !== "pending_business_review") {
      throw new HttpError(409, "Only pending proposals can be evaluated.");
    }
    const cached = await findEvaluation(env, user, deal.id, deal.version);
    if (cached) return json({ evaluation: cached, cached: true });

    const { response, emit, close } = createSseStream();
    void (async () => {
      try {
        const result = await runBusinessGraph(
          env,
          deal,
          { organizationName: user.organizationName, reviewerName: user.name },
          (agentName, to, message) => emit("agent_step", { agentName, to, message }),
        );
        const evaluation: EvaluationRecord = {
          id: crypto.randomUUID(),
          dealId: deal.id,
          proposalVersion: deal.version,
          riskScore: result.riskScore,
          profitScore: result.profitScore,
          complianceScore: result.complianceScore,
          priorityScore: result.priorityScore,
          complianceNotes: result.complianceNotes,
          recommendation: result.recommendation,
          reason: result.reason,
          mode: result.mode,
          provider: result.provider,
          policySources: result.policySources,
          failureReason: result.failureReason,
          contractDocument: result.contractDocument,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
        };
        await createEvaluation(env, user, evaluation);
        await recordAuditEvent(env, user, "deal.evaluated", deal.id, {
          evaluationId: evaluation.id,
          proposalVersion: evaluation.proposalVersion,
          mode: evaluation.mode,
        });
        emit("done", { evaluation, cached: false });
      } catch (err) {
        emit("error", { message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        close();
      }
    })();
    return response;
  }

  const approveDealId = routeParam(pathname, /^\/api\/deals\/([^/]+)\/approve$/);
  if (approveDealId && request.method === "POST") {
    if (user.team !== "business") throw new HttpError(403, "business role required.");
    const body = await readJson(request, approveSchema, 5_000);
    const deal = await getDeal(env, user, approveDealId);
    if (!deal) throw new HttpError(404, "Deal not found.");
    if (deal.status !== "pending_business_review") {
      throw new HttpError(409, "Only pending proposals can be approved.");
    }
    const evaluation = deal.evaluation;
    if (
      !evaluation ||
      evaluation.id !== body.evaluationId ||
      evaluation.proposalVersion !== deal.version
    ) {
      throw new HttpError(409, "A current server evaluation is required.");
    }
    if (evaluation.riskScore === "high" && !user.canApproveHighRisk) {
      throw new HttpError(403, "High-risk deals require an executive approver.");
    }
    if (evaluation.mode === "rules_only" && !body.overrideReason) {
      throw new HttpError(
        409,
        "Rules-only analysis requires a documented human override reason.",
      );
    }
    const contractContent = evaluation.contractDocument || buildContractDraft(deal);
    const contractHash = await hashDocument(contractContent);
    const updated = await transitionDeal(
      env,
      user,
      deal,
      "approved",
      body.expectedVersion,
      {
        riskScore: evaluation.riskScore,
        complianceNotes: evaluation.complianceNotes,
        evaluationId: evaluation.id,
        contractContent,
        contractStatus: "draft",
        contractHash,
      },
    );
    await recordAuditEvent(env, user, "deal.approved", deal.id, {
      evaluationId: evaluation.id,
      overrideReason: body.overrideReason,
      contractHash,
    });
    return json({ deal: updated });
  }

  const rejectDealId = routeParam(pathname, /^\/api\/deals\/([^/]+)\/reject$/);
  if (rejectDealId && request.method === "POST") {
    if (user.team !== "business") throw new HttpError(403, "business role required.");
    const body = await readJson(request, rejectSchema, 5_000);
    const deal = await getDeal(env, user, rejectDealId);
    if (!deal) throw new HttpError(404, "Deal not found.");
    if (deal.status !== "pending_business_review") {
      throw new HttpError(409, "Only pending proposals can be returned.");
    }
    const evaluation = deal.evaluation;
    if (
      !evaluation ||
      evaluation.id !== body.evaluationId ||
      evaluation.proposalVersion !== deal.version
    ) {
      throw new HttpError(409, "A current server evaluation is required.");
    }
    const rejectReason = `${body.category}: ${body.details}`;
    const updated = await transitionDeal(
      env,
      user,
      deal,
      "rejected",
      body.expectedVersion,
      {
        riskScore: evaluation.riskScore,
        complianceNotes: evaluation.complianceNotes,
        evaluationId: evaluation.id,
        rejectReason,
      },
    );
    await recordAuditEvent(env, user, "deal.rejected", deal.id, {
      evaluationId: evaluation.id,
      category: body.category,
      details: body.details,
    });
    return json({ deal: updated });
  }

  const archiveDealId = routeParam(pathname, /^\/api\/deals\/([^/]+)\/archive$/);
  if (archiveDealId && request.method === "POST") {
    const body = await readJson(request, versionedActionSchema, 2_000);
    const deal = await getDeal(env, user, archiveDealId);
    if (!deal) throw new HttpError(404, "Deal not found.");
    await archiveDeal(env, user, deal, body.expectedVersion);
    await recordAuditEvent(env, user, "deal.archived", deal.id);
    return json({ ok: true });
  }

  const signDealId = routeParam(pathname, /^\/api\/deals\/([^/]+)\/sign$/);
  if (signDealId && request.method === "POST") {
    if (user.team !== "sales") throw new HttpError(403, "sales role required.");
    const body = await readJson(request, signatureSchema, 5_000);
    const deal = await getDeal(env, user, signDealId);
    if (!deal) throw new HttpError(404, "Deal not found.");
    if (
      deal.status !== "approved" ||
      deal.contractStatus !== "draft" ||
      !deal.contractContent
    ) {
      throw new HttpError(409, "This agreement is not available for signature.");
    }
    if (deal.version !== body.expectedVersion) {
      throw new HttpError(409, "This agreement changed. Reload before signing.");
    }
    const documentHash = await hashDocument(deal.contractContent);
    await recordSignature(env, user, deal, body.typedName, documentHash, request);
    await recordAuditEvent(env, user, "deal.internal_signature_recorded", deal.id, {
      documentHash,
      typedName: body.typedName,
    });
    return json({ deal: await getDeal(env, user, deal.id) });
  }

  if (pathname === "/api/knowledge/reindex" && request.method === "POST") {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (
      !env.ADMIN_TOKEN ||
      !token ||
      !(await timingSafeToken(token, env.ADMIN_TOKEN))
    ) {
      throw new HttpError(401, "Admin token required.");
    }
    return json({ indexed: await reindexKnowledge(env) });
  }

  throw new HttpError(404, "API route not found.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = request.headers.get("cf-ray") ?? crypto.randomUUID();
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) {
        const response = await api(request, env);
        response.headers.set("x-request-id", requestId);
        return response;
      }
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 404) return response;
      return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    } catch (error) {
      console.error(JSON.stringify({
        message: "Request failed",
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        error: error instanceof Error ? error.message : String(error),
      }));
      const response = errorResponse(error);
      response.headers.set("x-request-id", requestId);
      return response;
    }
  },
} satisfies ExportedHandler<Env>;
