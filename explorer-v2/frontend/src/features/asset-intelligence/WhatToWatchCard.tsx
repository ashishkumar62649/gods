import IntelligenceCard from '../../components/cards/IntelligenceCard';
import { assetMock } from './assetMock';

export default function WhatToWatchCard() {
  return (
    <IntelligenceCard title="What To Watch">
      <ul className="watch-list">
        {assetMock.watchNotes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </IntelligenceCard>
  );
}
