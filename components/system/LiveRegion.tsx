'use client';

import React, { useEffect, useState } from 'react';

interface LiveRegionProps {
  message: string;
}

/**
 * Accessible polite aria-live announcer for cue and status updates.
 * Throttles announcements to prevent screen reader spamming.
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({ message }) => {
  const [announcedMessage, setAnnouncedMessage] = useState('');

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setAnnouncedMessage(message);
    }, 150);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcedMessage}
    </div>
  );
};
