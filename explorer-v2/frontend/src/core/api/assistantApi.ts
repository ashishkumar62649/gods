import { apiUrl } from './apiConfig';

export interface AssistantRequest {
  message: string;
  timeline?: {
    mode: string;
    currentTime: string;
  };
  location?: {
    name?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export interface AssistantResponse {
  answer: string;
  provider: string;
  model?: string | null;
  generatedAt: string;
  context?: unknown;
}

export async function askWorldAssistant(
  payload: AssistantRequest,
  signal?: AbortSignal,
): Promise<AssistantResponse> {
  const response = await fetch(apiUrl('/api/v2/assistant/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Assistant returned ${response.status}`);
  }
  return response.json() as Promise<AssistantResponse>;
}
