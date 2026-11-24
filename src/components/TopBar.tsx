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

  return (
    <div className="topbar clean-topbar v12-spatial-topbar">
      <div className="topbar-heading-group v9-topbar-brand-group">
        <BrandIcon
          size={32}
          variant="small-32"
          className="v9-brand-logo-mark"
        />
        <h1 className="page-heading">{title}</h1>
      </div>

      <div className="topbar-right-actions">
        <button
          type="button"
          className={`v12-motion-mode-btn ${motionMode === 'ultra' ? 'is-ultra' : ''}`}
          onClick={toggleMotionMode}
          title={
            motionMode === 'ultra'
              ? '3D Spatial Motion চালু আছে (ক্লিক করলে Calm মোড হবে)'
              : 'Calm মোড চালু আছে (ক্লিক করলে 3D Spatial Motion চালু হবে)'
          }
        >
          <HoloCube3D size={16} active={motionMode === 'ultra'} />
          <span>{motionMode === 'ultra' ? '3D Motion' : 'Calm UI'}</span>
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
  );
}
