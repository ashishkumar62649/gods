import type { Severity } from '../../app/appTypes';

export interface HazardAlert {
  id: string;
  title: string;
  region: string;
  severity: Severity;
  time: string;
  confidence: number;
}
