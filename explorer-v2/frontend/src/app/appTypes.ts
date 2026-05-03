export type Severity =
  | 'low'
  | 'moderate'
  | 'elevated'
  | 'high'
  | 'critical'
  | 'healthy';

export type SourceState = 'live' | 'delayed' | 'degraded';

export interface SourceChip {
  label: string;
  detail: string;
  state: SourceState;
}
