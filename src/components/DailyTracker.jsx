import React from 'react';
import PhorTracker from './PhorTracker';

export default function DailyTracker({ embedded = false }) {
  return (
    <div className={`daily-tracker-shell v30-dt-shell ${embedded ? 'is-embedded' : ''}`}>
      <PhorTracker />
    </div>
  );
}
