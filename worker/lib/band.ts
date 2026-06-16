import type {
  AgentName,
  BandAgentConfig,
  BandAgentMap,
  Env,
} from "../types";

type Room = {
  id?: string;
  participants: Set<string>;
};

function agents(env: Env): BandAgentMap {
  if (!env.BAND_AGENTS_JSON) return {};
  try {
    return JSON.parse(env.BAND_AGENTS_JSON) as BandAgentMap;
  } catch {
    console.error("BAND_AGENTS_JSON is invalid JSON.");
    return {};
  }
}

async function bandFetch(
  env: Env,
  path: string,
  agent: BandAgentConfig,
  body?: unknown,
  method = "POST",
): Promise<unknown> {
  const response = await fetch(`${env.BAND_API_URL ?? "https://app.band.ai"}${path}`, {
    method,
    headers: {
      "X-API-Key": agent.key,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Band returned ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

export async function createBandRoom(
  env: Env,
  participantNames: AgentName[],
): Promise<Room> {
  const map = agents(env);
  const owner = map[participantNames[0]];
  const room: Room = { participants: new Set() };
  if (!owner) return room;

  try {
    const result = (await bandFetch(env, "/api/v1/agent/chats", owner, {
      chat: { title: `DealMaker workflow ${new Date().toISOString()}` },
    })) as { data?: { id?: string } };
    room.id = result.data?.id;
    if (!room.id) return room;
    room.participants.add(owner.id);

    for (const name of participantNames.slice(1)) {
      const participant = map[name];
      if (!participant) continue;
      await bandFetch(
        env,
        `/api/v1/agent/chats/${room.id}/participants`,
        owner,
        { participant: { participant_id: participant.id } },
      );
      room.participants.add(participant.id);
    }
  } catch (error) {
    console.error("Band room creation failed:", error);
    room.id = undefined;
  }
  return room;
}

export async function handoff(
  env: Env,
  room: Room,
  from: AgentName,
  to: AgentName,
  summary: string,
): Promise<string> {
  if (!room.id) return summary;
  const map = agents(env);
  const sender = map[from];
  const recipient = map[to];
  if (!sender || !recipient || !room.participants.has(sender.id)) return summary;

  try {
    await bandFetch(
      env,
      `/api/v1/agent/chats/${room.id}/messages`,
      sender,
      {
        message: {
          content: `@${recipient.handle ?? recipient.name} ${summary}`,
          mentions: [
            {
              id: recipient.id,
              handle: recipient.handle,
              name: recipient.name,
            },
          ],
        },
      },
    );
    const context = await bandFetch(
      env,
      `/api/v1/agent/chats/${room.id}/context`,
      recipient,
      undefined,
      "GET",
    );
    return JSON.stringify(context).slice(-8_000);
  } catch (error) {
    console.error(`Band handoff ${from} -> ${to} failed:`, error);
    return summary;
  }
}
