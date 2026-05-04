import {
  getLatestClimateState,
  refreshClimateState,
} from '../services/ClimateEngine.mjs';

export async function handleClimateStateRoute(_req, res, sendJson) {
  try {
    const latestState = getLatestClimateState() ?? (await refreshClimateState());
    if (!latestState) {
      sendJson(res, 503, {
        error: 'Climate SSOT is unavailable.',
      });
      return;
    }

    sendJson(res, 200, latestState);
  } catch (error) {
    console.error('[Climate] Route failed:', error);
    sendJson(res, 502, {
      error: error instanceof Error ? error.message : 'Climate state unavailable.',
    });
  }
}
