import type { ReactNode } from 'react';

interface TimelineButtonProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export default function TimelineButton({ children, active = false, onClick }: TimelineButtonProps) {
  return (
    <button className={`timeline-button ${active ? 'is-active' : ''}`} type="button" onClick={onClick}>
      {children}
    </button>
  );
}
