import React, { useRef, useState } from 'react';
import { Camera, Check, RotateCcw, Upload, X } from 'lucide-react';
import { bnNum } from '../utils/bangla';

/* 12 pre-made avatars — a student can swap their profile picture in one click. */
export const AVATAR_PRESETS = [
  { id: 'owl', emoji: '🦉', from: '#ffd369', to: '#ff9808' },
  { id: 'cap', emoji: '🎓', from: '#60a5fa', to: '#3b82f6' },
  { id: 'rocket', emoji: '🚀', from: '#f472b6', to: '#ec4899' },
  { id: 'book', emoji: '📚', from: '#34d399', to: '#10b981' },
  { id: 'flask', emoji: '🔬', from: '#a78bfa', to: '#8b5cf6' },
  { id: 'code', emoji: '💻', from: '#22d3ee', to: '#06b6d4' },
  { id: 'sun', emoji: '🌞', from: '#ff9808', to: '#ff9808' },
  { id: 'moon', emoji: '🌙', from: '#818cf8', to: '#6366f1' },
  { id: 'leaf', emoji: '🌿', from: '#4ade80', to: '#22c55e' },
  { id: 'brain', emoji: '🧠', from: '#f9a8d4', to: '#ec4899' },
  { id: 'star', emoji: '⭐', from: '#ffd369', to: '#eab308' },
  { id: 'wolf', emoji: '🐺', from: '#94a3b8', to: '#64748b' },
];

export function avatarDataUri(preset) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${preset.from}"/><stop offset="1" stop-color="${preset.to}"/></linearGradient></defs><rect width="256" height="256" rx="64" fill="url(#a)"/><rect x="8" y="8" width="240" height="240" rx="57" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="5"/><text x="128" y="140" dy="0.36em" text-anchor="middle" font-size="130" font-family="'Segoe UI Emoji','Noto Color Emoji',sans-serif">${preset.emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function fileToDataUri(file) {
  if (!file) return null;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('JPG, PNG বা WebP ছবি বেছে নিন');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('ছবিটি ৫ MB-এর বেশি হতে পারবে না');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('ছবি পড়া যায়নি'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compact avatar editor: 12 pre-made badges, an upload button and a way back
 * to the Google/Gmail photo.
 */
export default function AvatarPicker({ value, onChange, gmailUrl, onReset }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  const pickUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const uri = await fileToDataUri(file);
      onChange(uri);
    } catch (ex) {
      setErr(ex.message || 'ছবি ব্যবহার করা যায়নি');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const activePreset = AVATAR_PRESETS.find((p) => avatarDataUri(p) === value);

  return (
    <div className="v34-av">
      <div className="v34-av-head">
        <span className="v34-av-head-icon">
          <Camera size={14} />
        </span>
        <div>
          <strong>প্রোফাইল ছবি বেছে নিন</strong>
          <small>প্রি-মেড আইকন, নিজের ছবি, অথবা Gmail-এর ছবি</small>
        </div>
      </div>

      <div className="v34-av-grid">
        {AVATAR_PRESETS.map((p) => {
          const uri = avatarDataUri(p);
          const active = value === uri;
          return (
            <button
              type="button"
              key={p.id}
              className={`v34-av-tile ${active ? 'is-active' : ''}`}
              onClick={() => onChange(uri)}
              aria-label={`প্রি-মেড আইকন ${bnNum(AVATAR_PRESETS.indexOf(p) + 1)}`}
            >
              <img src={uri} alt="" />
              {active && (
                <span className="v34-av-tick">
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="v34-av-actions">
        <button
          type="button"
          className="v34-av-action"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={13} /> নিজের ছবি আপলোড
        </button>

        {gmailUrl && (
          <button type="button" className="v34-av-action" onClick={onReset}>
            <RotateCcw size={13} /> Gmail ছবি ফিরিয়ে আন
          </button>
        )}

        {value && (
          <button type="button" className="v34-av-action is-ghost" onClick={() => onChange('')}>
            <X size={13} /> মুছুন
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={pickUpload}
          hidden
        />
      </div>

      {activePreset && (
        <p className="v34-av-note">
          বেছে নেওয়া হয়েছে: {activePreset.emoji}
        </p>
      )}
      {err && (
        <p className="v34-av-note is-error" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
