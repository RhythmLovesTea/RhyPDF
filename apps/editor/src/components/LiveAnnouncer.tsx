import React, { useState, useEffect } from 'react';
import { subscribeToAnnouncements } from '../lib/a11y';

export const LiveAnnouncer: React.FC = () => {
  const [politeMessage, setPoliteMessage] = useState<string>('');
  const [assertiveMessage, setAssertiveMessage] = useState<string>('');

  useEffect(() => {
    return subscribeToAnnouncements((message, urgency) => {
      if (urgency === 'assertive') {
        setAssertiveMessage('');
        // Brief timeout ensures DOM change is registered by screen readers
        setTimeout(() => setAssertiveMessage(message), 50);
      } else {
        setPoliteMessage('');
        setTimeout(() => setPoliteMessage(message), 50);
      }
    });
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0
      }}
    >
      <div data-testid="a11y-live-polite" role="status" aria-live="polite" aria-atomic="true">
        {politeMessage}
      </div>
      <div data-testid="a11y-live-assertive" role="alert" aria-live="assertive" aria-atomic="true">
        {assertiveMessage}
      </div>
    </div>
  );
};
