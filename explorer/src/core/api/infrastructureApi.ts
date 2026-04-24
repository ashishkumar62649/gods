import { API_ROUTES } from '../config/endpoints';
import type {
  CableData,
  InfrastructureNodeData,
  InfrastructureShipData,
} from '../store/useInfrastructureStore';

const INFRASTRUCTURE_TIMEOUT_MS = 20_000;

export interface InfrastructureSnapshot {
  cables: CableData[];
  ships: InfrastructureShipData[];
  nodes: InfrastructureNodeData[];
}

export async function fetchInfrastructureSnapshot(): Promise<InfrastructureSnapshot> {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      INFRASTRUCTURE_TIMEOUT_MS,
    );

    try {
      const response = await fetch(API_ROUTES.LOCAL_INFRASTRUCTURE, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Infrastructure endpoint returned ${response.status}`);
      }

      const payload = await response.json();
      return {
        cables: readArrayPayload(payload, 'cables') as unknown as CableData[],
        ships: readArrayPayload(payload, 'ships') as unknown as InfrastructureShipData[],
        nodes: readArrayPayload(payload, 'nodes') as unknown as InfrastructureNodeData[],
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('[Infrastructure API] Snapshot fetch failed:', error);
    return {
      cables: [],
      ships: [],
      nodes: [],
    };
  }
}

function readArrayPayload(payload: unknown, key: string): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (isRecord(payload) && Array.isArray(payload[key])) return payload[key].filter(isRecord);
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}
