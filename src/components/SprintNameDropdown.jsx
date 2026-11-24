import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Pencil, RotateCcw } from 'lucide-react';
import { bnNum } from '../utils/bangla';

/**
 * SPRINT NAME DROPDOWN — the single, full-width title control of the planner.
 *
 * · There are no "−" / "+" buttons on either side any more.
 * · A small label sits above a full-width dropdown.
 * · The selected title is set in a noticeably larger font.
 * · The name can be a pre-made one (picked here) or a custom one typed in the
 *   text field underneath — both write to the same value.
 * · While the sprint is being edited the dropdown is locked; once the edit
 *   finishes (save or cancel) a small marker flashes and it unlocks again.
 */
export default function SprintNameDropdown({
  groups = null,
  names = [],
  value,
  onChange,
  onRenamePreset,
  disabled = false,
  justUnlocked = false,
}) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  // right-click → এডিট. Only one preset can be in edit mode at a time.
  const [editing, setEditing] = useState(null); // { original, draft }
  const [menuFor, setMenuFor] = useState(null); // original name the context row belongs to
  const [customDraft, setCustomDraft] = useState('');
  useEffect(() => {
    if (!open) return;
    setCustomDraft(names.includes(value) ? '' : value || '');
  }, [open]);
  const isPreset = names.includes(value);

  const startEdit = (original) => {
    setEditing({ original, draft: original });
    setMenuFor(null);
  };
  const commitEdit = () => {
    const next = String(editing?.draft || '').trim();
    if (next && next !== editing.original) onRenamePreset?.(editing.original, next);
    setEditing(null);
  };

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', escape);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div
      className={`v45-name-dd ${disabled ? 'is-locked' : ''} ${
        justUnlocked ? 'is-just-unlocked' : ''
      }`}
      ref={root}
    >
      <div className="v45-name-dd-row">
        <span className="v45-name-dd-label">স্প্রিন্টের নাম (প্রি-মেইড)</span>
        {justUnlocked && (
          <span className="v45-name-dd-unlocked" role="status">
            <Check size={11} strokeWidth={3.2} /> আবার সক্রিয়
          </span>
        )}
      </div>

      <button
        type="button"
        className="v45-name-dd-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="প্রি-মেইড স্প্রিন্ট নাম বেছে নিন"
        onClick={() => setOpen((v) => !v)}
        title={disabled ? 'এডিট চলছে — নাম এখন বদলানো যাবে না' : 'প্রি-মেইড নাম বেছে নিন'}
      >
        <strong>{isPreset ? value : 'কাস্টম নাম'}</strong>
        <ChevronDown size={16} className={`v45-name-dd-chevron ${open ? 'is-open' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="v45-name-dd-menu v48-name-menu" role="listbox" aria-label="প্রি-মেইড নামের তালিকা">
          {(groups && groups.length ? groups : [{ id: 'all', label: '', names }]).map((group) => (
            <div className="v48-name-group" key={group.id}>
              {group.label && (
                <div className="v48-name-group-head">
                  <strong>{group.label}</strong>
                  {group.hint && <small>{group.hint}</small>}
                </div>
              )}
              {group.names.map((name) => {
                const active = value === name;
                const isEditingThis = editing?.original === name;
                if (isEditingThis) {
                  return (
                    <div className="v48-name-edit" key={name}>
                      <input
                        autoFocus
                        type="text"
                        maxLength={80}
                        value={editing.draft}
                        onChange={(e) => setEditing((v) => ({ ...v, draft: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        aria-label="প্রি-মেইড নাম সম্পাদনা"
                      />
                      <button type="button" className="is-save" onClick={commitEdit} title="সংরক্ষণ">
                        <Check size={13} strokeWidth={3} /> সংরক্ষণ
                      </button>
                      <button type="button" className="is-cancel" onClick={() => setEditing(null)} title="বাতিল">
                        বাতিল
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="v48-name-opt-wrap" key={name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`v45-name-dd-option ${active ? 'is-selected' : ''}`}
                      onClick={() => {
                        onChange(name);
                        setOpen(false);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMenuFor((cur) => (cur === name ? null : name));
                      }}
                      title="ডান-ক্লিক করলে এডিট করতে পারবেন"
                    >
                      <span>{name}</span>
                      {active && <Check size={14} strokeWidth={2.8} />}
                    </button>
                    {menuFor === name && (
                      <div className="v48-name-ctx" role="menu">
                        <button type="button" role="menuitem" onClick={() => startEdit(name)}>
                          <Pencil size={12} /> এডিট
                        </button>
                        {onRenamePreset && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              onRenamePreset(name, null); // null → restore original
                              setMenuFor(null);
                            }}
                          >
                            <RotateCcw size={12} /> আসল নাম
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The single custom-name entry point.
 *
 * It sits UNDER the title dropdown, styled as its extension (same border, same
 * radius, attached to the bottom edge) — one control, not a competing card.
 * The old duplicate box beside the title (the বোগাস one) is gone.
 */
export function SprintCustomNameInput({ value, onChange, disabled = false }) {
  return (
    <label className={`v45-name-custom v48-name-attached ${disabled ? 'is-locked' : ''}`}>
      <Pencil size={12} className="v48-name-attached-ico" />
      <input
        type="text"
        maxLength={80}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="অথবা নিজের নাম লিখুন…"
        aria-label="কাস্টম স্প্রিন্ট নাম"
      />
    </label>
  );
}

/** Small amber chip that warns only when the day's total time is above 240. */
export function SprintOverloadChip({ minutes }) {
  if (!(Number(minutes) > 240)) return null;
  return (
    <span className="v45-overload-chip" role="status" title={`মোট ${bnNum(minutes)} মিনিট`}>
      ⚠ মোট সময় {bnNum(240)} মিনিট ছাড়িয়েছে
    </span>
  );
}
