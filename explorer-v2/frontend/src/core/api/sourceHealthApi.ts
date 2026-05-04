import { apiUrl } from './apiConfig';

export interface SourceHealthRow {
  source_id?: string;
  source_key?: string;
  source_name?: string;
  display_name?: string;
  operational_status?: string;
  status?: string;
  success_count?: number;
  failure_count?: number;
  latest_fetched_at?: string | null;
  checked_at?: string | null;
}

export async function fetchSourceHealth(signal?: AbortSignal): Promise<SourceHealthRow[]> {
  const response = await fetch(apiUrl('/api/v2/source-health?limit=8'), { signal });
  if (!response.ok) {
    throw new Error(`Source health returned ${response.status}`);
  }
  const payload = (await response.json()) as { sources?: SourceHealthRow[]; items?: SourceHealthRow[] };
  return payload.sources ?? payload.items ?? [];
}
