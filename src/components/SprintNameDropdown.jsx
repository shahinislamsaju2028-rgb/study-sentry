import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Pencil, RotateCcw } from 'lucide-react';
import { bnNum } from '../utils/bangla';

/**
 * One sprint-name control. Students can choose a practical preset, right-click
 * either the field or a preset to rename it, and use a temporary context
 * popover to edit a custom title. Preset changes remain controlled by SprintView.
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
  const [editing, setEditing] = useState(null); // { original, draft }
  const [menuFor, setMenuFor] = useState(null);
  const [fieldContextOpen, setFieldContextOpen] = useState(false);
  const [fieldDraft, setFieldDraft] = useState('');
  const root = useRef(null);
  const menu = useRef(null);
  const isPreset = names.includes(value);

  const startEdit = (original) => {
    setEditing({ original, draft: original });
    setMenuFor(null);
    setFieldContextOpen(false);
  };

  const commitEdit = () => {
    const next = String(editing?.draft || '').trim();
    if (next && next !== editing.original) onRenamePreset?.(editing.original, next);
    setEditing(null);
    setMenuFor(null);
  };

  const commitCustomName = () => {
    const next = String(fieldDraft || '').trim();
    if (next) onChange?.(next);
    setFieldContextOpen(false);
  };

  const openFieldContext = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;

    if (isPreset) {
      // Open the grouped list and surface the edit menu beside the active preset.
      setFieldContextOpen(false);
      setOpen(true);
      setMenuFor(value);
      return;
    }

    setOpen(false);
    setMenuFor(null);
    setFieldDraft(value || '');
    setFieldContextOpen(true);
  };

  useEffect(() => {
    if (!open || !menuFor) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const option = Array.from(menu.current?.querySelectorAll('[data-sprint-name]') || []).find(
        (item) => item.getAttribute('data-sprint-name') === menuFor
      );
      if (typeof option?.scrollIntoView === 'function') {
        option.scrollIntoView({ block: 'center' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, menuFor]);

  useEffect(() => {
    if (!open && !fieldContextOpen) return undefined;
    const outside = (event) => {
      if (root.current?.contains(event.target)) return;
      setOpen(false);
      setFieldContextOpen(false);
      setMenuFor(null);
    };
    const escape = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      setFieldContextOpen(false);
      setMenuFor(null);
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', escape);
    };
  }, [open, fieldContextOpen]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setFieldContextOpen(false);
      setMenuFor(null);
    }
  }, [disabled]);

  return (
    <div
      className={`v45-name-dd ${disabled ? 'is-locked' : ''} ${
        justUnlocked ? 'is-just-unlocked' : ''
      }`}
      ref={root}
    >
      <div className="v45-name-dd-row">
        <span className="v45-name-dd-label">স্প্রিন্টের নাম</span>
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
        aria-expanded={open || fieldContextOpen}
        aria-label="স্প্রিন্টের নাম বেছে নিন"
        onClick={() => {
          setFieldContextOpen(false);
          setOpen((current) => !current);
        }}
        onContextMenu={openFieldContext}
        title={disabled ? 'এডিট চলছে — নাম এখন বদলানো যাবে না' : 'ডান-ক্লিক করে নাম এডিট করুন'}
      >
        <strong>{value || 'স্প্রিন্টের নাম বেছে নিন'}</strong>
        <ChevronDown size={16} className={`v45-name-dd-chevron ${open ? 'is-open' : ''}`} />
      </button>

      {open && !disabled && (
        <div
          ref={menu}
          className="v45-name-dd-menu v48-name-menu"
          role="listbox"
          aria-label="স্প্রিন্টের নামের তালিকা"
        >
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
                    <div className="v48-name-edit" key={name} data-sprint-name={name}>
                      <input
                        autoFocus
                        type="text"
                        maxLength={80}
                        value={editing.draft}
                        onChange={(event) =>
                          setEditing((current) => ({ ...current, draft: event.target.value }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitEdit();
                          }
                          if (event.key === 'Escape') setEditing(null);
                        }}
                        aria-label="প্রি-মেড নাম সম্পাদনা"
                      />
                      <button type="button" className="is-save" onClick={commitEdit} title="সংরক্ষণ">
                        <Check size={13} strokeWidth={3} /> সংরক্ষণ
                      </button>
                      <button
                        type="button"
                        className="is-cancel"
                        onClick={() => setEditing(null)}
                        title="বাতিল"
                      >
                        বাতিল
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="v48-name-opt-wrap" key={name} data-sprint-name={name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`v45-name-dd-option ${active ? 'is-selected' : ''}`}
                      onClick={() => {
                        onChange?.(name);
                        setOpen(false);
                        setMenuFor(null);
                        setFieldContextOpen(false);
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setMenuFor((current) => (current === name ? null : name));
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
                              onRenamePreset(name, null);
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

      {fieldContextOpen && !disabled && (
        <div className="v48-name-field-context" role="menu" aria-label="কাস্টম স্প্রিন্ট নাম সম্পাদনা">
          <label>
            <span>কাস্টম স্প্রিন্ট নাম</span>
            <input
              autoFocus
              type="text"
              maxLength={80}
              value={fieldDraft}
              onChange={(event) => setFieldDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitCustomName();
                }
                if (event.key === 'Escape') setFieldContextOpen(false);
              }}
            />
          </label>
          <div className="v48-name-field-actions">
            <button
              type="button"
              className="is-save"
              disabled={!fieldDraft.trim()}
              onClick={commitCustomName}
            >
              <Check size={13} strokeWidth={3} /> সংরক্ষণ
            </button>
            <button type="button" className="is-cancel" onClick={() => setFieldContextOpen(false)}>
              বাতিল
            </button>
          </div>
        </div>
      )}
    </div>
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
