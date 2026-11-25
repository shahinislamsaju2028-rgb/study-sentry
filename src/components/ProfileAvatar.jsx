import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';

/**
 * The single place the student's profile picture is drawn.
 *
 * Every surface that shows the student's picture (sidebar footer, profile
 * panel, Study Lounge header, leaderboard "me" row) renders THIS component, so
 * the moment the picture is changed in the profile panel it appears everywhere
 * — no copy, no stale cache, no second source of truth.
 *
 * Fallback chain:  chosen picture → Gmail picture → first letter of the name.
 */
export default function ProfileAvatar({
  size = 34,
  className = '',
  name,
  src,
  fallbackSrc = '',
  alt = '',
  title,
}) {
  const { state } = useStudy();
  const [failed, setFailed] = useState('');

  const chosen = src ?? state?.profile?.avatarUrl ?? '';
  const displayName = name || state?.profile?.name || 'শিক্ষার্থী';
  const initial = Array.from(String(displayName).trim())[0]?.toUpperCase() || 'শ';

  const picture = chosen && chosen !== failed ? chosen : fallbackSrc || '';
  const showImage = Boolean(picture);

  return (
    <span
      className={`profile-avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.42)) }}
      title={title}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={picture}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(picture)}
        />
      ) : (
        <span className="profile-avatar-initial">{initial}</span>
      )}
    </span>
  );
}
