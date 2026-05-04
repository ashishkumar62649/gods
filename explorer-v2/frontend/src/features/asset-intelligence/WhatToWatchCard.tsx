import IntelligenceCard from '../../components/cards/IntelligenceCard';

export default function WhatToWatchCard({ notes }: { notes: string[] }) {
  return (
    <IntelligenceCard title="What To Watch">
      <ul className="watch-list">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </IntelligenceCard>
  );
}
