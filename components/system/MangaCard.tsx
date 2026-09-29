'use client';

import React from 'react';

interface MangaCardProps {
  children: React.ReactNode;
  title?: string;
  badge?: string;
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
  halftone?: boolean;
}

export const MangaCard: React.FC<MangaCardProps> = ({
  children,
  title,
  badge,
  interactive = false,
  className = '',
  onClick,
  halftone = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`manga-panel bracket-frame p-5 relative overflow-hidden ${
        interactive ? 'manga-panel-interactive cursor-pointer' : ''
      } ${className}`}
    >
      {halftone && (
        <div className="absolute inset-0 halftone-accent pointer-events-none -z-0" />
      )}
      {(title || badge) && (
        <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-3 mb-4 relative z-10">
          {title && (
            <h3 className="font-extrabold text-lg tracking-wide uppercase flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[var(--cyan)] inline-block border border-[var(--border-color)]"></span>
              {title}
            </h3>
          )}
          {badge && (
            <span className="badge-status bg-[var(--paper)] text-[var(--ink)]">
              {badge}
            </span>
          )}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
