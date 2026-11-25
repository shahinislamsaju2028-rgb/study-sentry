import React, { useEffect, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import {
  LayoutDashboard,
  Timer,
  ListTodo,
  ChartNoAxesCombined,
  GraduationCap,
  Settings2,
  Sparkles,
  CalendarCheck2,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import type { ActiveTimer } from '../types/study';

interface NavItem {
  id: string;
  view?: string;
  short: string;
  Icon: LucideIcon;
}

const items: NavItem[] = [
  { id: 'home', short: 'Home', Icon: LayoutDashboard },
  { id: 'focus', short: 'Focus', Icon: Timer },
  { id: 'todo', short: 'Tasks', Icon: ListTodo },
  { id: 'insights', short: 'Insights', Icon: ChartNoAxesCombined },
  { id: 'overview', view: 'motivation', short: 'Overview', Icon: Sparkles },
  { id: 'tracker', short: 'Daily Tracker', Icon: CalendarCheck2 },
  { id: 'suite', short: 'Student Suite', Icon: GraduationCap },
  { id: 'circle', short: 'Study Lounge', Icon: UsersRound },
  { id: 'settings', short: 'Settings', Icon: Settings2 },
];

// The dock should appear the moment the pointer approaches the bottom edge —
// a generous reveal zone plus a long hysteresis tail keeps it from flickering.
const BOTTOM_REVEAL_ZONE_PX = 180;
const BOTTOM_EXIT_HYSTERESIS_PX = 210;

export default function BottomNavigation() {
  const { view, navigate, timer, displayTime, ts } = useStudy() as {
    view: string;
    navigate: (next: string, subtab?: string) => void;
    timer: ActiveTimer | null;
    displayTime: string;
    ts: (s: string) => string;
  };

  const navRef = useRef<HTMLElement | null>(null);
  const [awake, setAwake] = useState(false);
  const [focusedWithin, setFocusedWithin] = useState(false);

  const active =
    view === 'motivation'
      ? 'overview'
      : view === 'study'
      ? 'focus'
      : view;
  const selected = items.some((i) => i.id === active) ? active : 'home';

  useEffect(() => {
    // A touch-first device has no pointer hover/reveal gesture. Keep the dock
    // available there so navigation is never trapped in its hidden state.
    const hasHoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!hasHoverPointer) {
      setAwake(true);
      return;
    }

    let raf = 0;
    let lastX = -1;
    let lastY = -1;
    let currentAwake = false;

    const evaluate = () => {
      raf = 0;
      const vh = window.innerHeight || 800;
      const el = navRef.current;

      const inBottomStrip =
        lastY >= vh - (currentAwake ? BOTTOM_EXIT_HYSTERESIS_PX : BOTTOM_REVEAL_ZONE_PX);

      let overDock = false;
      if (currentAwake && el) {
        const rect = el.getBoundingClientRect();
        overDock =
          lastX >= rect.left - 28 &&
          lastX <= rect.right + 28 &&
          lastY >= rect.top - 24 &&
          lastY <= rect.bottom + 28;
      }

      const nextAwake = inBottomStrip || overDock;
      if (nextAwake !== currentAwake) {
        currentAwake = nextAwake;
        setAwake(nextAwake);
      }
    };

    const onMove = (e: PointerEvent | MouseEvent) => {
      if ('pointerType' in e && e.pointerType === 'touch') return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (!raf) raf = requestAnimationFrame(evaluate);
    };

    const onHide = () => {
      currentAwake = false;
      setAwake(false);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onHide);
    window.addEventListener('blur', onHide);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onHide);
      window.removeEventListener('blur', onHide);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const isAwake = awake || focusedWithin;

  return (
    <div
      className={`nav-dock v6-complete-fade-dock v13-minimal-dock-wrap ${
        isAwake ? 'is-dock-awake' : 'is-dock-hidden'
      }`}
    >
      <nav
        ref={navRef}
        className={`bottom-navigation liquid-glass-dock v13-minimal-icon-dock ${
          isAwake ? 'is-awake' : 'is-focus-fade'
        }`}
        aria-label="Main navigation"
        aria-hidden={!isAwake}
        onPointerEnter={() => setAwake(true)}
        onPointerLeave={(e) => {
          if (e.clientY < (window.innerHeight || 800) - BOTTOM_EXIT_HYSTERESIS_PX) {
            setAwake(false);
          }
        }}
        onFocus={(e) => {
          if ((e.target as HTMLElement).matches?.(':focus-visible')) {
            setFocusedWithin(true);
          }
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setFocusedWithin(false);
          }
        }}
      >
        <span className="liquid-glass-sheen" aria-hidden="true" />
        <LayoutGroup id="v13-minimal-dock">
          <div className="bn-track v13-icon-track">
            {items.map(({ id, view: dest, short, Icon }) => {
              const current = selected === id;
              const label = id === 'focus' && timer ? `${ts(short)} · ${displayTime}` : ts(short);
              return (
                <button
                  type="button"
                  tabIndex={isAwake ? 0 : -1}
                  className={`bn-item v13-minimal-icon-btn ${current ? 'active' : ''}`}
                  data-tip={label}
                  aria-label={label}
                  aria-current={current ? 'page' : undefined}
                  key={id}
                  onClick={(e) => {
                    if (dest) navigate(dest, id);
                    else navigate(id);
                    if (e.detail > 0) e.currentTarget.blur();
                  }}
                >
                  {current && (
                    <motion.div
                      layoutId="v13-dock-single-orb"
                      className="v13-dock-single-orb"
                      transition={{ type: 'spring', stiffness: 460, damping: 33, mass: 0.65 }}
                    />
                  )}
                  <div className="v13-dock-icon-glyph">
                    <Icon size={20} strokeWidth={current ? 2.3 : 1.9} />
                    {id === 'focus' && timer && (
                      <i
                        className={`v13-dock-timer-dot ${
                          timer.status === 'running' ? 'is-running' : ''
                        }`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </nav>
    </div>
  );
}
