import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, Rocket } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import GoalOverview from '../components/GoalOverview';
import SprintView from './SprintView';

const TABS = [
  { id: 'overview', label: 'ওভারভিউ (Overview)', Icon: Sparkles },
  { id: 'sprint', label: 'স্প্রিন্ট প্ল্যানার (Sprint Planner)', Icon: Rocket },
];

export default function MotivationView() {
  const { motivationTab, setMotivationTab } = useStudy();
  const activeTab = TABS.some((item) => item.id === motivationTab) ? motivationTab : 'overview';

  // A sprint that was right-clicked in the Overview and asked to be edited.
  // The planner opens its wide editor for it once the tab is active.
  const [editSprintId, setEditSprintId] = useState(null);

  return (
    <div className="view-page overview-sprint-page v4-overview-page">
      <div className="v33-seg" role="tablist" aria-label="Overview and Sprint">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`v33-seg-tab ${activeTab === id ? 'is-active' : ''}`}
            onClick={() => setMotivationTab(id)}
          >
            <span className="v33-seg-ico">
              <Icon size={16} />
            </span>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.992 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeTab === 'sprint' ? (
            <SprintView embedded editSprintId={editSprintId} onEditHandled={() => setEditSprintId(null)} />
          ) : (
            <GoalOverview
              onOpenSprint={() => setMotivationTab('sprint')}
              onEditSprint={(sp) => {
                setEditSprintId(sp.id);
                setMotivationTab('sprint');
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
