import { SOURCE_REGISTRY, type IntelSource, type SourceRuntimeStatus } from './sourceRegistry';

export type SourceHealthRecord = {
  id: string;
  name: string;
  category: IntelSource['category'];
  implemented: boolean;
  status: SourceRuntimeStatus;
  checkedAt: string | null;
  message: string;
};

export function buildStaticSourceHealth(now = new Date()): SourceHealthRecord[] {
  const checkedAt = now.toISOString();

  return SOURCE_REGISTRY.map((source) => ({
    id: source.id,
    name: source.name,
    category: source.category,
    implemented: source.implemented,
    status: source.implemented ? 'not_tested' : 'not_implemented',
    checkedAt,
    message: source.implemented
      ? 'Source is registered; live runtime health endpoint is not wired yet.'
      : 'Source is in the roadmap but not implemented yet.',
  }));
}

