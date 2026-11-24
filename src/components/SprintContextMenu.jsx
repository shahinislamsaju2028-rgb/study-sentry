import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2, Copy, CalendarClock } from 'lucide-react';
import { bnNum } from '../utils/bangla';

/**
 * SPRINT CONTEXT MENU
 *
 * Right-clicking a sprint opens this anchored menu. It is a plain, theme
 * coloured menu — warm amber/gold like the rest of the app, never green.
 *
 * It closes on:
 *   · a click outside the menu
 *   · the Escape key
 *   · any scroll of the page
 */
export default function SprintContextMenu({
  sprint,
  x,
  y,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onOpenPlanner,
}) {
  const [pos, setPos] = useState({ left: x, top: y });
  const menuRef = useRef(null);

  useEffect(() => {
    // Keep the menu inside the viewport.
    const place = () => {
      const el = menuRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = r.width || 230;
      const height = r.height || 180;
      setPos({
        left: Math.max(10, Math.min(window.innerWidth - width - 12, x)),
        top: Math.max(10, Math.min(window.innerHeight - height - 12, y)),
      });
    };
    place();
    const raf = requestAnimationFrame(place);

    const onDown = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      onClose?.();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const onScroll = () => onClose?.();

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [x, y, onClose]);

  if (!sprint) return null;

  const run = (fn) => () => {
    onClose?.();
    fn?.();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="v44-sprint-ctx"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
      aria-label="স্প্রিন্ট মেনু"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="v44-ctx-head">
        <span className="v44-ctx-ico">
          <CalendarClock size={14} />
        </span>
        <div>
          <strong>{sprint.name}</strong>
          <small>
            {sprint.start ? `${bnNum(sprint.start.slice(8, 10))}/${bnNum(sprint.start.slice(5, 7))}` : ''}
            {sprint.end ? ` → ${bnNum(sprint.end.slice(8, 10))}/${bnNum(sprint.end.slice(5, 7))}` : ''}
          </small>
        </div>
      </div>

      <div className="v44-ctx-divider" />

      <button
        type="button"
        role="menuitem"
        className="v44-ctx-item is-primary"
        onClick={run(onEdit)}
      >
        <Pencil size={14} />
        <span>এডিট</span>
      </button>

      {onDuplicate && (
        <button type="button" role="menuitem" className="v44-ctx-item" onClick={run(onDuplicate)}>
          <Copy size={14} />
          <span>অনুলিপি তৈরি করুন</span>
        </button>
      )}

      {onOpenPlanner && (
        <button type="button" role="menuitem" className="v44-ctx-item" onClick={run(onOpenPlanner)}>
          <CalendarClock size={14} />
          <span>স্প্রিন্ট প্ল্যানারে যান</span>
        </button>
      )}

      <div className="v44-ctx-divider" />

      <button type="button" role="menuitem" className="v44-ctx-item is-danger" onClick={run(onDelete)}>
        <Trash2 size={14} />
        <span>মুছে ফেলুন</span>
      </button>
    </div>,
    document.body
  );
}
