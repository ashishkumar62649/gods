import ConfidenceBar from './ConfidenceBar';
import type { CSSProperties } from 'react';

interface RiskScoreRingProps {
  score: number;
  label: string;
  confidence?: number;
}

export default function RiskScoreRing({ score, label, confidence }: RiskScoreRingProps) {
  return (
    <div className="risk-ring-wrap">
      <div className="risk-ring" style={{ '--score': `${score}%` } as CSSProperties}>
        <strong>{score}</strong>
        <span>/100</span>
      </div>
      <b>{label}</b>
      {typeof confidence === 'number' ? <ConfidenceBar value={confidence} /> : null}
    </div>
  );
}
