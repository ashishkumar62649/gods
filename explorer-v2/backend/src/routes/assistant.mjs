import { answerWorldQuestion } from '../services/worldAssistant.mjs';

export async function handleAssistantRoute(req, res, sendJson, url) {
  if (req.method === 'GET' && url.pathname === '/api/assistant/context') {
    const result = await answerWorldQuestion({
      message: url.searchParams.get('q') || 'Summarize the current world view.',
      timeline: {
        mode: url.searchParams.get('timeMode') || 'live',
        currentTime: url.searchParams.get('time'),
      },
    });
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/assistant/chat') {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const result = await answerWorldQuestion({
      message: body.message,
      timeline: body.timeline,
      location: body.location,
    });
    sendJson(res, 200, result);
    return true;
  }

  return false;
}
