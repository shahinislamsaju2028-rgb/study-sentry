import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Focus-config dropdown with a deliberate, keyboard-visible grid of options.
 * The selected value remains fully controlled by the parent; only the menu's
 * open state is local to this small control.
 */
export default function FocusConfigGridSelect({
  label,
  value,
  options = [],
  onChange,
  disabled = false,
  Icon,
  extraOption,
}) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value)) || null,
    [options, value]
  );

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const keyboard = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        root.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keyboard, true);
    };
  }, [open]);

  const LeadingIcon = Icon;
  return (
    <div className={`v54-grid-select ${open ? 'is-open' : ''}`} ref={root}>
      <button
        type="button"
        className="v54-grid-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selected?.label || String(value)}`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {LeadingIcon && <LeadingIcon className="v54-grid-select-icon" size={17} aria-hidden="true" />}
        <span className="v54-grid-select-copy">
          <small>{label}</small>
          <strong>{selected?.label || String(value)}</strong>
        </span>
        <ChevronDown className="v54-grid-select-caret" size={16} aria-hidden="true" />
      </button>

      {open && !disabled && (
        <div className="v54-grid-select-menu" role="listbox" aria-label={label}>
          {options.map((option) => {
            const active = String(option.value) === String(value);
            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                key={String(option.value)}
                className={`v54-grid-select-option ${active ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange?.(option.value);
                  setOpen(false);
                }}
              >
                <span>
                  <strong>{option.valueLabel || option.label}</strong>
                  {option.unit && <small>{option.unit}</small>}
                </span>
                {active && <Check size={14} aria-hidden="true" />}
              </button>
            );
          })}
          {extraOption && (
            <button
              type="button"
              className="v54-grid-select-extra"
              onClick={() => {
                setOpen(false);
                extraOption.onSelect?.();
              }}
            >
              {extraOption.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
