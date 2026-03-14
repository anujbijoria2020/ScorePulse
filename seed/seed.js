import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.SEED_BASE_URL || "http://localhost:8000";
const DATA_FILE = path.resolve(__dirname, "../data/data.json");
const TARGET_COMMENTARY_COUNT = Number(process.env.SEED_COMMENTARY_COUNT || 500);
const MATCH_ID_START = Number(process.env.SEED_MATCH_ID_START || 1);
const MATCH_ID_END = Number(process.env.SEED_MATCH_ID_END || 10);

function safeJsonParse(text) {
  if (typeof text !== "string") {
    return null;
  }

  const normalized = text.replace(/^[\uFEFF\u200B\u2060]+/, "").trimStart();
  return normalized ? JSON.parse(normalized) : null;
}

function requiredString(value, fallback = "") {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json = null;

  try {
    json = safeJsonParse(text);
  } catch {
    json = null;
  }

  return { ok: response.ok, status: response.status, json, raw: text };
}

async function main() {
  const content = await readFile(DATA_FILE, "utf8");
  const records = safeJsonParse(content);

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("data/data.json must contain a non-empty array.");
  }

  if (!Number.isInteger(TARGET_COMMENTARY_COUNT) || TARGET_COMMENTARY_COUNT <= 0) {
    throw new Error("SEED_COMMENTARY_COUNT must be a positive integer.");
  }
  if (!Number.isInteger(MATCH_ID_START) || !Number.isInteger(MATCH_ID_END) || MATCH_ID_START > MATCH_ID_END) {
    throw new Error("SEED_MATCH_ID_START/SEED_MATCH_ID_END must be integers and start <= end.");
  }

  const matchIds = [];
  for (let id = MATCH_ID_START; id <= MATCH_ID_END; id += 1) {
    matchIds.push(id);
  }

  let successCount = 0;

  for (let index = 0; index < TARGET_COMMENTARY_COUNT; index += 1) {
    const item = records[index % records.length];
    const loop = Math.floor(index / records.length);
    const matchId = matchIds[index % matchIds.length];

    const payload = {
      minute: Number(item.minute),
      sequence: Number(item.sequence) + loop * 100000 + 1,
      period: requiredString(item.period),
      eventType: requiredString(item.eventType),
      actor: requiredString(item.actor),
      team: requiredString(item.team),
      message: requiredString(item.message),
      metadata:
        item && typeof item.metadata === "object" && item.metadata !== null
          ? item.metadata
          : {},
      tags: Array.isArray(item.tags)
        ? item.tags.map((tag) => String(tag))
        : [],
    };

    const result = await postJson(
      `${BASE_URL}/api/matches/${matchId}/commentary`,
      payload,
    );

    if (!result.ok) {
      throw new Error(
        `Failed at commentary sequence ${payload.sequence} (matchId=${matchId}). Status: ${result.status}. Response: ${
          result.raw || JSON.stringify(result.json)
        }`,
      );
    }

    successCount += 1;
    const commentaryId = result?.json?.data?.id ?? "unknown-id";
    console.log(
      `Created commentary ${successCount}/${TARGET_COMMENTARY_COUNT} (commentaryId=${commentaryId}) for matchId=${matchId}`,
    );
  }

  console.log(`Seeding complete. Total commentaries inserted: ${successCount}`);
}

main().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
