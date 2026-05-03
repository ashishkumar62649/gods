import type { ReactNode } from 'react';

interface IconButtonProps {
  label: string;
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export default function IconButton({ label, children, active = false, onClick }: IconButtonProps) {
  return (
    <button
      className={`icon-button ${active ? 'icon-button--active' : ''}`}
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
