import {
  OLLAMA_BASE_URL,
  OLLAMA_MODEL,
  WORLD_ASSISTANT_TIMEOUT_MS,
} from '../config/constants.mjs';
import { getAllFlights } from '../store/flightCache.mjs';
import { getAllSatellites } from '../store/satelliteCache.mjs';
import { getAllCables, getAllShips, getInfrastructureStats } from '../store/infrastructureStore.mjs';
import { getWeatherIntelPool, querySourceHealth } from './weatherIntelDb.mjs';

const SYSTEM_PROMPT = `
You are God Eyes World Intelligence, a read-only analyst for a 3D globe.
Use only the provided live/database context. Do not invent facts.
Prefer concise operational summaries, source provenance, uncertainty, and next checks.
Never claim a source is real-time unless the context says it is live or recently fetched.
`.trim();

export async function answerWorldQuestion({ message, timeline = {}, location = null }) {
  const question = safeText(message, 1400) || 'What is happening right now?';
  const context = await buildWorldContext({ timeline, location });
  const prompt = buildPrompt(question, context);
  const ollama = await tryOllama(prompt);

  return {
    answer: ollama.answer ?? fallbackAnswer(question, context),
    provider: ollama.provider,
    model: ollama.model,
    context,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildWorldContext({ timeline = {}, location = null } = {}) {
  const [dbSummary, sourceHealth] = await Promise.all([
    queryDbSummary().catch((error) => ({ error: error.message })),
    querySourceHealth({ limit: 12 }).catch(() => []),
  ]);

  const flights = getAllFlights();
  const ships = getAllShips();
  const satellites = getAllSatellites();
  const infrastructure = getInfrastructureStats();
  const recentSources = sourceHealth.map((source) => ({
    source: source.source_name,
    family: source.source_family,
    successes: source.success_count,
    failures: source.failure_count,
    latestFetchedAt: source.latest_fetched_at,
  }));

  return {
    mode: timeline.mode ?? 'live',
    selectedTime: timeline.currentTime ?? null,
    location,
    live: {
      flights: flights.length,
      satellites: satellites.length,
      ships: ships.length,
      cables: getAllCables().length,
      shipConnection: infrastructure.ships,
      cableStatus: infrastructure.cables,
    },
    database: dbSummary,
    sourceHealth: recentSources,
  };
}

async function queryDbSummary() {
  const result = await getWeatherIntelPool().query(`
    SELECT jsonb_build_object(
      'aviationSnapshots', (SELECT count(*) FROM aviation.live_flight_snapshots),
      'satelliteStates', (SELECT count(*) FROM satellites.state_snapshots),
      'maritimePositions', (SELECT count(*) FROM maritime.position_snapshots),
      'maritimeBySource', (
        SELECT COALESCE(jsonb_object_agg(source_key, count), '{}'::jsonb)
        FROM (
          SELECT source_key, count(*)::integer AS count
          FROM maritime.position_snapshots
          GROUP BY source_key
        ) grouped
      ),
      'cables', (SELECT count(*) FROM infrastructure.cables),
      'activeHazards', (SELECT count(*) FROM hazards.current_events),
      'weatherBestCurrent', (
        SELECT count(*)
        FROM information_schema.views
        WHERE table_name = 'best_current_values'
      )
    ) AS summary
  `);
  return result.rows[0]?.summary ?? {};
}

async function tryOllama(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WORLD_ASSISTANT_TIMEOUT_MS);
  try {
    const response = await fetch(`${OLLAMA_BASE_URL.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_ctx: 8192,
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }
    const payload = await response.json();
    return {
      answer: safeText(payload.response, 5000),
      provider: 'ollama',
      model: OLLAMA_MODEL,
    };
  } catch (error) {
    return {
      answer: null,
      provider: 'rules-fallback',
      model: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(question, context) {
  return `${SYSTEM_PROMPT}

Question:
${question}

Context JSON:
${JSON.stringify(context, null, 2)}

Answer in 5-9 concise bullets. Include what data is live, what is database-backed, and what needs verification.`;
}

function fallbackAnswer(question, context) {
  const live = context.live ?? {};
  const db = context.database ?? {};
  const maritimeBySource = db.maritimeBySource ?? {};
  return [
    `Question received: ${question}`,
    `Live globe has ${num(live.flights)} flights, ${num(live.satellites)} satellites, ${num(live.ships)} AIS vessels, and ${num(live.cables)} internet cables available.`,
    `Database has ${num(db.aviationSnapshots)} flight snapshots, ${num(db.satelliteStates)} satellite states, and ${num(db.maritimePositions)} maritime positions.`,
    `Maritime database sources: ${Object.entries(maritimeBySource).map(([key, value]) => `${key}=${num(value)}`).join(', ') || 'not loaded yet'}.`,
    `Recent source-health rows are available for ${context.sourceHealth?.length ?? 0} sources.`,
    'Local Ollama did not return an answer, so this is the deterministic fallback summary.',
  ].join('\n');
}

function num(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-US') : '0';
}

function safeText(value, maxLength) {
  if (value == null) return '';
  return String(value).trim().slice(0, maxLength);
}
