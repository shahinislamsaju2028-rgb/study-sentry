import React from 'react';
import { Minus, Square, X, Pin, Maximize2 } from 'lucide-react';
import { desktopBridge } from '../bridge/desktopBridge';
import { useStudy } from '../context/StudyContext';
import BrandIcon from './BrandIcon';

export default function TitleBar() {
  const { pinned, togglePin, dashboardMinimized, setDashboardMinimized } = useStudy() as {
    pinned: boolean;
    togglePin: () => void;
    dashboardMinimized?: boolean;
    setDashboardMinimized?: (val: boolean) => void;
  };

  const isDesktop = desktopBridge.isDesktop;

  if (!isDesktop) {
    return (
      <header className="win-titlebar win11-titlebar clean-minimal-titlebar">
        <div className="win-titlebar-left">
          <BrandIcon size={18} variant="small-16" style={{ borderRadius: 4 }} />
          <span>Study Sentry</span>
        </div>
        <div className="desktop-window-controls">
          <button
            type="button"
            aria-label={dashboardMinimized ? 'ড্যাশবোর্ড পুনরুদ্ধার করুন' : 'ড্যাশবোর্ড মিনিমাইজ করুন (PiP সচল থাকবে)'}
            title={dashboardMinimized ? 'ড্যাশবোর্ড পুনরুদ্ধার করুন' : 'ড্যাশবোর্ড মিনিমাইজ করুন (PiP Always-On-Top সচল থাকবে)'}
            onClick={() => setDashboardMinimized?.(!dashboardMinimized)}
          >
            {dashboardMinimized ? <Maximize2 size={13} /> : <Minus size={15} />}
          </button>
        </div>
      </header>
    );
  }

  return (
    <header
      className="win-titlebar desktop-titlebar win11-titlebar clean-minimal-titlebar"
      data-tauri-drag-region
    >
      <div className="win-titlebar-left" data-tauri-drag-region>
        <BrandIcon size={18} variant="small-16" style={{ borderRadius: 4, pointerEvents: 'none' }} />
        <span data-tauri-drag-region>Study Sentry</span>
      </div>

      <div className="desktop-window-controls">
        <button
          type="button"
          className={`titlebar-pin-btn ${pinned ? 'active' : ''}`}
          aria-label={pinned ? 'Unpin Always-on-Top' : 'Pin Always-on-Top'}
          title={pinned ? 'Pinned Always-on-Top' : 'Pin Window Always-on-Top'}
          onClick={togglePin}
        >
          <Pin size={13} />
        </button>
        <button
          type="button"
          aria-label="Minimize"
          title="Minimize (PiP stays Always-On-Top)"
          onClick={() => desktopBridge.minimize()}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          aria-label="Maximize or restore"
          title="Maximize or restore"
          onClick={() => desktopBridge.maximize()}
        >
          <Square size={13} />
        </button>
        <button
          type="button"
          className="close"
          aria-label="Close to System Tray"
          title="Hide to System Tray"
          onClick={() => desktopBridge.close()}
        >
          <X size={17} />
        </button>
      </div>
    </header>
  );
}
