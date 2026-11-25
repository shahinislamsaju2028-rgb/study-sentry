import React from 'react';
import { PictureInPicture2, BellRing } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { desktopBridge } from '../bridge/desktopBridge';
import BrandIcon from './BrandIcon';
import { HoloCube3D, useSpatialMotion } from './SpatialMotionEngine';
import type { StudyState } from '../types/study';

const titles: Record<string, string> = {
  home: 'Study Center',
  focus: 'Focus Session',
  study: 'Focus Session',
  todo: 'Tasks & Timeline',
  tasks: 'Tasks & Timeline',
  insights: 'Insights',
  motivation: 'Overview',
  sprint: 'Sprint Planner',
  tracker: 'Daily Tracker',
  suite: 'Student Suite',
  circle: 'Study Lounge',
  settings: 'Settings',
};

export default function TopBar() {
  const { state, view, motivationTab, isAlarm, displayTime, stopAlarm, updatePip } =
    useStudy() as {
      state: StudyState;
      view: string;
      motivationTab: string;
      isAlarm?: boolean;
      displayTime?: string;
      stopAlarm?: () => void;
      updatePip: (patch: Record<string, unknown>) => void;
    };

  const title =
    view === 'motivation' && motivationTab === 'sprint'
      ? 'Sprint Planner'
      : titles[view] || titles.home;

  const isPipOpen = Boolean(state?.pipSettings?.open !== false);
  const { mode: motionMode, toggleMode: toggleMotionMode } = useSpatialMotion();

  /* 4-2.txt ⑨ — the bar used to sit permanently on top of the app, taking
     56px of every screen for a page title and two switches you touch once a
     day. It now hides above the top edge and slides down only when the cursor
     is in the top 18px of the window (or when it has keyboard focus, or when
     the reader is on a touch device, where there is no "near the top" to
     detect and hiding would trap the controls). It floats above everything
     else so the slide never pushes the page down. */
  const [barRevealed, setBarRevealed] = React.useState(false);
  const [touchOnly, setTouchOnly] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia('(hover: none)');
    const sync = () => {
      setTouchOnly(mq.matches);
      if (mq.matches) setBarRevealed(true);
    };
    sync();
    mq.addEventListener?.('change', sync);

    /* hysteresis: reveal within 18px, hide only past 64px. Without the gap a
       pointer crossing the boundary would flicker the whole bar. */
    const onMove = (e: PointerEvent) => {
      if (mq.matches) return;
      setBarRevealed((was) => (e.clientY <= 18 ? true : e.clientY > 64 ? false : was));
    };
    const onLeave = (e: MouseEvent) => {
      if (mq.matches) return;
      const to = e.relatedTarget as Node | null;
      if (!to) setBarRevealed(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBarRevealed(false);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseout', onLeave);
    window.addEventListener('keydown', onKey);
    return () => {
      mq.removeEventListener?.('change', sync);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseout', onLeave);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  /* keyboard users get the bar back the moment focus enters it */
  const revealForFocus = (e: React.FocusEvent) => {
    if ((e.target as HTMLElement)?.closest?.('.topbar')) setBarRevealed(true);
  };

  return (
    <>
      {/* the 18px hit strip: a cursor resting here is what "at the top" means */}
      <div
        className="v51-topbar-strip"
        aria-hidden="true"
        onMouseEnter={() => setBarRevealed(true)}
      />
      <div
        className={`topbar clean-topbar v12-spatial-topbar ${
          barRevealed || touchOnly ? 'is-revealed' : ''
        }`}
        onMouseEnter={() => setBarRevealed(true)}
        onFocus={revealForFocus}
      >
      <div className="topbar-heading-group v9-topbar-brand-group">
        <BrandIcon
          size={32}
          variant="small-32"
          className="v9-brand-logo-mark"
        />
        <h1 className="page-heading">{title}</h1>
      </div>

      <div className="topbar-right-actions">
        {/* 4-2.txt ⑨ — a two-position slider instead of a button that changed
            its own label. The knob's position *is* the state: left is calm,
            right is 3D, and the labels stay put so the control never reads as
            a different control after a click. */}
        <button
          type="button"
          className={`v51-motion-slider ${motionMode === 'ultra' ? 'is-ultra' : ''}`}
          onClick={toggleMotionMode}
          role="switch"
          aria-checked={motionMode === 'ultra'}
          aria-label="3D Spatial Motion"
          title={
            motionMode === 'ultra'
              ? '3D Spatial Motion চালু আছে (ক্লিক করলে Calm মোড হবে)'
              : 'Calm মোড চালু আছে (ক্লিক করলে 3D Spatial Motion চালু হবে)'
          }
        >
          <span className="v51-motion-slider-knob" aria-hidden="true" />
          <span
            className={`v51-motion-slider-face ${motionMode !== 'ultra' ? 'is-on' : ''}`}
          >
            Calm
          </span>
          <span
            className={`v51-motion-slider-face ${motionMode === 'ultra' ? 'is-on' : ''}`}
          >
            <HoloCube3D size={13} active={motionMode === 'ultra'} />
            3D
          </span>
        </button>
        {isAlarm && (
          <button
            type="button"
            className="topbar-alarm-chip"
            onClick={() => stopAlarm?.()}
            title="অ্যালার্ম থামান"
          >
            <BellRing size={14} />
            <span>{displayTime}</span>
          </button>
        )}

        <button
          type="button"
          className={`topbar-pip ${isPipOpen ? 'active' : ''}`}
          aria-label="Floating PiP"
          title={isPipOpen ? 'Floating PiP বন্ধ করুন' : 'Floating PiP চালু করুন'}
          onClick={() => {
            const nextOpen = !Boolean(state?.pipSettings?.open);
            const curLayout = String(state?.pipSettings?.layout || 'compact');
            updatePip({
              open: nextOpen,
              layout: curLayout,
              clockStyle: 'flip',
              corner: state?.pipSettings?.corner || 'top-right',
            });
            if (desktopBridge.isDesktop) {
              desktopBridge.pipSetOpen(nextOpen, curLayout);
            }
          }}
        >
          <PictureInPicture2 size={17} />
        </button>
      </div>
    </div>
    </>
  );
}
