import type { Severity } from '../../app/appTypes';

export interface IntelligenceMetric {
  label: string;
  value: string | number;
  severity: Severity;
  confidence: number;
  description?: string;
}

export interface EvidenceItem {
  label: string;
  source: string;
  time: string;
  impact: 'Low Impact' | 'Medium Impact' | 'High Impact';
}
