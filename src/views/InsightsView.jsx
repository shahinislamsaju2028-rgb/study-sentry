import PhaseInsights from '../components/PhaseInsights';
import { canonicalPhaseId, phaseForInstant } from '../utils/studyPhases';
import React, { useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { BanglaDateInput } from '../components/BanglaInputs';
import {
  Award,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Flame,
  LayoutDashboard,
  LayoutGrid,
  Sparkles,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { addDays, formatHMS, toDateKey } from '../utils/seedData';
import { activeSecondsOnDay, dateFromKey, sessionSecondsOnDay, timerIntervals } from '../utils/stats';
import { bnDate, bnNum, bnSubject } from '../utils/bangla';
import { subjectColor } from '../utils/subjectColors';
import JourneyPanel from '../components/JourneyPanel';
import JourneyBadge from '../components/JourneyBadge';
import BrandIcon from '../components/BrandIcon';
import { SpatialTiltCard } from '../components/SpatialMotionEngine';
import { PreviewSubjectIcon } from '../components/PreviewSubjectIcon';

/* v35 — subject names stay short: one to three words at most. */
const shortSubjectName = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.slice(0, 3).join(' ');
};

const PALETTE = [
  '#fbbf24',
  '#38bdf8',
  '#a78bfa',
  '#34d399',
  '#fb7185',
  '#fb923c',
  '#60a5fa',
  '#f472b6',
];

const RADAR_AXES = [
  { key: 'physics', label: 'পদার্থ', aliases: ['physics', 'পদার্থ', 'পদার্থবিজ্ঞান'], color: subjectColor('Physics') },
  { key: 'math', label: 'গণিত', aliases: ['math', 'higher math', 'mathematics', 'গণিত', 'উচ্চতর গণিত'], color: subjectColor('Math') },
  { key: 'chemistry', label: 'রসায়ন', aliases: ['chemistry', 'রসায়ন', 'রসায়ন'], color: subjectColor('Chemistry') },
  { key: 'biology', label: 'জীববিজ্ঞান', aliases: ['biology', 'জীববিজ্ঞান', 'জীব'], color: subjectColor('Biology') },
  { key: 'ict', label: 'আইসিটি', aliases: ['ict', 'ict & eng', 'ict & coding', 'আইসিটি'], color: subjectColor('ICT') },
  { key: 'english', label: 'ইংরেজি', aliases: ['english', 'ইংরেজি'], color: subjectColor('English') },
  { key: 'bangla', label: 'বাংলা', aliases: ['bangla', 'bengali', 'বাংলা'], color: subjectColor('Bangla') },
];

const WEEKDAY_HEADERS_MON_FIRST = ['সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি', 'রবি'];

const readable = (seconds) => {
  const n = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  if (n > 0 && n < 60) return `${bnNum(n)} সে.`;
  if (h > 0) return m > 0 ? `${bnNum(h)} ঘ. ${bnNum(m)} মি.` : `${bnNum(h)} ঘণ্টা`;
  return `${bnNum(m)} মি.`;
};

const compactHM = (seconds) => {
  const n = Math.max(0, Math.floor(seconds || 0));
  if (n <= 0) return '—';
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  if (h > 0) return m > 0 ? `${bnNum(h)}h ${bnNum(m)}m` : `${bnNum(h)}h`;
  return `${bnNum(Math.max(1, m))}m`;
};

const chartTime = (seconds) => {
  const n = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  if (h > 0) return `${bnNum(h)}h${m ? ` ${bnNum(m)}m` : ''}`;
  if (n > 0 && n < 60) return `${bnNum(n)}s`;
  return `${bnNum(m)}m`;
};

function formatClock12h(isoOrMs) {
  if (!isoOrMs) return '—';
  const d = new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return '—';
  const dhakaMs = d.getTime() + 6 * 3600000;
  const x = new Date(dhakaMs);
  const h24 = x.getUTCHours();
  const min = x.getUTCMinutes();
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${suffix}`;
}

function resolveHeatmapLevel(sec, goalSec) {
  if (!sec || sec <= 0) return 0;
  const g = Math.max(5400, Number(goalSec) || 9000);
  const ratio = sec / g;
  if (ratio < 0.25) return 1;
  if (ratio < 0.55) return 2;
  if (ratio < 0.9) return 3;
  return 4;
}

function buildSmoothCurve(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;

    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    cp1y = Math.max(minY, Math.min(maxY, cp1y));
    cp2y = Math.max(minY, Math.min(maxY, cp2y));

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Clean, Friendly Subject Donut + List (Zero Clutter)
 */
const CleanSubjectBreakdown = React.memo(function CleanSubjectBreakdown({ items }) {
  const [hoveredId, setHoveredId] = useState(null);
  const sum = Math.max(1, items.reduce((n, x) => n + x.seconds, 0));
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const gap = items.length > 1 ? 5 : 0;

  let cumulative = 0;
  const segments = items.map((s, i) => {
    const color = subjectColor(s.name || s.subject || s.label || "Class");
    const rawLen = (s.seconds / sum) * circumference;
    const drawLen = Math.max(2, rawLen - gap);
    const startOffset = cumulative;
    cumulative += rawLen;
    return {
      ...s,
      color,
      drawLen,
      startOffset,
      pct: Math.round((s.seconds / sum) * 100),
      gradId: `v31seg-${String(s.id).replace(/[^a-zA-Z0-9_-]/g, '')}`,
    };
  });

  const activeItem = segments.find((s) => s.id === hoveredId) || null;

  /* v35 — subjects are laid out as OPTIONS around the donut:
     two or three chips on the left, three on the right and one along the
     bottom edge.  The plain ranked text rows are gone. */
  const layout = useMemo(() => {
    const n = segments.length;
    if (!n) return { left: [], right: [], bottom: [] };
    if (n <= 2) return { left: [], right: segments, bottom: [] };
    if (n <= 2) return { left: segments.slice(0, 1), right: segments.slice(1), bottom: [] };
    if (n <= 4) return { left: segments.slice(0, 2), right: segments.slice(2), bottom: [] };
    const leftCount = Math.min(3, n - 4);
    return {
      left: segments.slice(0, leftCount),
      right: segments.slice(leftCount, n - 1),
      bottom: segments.slice(n - 1),
    };
  }, [segments]);

  const renderChip = (seg, variant) => (
    <button
      type="button"
      key={seg.id}
      className={`v35-subj-chip v35-subj-chip-${variant} ${
        hoveredId === seg.id ? 'is-hovered' : ''
      }`}
      style={{ '--seg': seg.color }}
      onMouseEnter={() => setHoveredId(seg.id)}
      onMouseLeave={() => setHoveredId(null)}
      onFocus={() => setHoveredId(seg.id)}
      onBlur={() => setHoveredId(null)}
      aria-label={`${shortSubjectName(seg.name)} - ${readable(seg.seconds)} - ${bnNum(seg.pct)}%`}
    >
      <span className="v35-subj-chip-ico" aria-hidden="true">
        <PreviewSubjectIcon subject={{ id: seg.id, name: seg.name }} size={16} />
      </span>
      <span className="v35-subj-chip-copy">
        <strong>{shortSubjectName(bnSubject(seg.name))}</strong>
        <small>
          {readable(seg.seconds)} <i /> {bnNum(seg.pct)}%
        </small>
        <span className="v35-subj-chip-track" aria-hidden="true">
          <i style={{ width: `${Math.max(4, seg.pct)}%` }} />
        </span>
      </span>
    </button>
  );

  return (
    <div className="v11-subj-donut-layout v31-subj-layout v35-subj-options">
      <div className="v35-subj-col v35-subj-col-left">
        {layout.left.map((seg) => renderChip(seg, 'left'))}
      </div>

      <div className="v11-donut-ring-box v12-3d-donut-stage v31-donut-stage v35-subj-donut">
        <svg
          viewBox="0 0 168 168"
          className="v12-3d-donut-svg v31-donut-svg"
          role="img"
          aria-label="বিষয়ভিত্তিক ডোনাট চার্ট"
        >
          <defs>
            {segments.map((seg) => (
              <linearGradient key={seg.id} id={seg.gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={seg.color} />
                <stop offset="100%" stopColor={seg.color} stopOpacity="0.6" />
              </linearGradient>
            ))}
          </defs>

          {/* Soft extruded base for depth */}
          <circle cx="84" cy="90" r={radius} fill="none" stroke="rgba(0,0,0,0.42)" strokeWidth="17" />
          <circle cx="84" cy="84" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" />

          {segments.map((seg) => {
            const isHovered = hoveredId === seg.id;
            return (
              <circle
                key={seg.id}
                cx="84"
                cy="84"
                r={radius}
                fill="none"
                stroke={`url(#${seg.gradId})`}
                strokeWidth={isHovered ? 20 : 16}
                strokeLinecap="round"
                strokeDasharray={`${seg.drawLen} ${Math.max(0, circumference - seg.drawLen)}`}
                strokeDashoffset={-seg.startOffset}
                transform="rotate(-90 84 84)"
                onMouseEnter={() => setHoveredId(seg.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  cursor: 'pointer',
                  opacity: hoveredId && !isHovered ? 0.34 : 1,
                  transition: 'stroke-width 180ms ease, opacity 180ms ease',
                }}
              />
            );
          })}
        </svg>

        <div className="v11-donut-center-label v31-donut-center">
          {activeItem ? (
            <>
              <span className="v31-dc-name" style={{ color: activeItem.color }}>
                {shortSubjectName(bnSubject(activeItem.name))}
              </span>
              <strong className="v31-dc-pct" style={{ color: activeItem.color }}>
                {bnNum(activeItem.pct)}%
              </strong>
              <small className="v31-dc-time">{compactHM(activeItem.seconds)}</small>
            </>
          ) : (
            <>
              <span className="v31-dc-name">মোট সময়</span>
              <strong className="v31-dc-pct">{compactHM(sum)}</strong>
              <small className="v31-dc-time">{bnNum(items.length)}টি বিষয়</small>
            </>
          )}
        </div>
      </div>

      <div className="v35-subj-col v35-subj-col-right">
        {layout.right.map((seg) => renderChip(seg, 'right'))}
      </div>

      <div className="v35-subj-bottom">
        {layout.bottom.map((seg) => renderChip(seg, 'bottom'))}
      </div>

      {/* v48 — the space under the donut used to be dead. It now carries a
          compact ranked strip: order, share, and a proportional 3D bar. */}
      <div className="v48-subj-rank" aria-label="বিষয়ভিত্তিক র‌্যাংকিং">
        {[...segments]
          .sort((a, b) => b.seconds - a.seconds)
          .map((seg, i) => (
            <div
              key={seg.id}
              className={`v48-rank-row ${hoveredId === seg.id ? 'is-hot' : ''}`}
              style={{ '--seg': seg.color }}
              onMouseEnter={() => setHoveredId(seg.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span className="v48-rank-n">{bnNum(i + 1)}</span>
              <span className="v48-rank-dot" aria-hidden="true" />
              <strong className="v48-rank-name">{shortSubjectName(bnSubject(seg.name))}</strong>
              <span className="v48-rank-bar" aria-hidden="true">
                <i style={{ width: `${Math.max(4, seg.pct)}%` }} />
              </span>
              <span className="v48-rank-time">{compactHM(seg.seconds)}</span>
              <b className="v48-rank-pct">{bnNum(seg.pct)}%</b>
            </div>
          ))}
      </div>
    </div>
  );
});

/**
 * True 3D Isometric Extruded Crystal/Gold Bar & Spline Graph
 */
const CleanWeeklyChart = React.memo(function CleanWeeklyChart({
  dates,
  values,
  dailyGoalSec,
  selectedDate,
  onSelect,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const maxVal = Math.max(...values, dailyGoalSec || 3600, 3600);
  const scale = Math.ceil(maxVal / 1800) * 1800;
  const ticks = [scale, scale * 0.5, 0];

  const W = 612;
  const H = 192;
  const PAD_X = 44;
  const PAD_TOP = 28;
  const PAD_BOT = 18;
  const usableW = W - PAD_X * 2;
  const usableH = H - PAD_TOP - PAD_BOT;
  const bottomY = PAD_TOP + usableH;
  const barWidth = 26;
  // 3D Isometric Depth Vector (dx, -dy)
  const DX = 10;
  const DY = 8;

  const coords = useMemo(
    () =>
      values.map((v, i) => {
        const x = PAD_X + (usableW / Math.max(1, values.length - 1)) * i;
        const ratio = Math.min(1, Math.max(0, v / scale));
        const y = PAD_TOP + usableH * (1 - ratio);
        const barH = v > 0 ? Math.max(8, usableH * ratio) : 0;
        return { x, y, v, ratio, barH };
      }),
    [values, scale, usableW, usableH]
  );

  const splineCoords = useMemo(
    () => coords.map((c) => ({ x: c.x + DX * 0.45, y: c.y - DY * 0.7 })),
    [coords]
  );
  const linePath = useMemo(() => buildSmoothCurve(splineCoords), [splineCoords]);

  const goalY =
    dailyGoalSec > 0 && dailyGoalSec <= scale
      ? PAD_TOP + usableH * (1 - dailyGoalSec / scale)
      : null;

  const selectedIdx = dates.findIndex((d) => toDateKey(d) === selectedDate);
  const activeIdx = hoverIdx !== null ? hoverIdx : selectedIdx >= 0 ? selectedIdx : coords.length - 1;

  return (
    <div className="v11-weekly-chart-wrap v12-3d-bar-stage">
      <div className="v11-weekly-svg-grid">
        <div className="v11-weekly-y-axis" aria-hidden="true">
          {ticks.map((tVal, idx) => (
            <span key={idx}>{chartTime(tVal)}</span>
          ))}
        </div>

        <div className="v11-weekly-stage">
          <svg viewBox={`0 0 ${W} ${H}`} className="v11-weekly-svg v12-3d-weekly-svg">
            <defs>
              {/* Front Sunlit Face */}
              <linearGradient id="v12FrontGold" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#78350f" stopOpacity="0.88" />
                <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#fde68a" stopOpacity="1" />
              </linearGradient>
              {/* Top Bevel Highlight Cap */}
              <linearGradient id="v12TopCapGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef9c3" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              {/* Right Extruded 3D Side Wall */}
              <linearGradient id="v12SideWallGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#451a03" stopOpacity="0.92" />
              </linearGradient>
              {/* Active Cyan-Gold Highlight Front */}
              <linearGradient id="v12FrontActive" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#0369a1" stopOpacity="0.92" />
                <stop offset="52%" stopColor="#38bdf8" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="v12SideActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#082f49" />
              </linearGradient>
            </defs>

            {/* 3D Isometric Perspective Floor Platform */}
            <polygon
              points={`${PAD_X - 24},${bottomY} ${PAD_X - 24 + DX},${bottomY - DY} ${W - PAD_X + 24 + DX},${bottomY - DY} ${W - PAD_X + 24},${bottomY}`}
              fill="rgba(56, 189, 248, 0.055)"
              stroke="rgba(255, 255, 255, 0.09)"
              strokeWidth="1"
            />

            {[0, 0.5, 1].map((step, idx) => {
              const gy = PAD_TOP + usableH * step;
              return (
                <line
                  key={idx}
                  x1={PAD_X - 16 + DX}
                  y1={gy - DY}
                  x2={W - PAD_X + 18 + DX}
                  y2={gy - DY}
                  stroke="rgba(255,255,255,0.065)"
                  strokeDasharray={step === 1 ? undefined : '4 6'}
                />
              );
            })}

            {goalY !== null && (
              <line
                x1={PAD_X - 16}
                y1={goalY}
                x2={W - PAD_X + 20 + DX}
                y2={goalY - DY}
                stroke="#38bdf8"
                strokeOpacity="0.5"
                strokeWidth="1.3"
                strokeDasharray="6 5"
              />
            )}

            {/* True 3D Extruded Isometric Columns */}
            {coords.map((pt, i) => {
              const isActive = i === activeIdx;
              const lift = isActive ? 4 : 0;
              const x0 = pt.x - barWidth / 2;
              const x1 = pt.x + barWidth / 2;
              const topY = bottomY - pt.barH - lift;
              const baseB = bottomY - lift;

              return (
                <g
                  key={`wb3d-${i}`}
                  style={{ transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1)' }}
                >
                  {/* Empty 3D Pedestal Slot */}
                  <polygon
                    points={`${x0},${bottomY} ${x0 + DX},${bottomY - DY} ${x1 + DX},${bottomY - DY} ${x1},${bottomY}`}
                    fill="rgba(255,255,255,0.05)"
                  />

                  {pt.barH > 0 && (
                    <motion.g
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.42,
                        delay: i * 0.045,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      {/* Ground Glow Shadow */}
                      <ellipse
                        cx={pt.x + 3}
                        cy={bottomY + 2}
                        rx={barWidth * 0.65}
                        ry="4"
                        fill={isActive ? 'rgba(56,189,248,0.34)' : 'rgba(251,191,36,0.22)'}
                      />

                      {/* 1. Front 3D Prism Face */}
                      <rect
                        x={x0}
                        y={topY}
                        width={barWidth}
                        height={pt.barH}
                        rx="2"
                        fill={isActive ? 'url(#v12FrontActive)' : 'url(#v12FrontGold)'}
                      />

                      {/* 2. Right 3D Extruded Depth Wall */}
                      <polygon
                        points={`${x1},${topY} ${x1 + DX},${topY - DY} ${x1 + DX},${baseB - DY} ${x1},${baseB}`}
                        fill={isActive ? 'url(#v12SideActive)' : 'url(#v12SideWallGold)'}
                      />

                      {/* 3. Top Sunlit 3D Bevel Cap */}
                      <polygon
                        points={`${x0},${topY} ${x0 + DX},${topY - DY} ${x1 + DX},${topY - DY} ${x1},${topY}`}
                        fill="url(#v12TopCapGold)"
                      />
                    </motion.g>
                  )}
                </g>
              );
            })}

            {/* Floating 3D Ribbon Curve Above Columns */}
            <path
              d={linePath}
              fill="none"
              stroke="rgba(253, 230, 138, 0.92)"
              strokeWidth="2.3"
              strokeLinecap="round"
            />

            {/* Interactive Hit Zones + 3D Floating Readout */}
            {coords.map((pt, i) => {
              const key = toDateKey(dates[i]);
              const active = i === activeIdx;
              const colW = usableW / Math.max(1, coords.length - 1);
              const sx = splineCoords[i].x;
              const sy = splineCoords[i].y - (active ? 4 : 0);
              return (
                <g
                  key={key}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onClick={() => onSelect(key)}
                >
                  <rect x={pt.x - colW / 2} y={0} width={colW} height={H} fill="transparent" />
                  <circle
                    cx={sx}
                    cy={sy}
                    r={active ? 5 : 3.5}
                    fill={active ? '#ffffff' : '#0b0e17'}
                    stroke={active ? '#38bdf8' : '#fde68a'}
                    strokeWidth="2.2"
                  />
                  {active && (
                    <g transform={`translate(${sx}, ${Math.max(15, sy - 14)})`}>
                      <rect
                        x="-30"
                        y="-13"
                        width="60"
                        height="19"
                        rx="6"
                        fill="rgba(9, 13, 24, 0.96)"
                        stroke="rgba(56, 189, 248, 0.72)"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10.5"
                        fontWeight="700"
                      >
                        {chartTime(pt.v)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          <div className="v11-weekly-day-pills">
            {dates.map((d, i) => {
              const key = toDateKey(d);
              const isSelected = key === selectedDate;
              return (
                <button
                  type="button"
                  key={key}
                  className={`v11-wday-pill ${isSelected ? 'is-selected' : ''}`}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onClick={() => onSelect(key)}
                >
                  <strong>{bnDate(d, { weekday: 'short' })}</strong>
                  <small>{bnNum(d.getDate())}</small>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * THE SINGLE Focus Heatmap Card (Appears ONLY ONCE — Clean & Friendly!)
 */
const SingleFocusHeatmapCard = React.memo(function SingleFocusHeatmapCard({
  todayKey,
  dayTotalsMap,
  dailyGoalSec,
  selectedDate,
  onSelectDate,
}) {
  const [hoveredCell, setHoveredCell] = useState(null);

  const { cols, activeCount } = useMemo(() => {
    const todayDate = dateFromKey(todayKey);
    const weeks = [];
    let count = 0;
    for (let w = 15; w >= 0; w--) {
      const col = [];
      for (let r = 0; r < 7; r++) {
        const offset = -(w * 7 + (6 - r));
        const d = addDays(todayDate, offset);
        const key = toDateKey(d);
        const sec = dayTotalsMap.get(key) || 0;
        if (sec > 0) count += 1;
        col.push({ date: d, key, sec, level: resolveHeatmapLevel(sec, dailyGoalSec) });
      }
      weeks.push(col);
    }
    return { cols: weeks, activeCount: count };
  }, [todayKey, dayTotalsMap, dailyGoalSec]);

  return (
    <SpatialTiltCard maxTilt={3.8} delayIndex={3} className="card v11-single-heatmap-card v12-3d-voxel-heatmap-card" ariaLabel="ফোকাস হিটম্যাপ">
      <div className="v11-card-head">
        <div className="v11-card-title">
          <LayoutGrid size={18} className="v11-ico-gold" />
          <div>
            <h2>৩ডি ফোকাস হিটম্যাপ</h2>
            <small>গত ১৬ সপ্তাহের পড়াশোনার ধারাবাহিকতা ({bnNum(activeCount)} দিন সক্রিয়)</small>
          </div>
        </div>
      </div>

      <div className="v10-hm-inline-matrix v12-3d-voxel-matrix" role="grid">
        {cols.map((col, cIdx) => (
          <div key={`shm-${cIdx}`} className="v10-hm-inline-col">
            {col.map((cell) => (
              <button
                key={cell.key}
                type="button"
                className={`v9-hm-tile v10-hm-inline-tile v12-voxel-tile lvl-${cell.level} ${
                  cell.key === selectedDate ? 'is-selected' : ''
                } ${cell.key === todayKey ? 'is-today' : ''}`}
                onMouseEnter={() => setHoveredCell(cell)}
                onMouseLeave={() => setHoveredCell(null)}
                onClick={() => onSelectDate(cell.key)}
                title={`${bnDate(cell.date, { day: 'numeric', month: 'short' })} · ${readable(cell.sec)}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="v9-hm-footer v10-hm-tight-foot">
        <div className="v9-hm-hover-readout">
          {hoveredCell ? (
            <>
              <strong>
                {bnDate(hoveredCell.date, { weekday: 'short', day: 'numeric', month: 'short' })}
              </strong>
              <span>· {hoveredCell.sec > 0 ? readable(hoveredCell.sec) : 'পড়া হয়নি'}</span>
            </>
          ) : (
            <span>যেকোনো ঘরে ক্লিক করলে সেদিনের হিসাব বাম পাশে দেখবেন</span>
          )}
        </div>

        <div className="v9-hm-legend" aria-hidden="true">
          <span>কম</span>
          <i className="v9-hm-leg-dot lvl-0" />
          <i className="v9-hm-leg-dot lvl-1" />
          <i className="v9-hm-leg-dot lvl-2" />
          <i className="v9-hm-leg-dot lvl-3" />
          <i className="v9-hm-leg-dot lvl-4" />
          <span>বেশি</span>
        </div>
      </div>
    </SpatialTiltCard>
  );
});

/**
 * Friendly Subject Balance Radar (Clean Spider Chart + Actionable Student Tip)
 */
const FriendlySubjectRadarCard = React.memo(function FriendlySubjectRadarCard({
  subjects,
  sessions,
}) {
  const [hoverAxisIdx, setHoverAxisIdx] = useState(null);

  const radarData = useMemo(() => {
    const totals = new Map(RADAR_AXES.map((a) => [a.key, 0]));
    const subjById = new Map((subjects || []).map((s) => [s.id, s.name || '']));

    for (const s of sessions || []) {
      const sec = Math.max(0, Number(s.durationSec) || 0);
      if (sec <= 0) continue;
      const rawName = String(s.subjectName || subjById.get(s.subjectId) || '').trim().toLowerCase();
      const matched = RADAR_AXES.find((ax) => ax.aliases.includes(rawName));
      if (matched) {
        totals.set(matched.key, (totals.get(matched.key) || 0) + sec);
      }
    }

    const rawValues = RADAR_AXES.map((ax) => ({
      ...ax,
      sec: totals.get(ax.key) || 0,
    }));
    const maxSec = Math.max(3600, ...rawValues.map((x) => x.sec));
    const sortedAsc = [...rawValues].sort((a, b) => a.sec - b.sec);
    const weakest = sortedAsc[0];
    const strongest = sortedAsc[sortedAsc.length - 1];

    const CX = 160;
    const CY = 154;
    const R = 106;
    const count = rawValues.length;

    const points = rawValues.map((item, idx) => {
      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / count;
      const norm = item.sec > 0 ? Math.max(0.15, Math.min(1, item.sec / maxSec)) : 0.08;
      return {
        ...item,
        angle,
        x: CX + Math.cos(angle) * R * norm,
        y: CY + Math.sin(angle) * R * norm,
        outerX: CX + Math.cos(angle) * R,
        outerY: CY + Math.sin(angle) * R,
        labelX: CX + Math.cos(angle) * (R + 26),
        labelY: CY + Math.sin(angle) * (R + 22),
      };
    });

    const rings = [0.25, 0.5, 0.75, 1].map((lv) =>
      points
        .map((p) => `${(CX + Math.cos(p.angle) * R * lv).toFixed(1)},${(CY + Math.sin(p.angle) * R * lv).toFixed(1)}`)
        .join(' ')
    );

    const dataPolygon = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return { CX, CY, points, rings, dataPolygon, weakest, strongest };
  }, [subjects, sessions]);

  return (
    <SpatialTiltCard maxTilt={4.5} delayIndex={1} className="card v11-radar-friendly-card" ariaLabel="বিষয় ভারসাম্য রাডার">
      <div className="v11-card-head">
        <div className="v11-card-title">
          <Compass size={19} className="v11-ico-gold" />
          <div>
            <h2>৩ডি বিষয় ভারসাম্য চার্ট</h2>
            <small>কোন বিষয়ে বেশি ও কোন বিষয়ে কম সময় দেওয়া হচ্ছে এক নজরে দেখুন</small>
          </div>
        </div>
      </div>

      <div className="v10-radar-svg-wrap v12-3d-radar-stage">
        <svg viewBox="0 0 320 308" className="v10-radar-svg" role="img" aria-label="Subject Balance Radar">
          <defs>
            <linearGradient id="v11RadarFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.34" />
            </linearGradient>
            <linearGradient id="v11RadarStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {radarData.rings.map((pts, idx) => (
            <polygon
              key={`r-${idx}`}
              points={pts}
              fill="none"
              stroke="rgba(255,255,255,0.09)"
              strokeWidth="1"
              strokeDasharray={idx < 3 ? '3 3' : undefined}
            />
          ))}

          {radarData.points.map((p) => (
            <line
              key={`sp-${p.key}`}
              x1={radarData.CX}
              y1={radarData.CY}
              x2={p.outerX}
              y2={p.outerY}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          ))}

          <polygon
            points={radarData.dataPolygon}
            fill="url(#v11RadarFill)"
            stroke="url(#v11RadarStroke)"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {radarData.points.map((p, idx) => {
            const hovered = hoverAxisIdx === idx;
            return (
              <g
                key={p.key}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverAxisIdx(idx)}
                onMouseLeave={() => setHoverAxisIdx(null)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hovered ? 5.2 : 4}
                  fill="#0b101d"
                  stroke={hovered ? '#ffffff' : '#fbbf24'}
                  strokeWidth="2.2"
                />
                <text
                  x={p.labelX}
                  y={p.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={hovered ? '#ffffff' : '#cbd5e1'}
                  fontSize="11.5"
                  fontWeight={hovered ? '700' : '600'}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="v10-radar-Readout-grid">
        {radarData.points.map((p, idx) => (
          <div
            key={p.key}
            className={`v10-radar-mini-chip ${hoverAxisIdx === idx ? 'is-hovered' : ''}`}
            onMouseEnter={() => setHoverAxisIdx(idx)}
            onMouseLeave={() => setHoverAxisIdx(null)}
          >
            <i style={{ background: p.color }} />
            <span>{p.label}</span>
            <strong>{compactHM(p.sec)}</strong>
          </div>
        ))}
      </div>

      {radarData.strongest?.sec > 0 && radarData.weakest && (
        <div className="v11-friendly-tip-banner">
          <Sparkles size={15} className="v11-ico-gold" />
          <span>
            সবচেয়ে এগিয়ে <strong>{radarData.strongest.label}</strong> ({readable(radarData.strongest.sec)}) — সুষম প্রস্তুতির জন্য পরবর্তী সেশনে{' '}
            <strong>{radarData.weakest.label}</strong>-এ একটু বাড়তি সময় দিন।
          </span>
        </div>
      )}
    </SpatialTiltCard>
  );
});

export default function InsightsView() {
  const {
    state,
    timer,
    now,
    todayKey,
    rank,
    nextRank,
    xpPercent,
    streak,
    elapsedSec,
    totalSec,
    phaseMode,
    activePhases,
  } = useStudy();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'monthly' | 'balance'
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const date = useMemo(() => dateFromKey(selectedDate), [selectedDate]);
  const [viewMonth, setViewMonth] = useState(() => ({
    year: date.getFullYear(),
    month: date.getMonth(),
  }));

  const dailyGoalSec = Math.max(1800, (Number(state.profile.dailyGoalMin) || 240) * 60);

  // Single O(N) Precomputed Session & Day Totals Cache
  const { dayTotalsMap, sessionsByDayMap } = useMemo(() => {
    const totals = new Map();
    const byDay = new Map();
    for (const s of state.sessions || []) {
      const dk = s.dateKey || (s.startedAt ? toDateKey(new Date(s.startedAt)) : '');
      if (!dk) continue;
      const sec = sessionSecondsOnDay(s, dk);
      if (sec <= 0) continue;
      totals.set(dk, (totals.get(dk) || 0) + sec);
      const arr = byDay.get(dk);
      if (arr) arr.push(s);
      else byDay.set(dk, [s]);
    }
    if (timer && timer.phase !== 'break') {
      const liveToday = activeSecondsOnDay(timer, todayKey, now);
      if (liveToday > 0) {
        totals.set(todayKey, (totals.get(todayKey) || 0) + liveToday);
      }
    }
    return { dayTotalsMap: totals, sessionsByDayMap: byDay };
  }, [state.sessions, timer, todayKey, now]);

  const sessions = sessionsByDayMap.get(selectedDate) || [];
  const total = dayTotalsMap.get(selectedDate) || 0;

  const weekly = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(date, i - 6)),
    [date]
  );
  const values = useMemo(
    () => weekly.map((d) => dayTotalsMap.get(toDateKey(d)) || 0),
    [weekly, dayTotalsMap]
  );
  const weeklyTotal = useMemo(() => values.reduce((a, b) => a + b, 0), [values]);
  const bestValue = Math.max(0, ...values);
  const bestIndex = values.indexOf(bestValue);

  const subjectTotals = useMemo(() => {
    const subjectMap = new Map();
    const catalog = new Map(state.subjects.map((s) => [s.id, s]));
    const add = (id, name, seconds) => {
      if (seconds <= 0) return;
      const key = id || '__unassigned__';
      const meta = catalog.get(id) || { id: key, name: name || 'General' };
      const old = subjectMap.get(key);
      subjectMap.set(key, { ...meta, id: key, seconds: (old?.seconds || 0) + seconds });
    };
    sessions.forEach((s) => add(s.subjectId, s.subjectName, sessionSecondsOnDay(s, selectedDate)));
    if (timer?.phase !== 'break') {
      add(timer?.subjectId, timer?.subjectName, activeSecondsOnDay(timer, selectedDate, now));
    }
    return [...subjectMap.values()].sort((a, b) => b.seconds - a.seconds);
  }, [sessions, state.subjects, selectedDate, timer, now]);

  const dayMeta = useMemo(() => {
    const sorted = sessions
      .slice()
      .sort((a, b) => new Date(a.startedAt || 0).getTime() - new Date(b.startedAt || 0).getTime());
    let firstMs = null;
    let lastMs = null;
    for (const s of sorted) {
      const sec = sessionSecondsOnDay(s, selectedDate);
      if (sec <= 0) continue;
      const st = s.startedAt ? new Date(s.startedAt).getTime() : NaN;
      const en = s.endedAt ? new Date(s.endedAt).getTime() : !Number.isNaN(st) ? st + sec * 1000 : NaN;
      if (!Number.isNaN(st) && (firstMs === null || st < firstMs)) firstMs = st;
      if (!Number.isNaN(en) && (lastMs === null || en > lastMs)) lastMs = en;
    }

    // Equal-sized phase timeline box adapted to user's selected 4 or 5 study phases.
    // Each phase gets an IDENTICAL width compartment, while studied intervals inside each
    // compartment appear at their exact start position (e.g. 6:00 AM near the start of ভোর)
    // and stretch proportionally to how long the user studied (a small dot/box for short study,
    // a longer luminous box for extended focus).
    const PHASE_WINDOWS = {
      dawn: { start: 330, end: 600, span: 270, shortWin: '5:30–10:00' },
      morning: { start: 601, end: 840, span: 240, shortWin: '10:01–2:00' },
      noon: { start: 841, end: 1080, span: 240, shortWin: '2:01–6:00' },
      night: { start: 1081, end: 1320, span: 240, shortWin: '6:01–10:00' },
      late_night: { start: 1321, end: 1560, span: 240, shortWin: '10:01–2:00' },
    };

    const dhakaClockFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const toDhakaMin = (ms) => {
      const parts = dhakaClockFmt.formatToParts(new Date(ms));
      const h = Number(parts.find((x) => x.type === 'hour')?.value || 0);
      const m = Number(parts.find((x) => x.type === 'minute')?.value || 0);
      return h * 60 + m;
    };

    const dayStartMs = new Date(`${selectedDate}T00:00:00+06:00`).getTime();
    const dayEndMs = dayStartMs + 86400000;

    const totals = {};
    const blocks = {};
    for (const p of activePhases || []) {
      totals[p.id] = 0;
      blocks[p.id] = [];
    }
    let outside = 0;

    const toEpochMs = (v) =>
      typeof v === 'number' ? v : v ? new Date(v).getTime() : NaN;

    const plotInterval = (rawStartMs, rawEndMs, explicitPhaseId, subjName, isLive = false) => {
      const a = Math.max(dayStartMs, toEpochMs(rawStartMs));
      const b = Math.min(dayEndMs, toEpochMs(rawEndMs));
      if (!Number.isFinite(a) || !Number.isFinite(b) || !(b > a)) return;
      const durSec = Math.round((b - a) / 1000);
      if (durSec <= 0) return;

      const sMin = (a - dayStartMs) / 60000;
      const eMin = (b - dayStartMs) / 60000;
      const chosen = canonicalPhaseId(explicitPhaseId);
      let matchedSec = 0;

      // Clip actual studied interval against each active phase's real clock window
      for (const p of activePhases || []) {
        const win = PHASE_WINDOWS[p.id];
        if (!win) continue;

        // late_night spans 22:01–24:00 (1321–1440) AND 00:00–02:00 (0–120 -> 1440–1560)
        const subRanges =
          p.id === 'late_night'
            ? [
                { from: 1320, to: 1440, offsetBase: 1320 },
                { from: 0, to: 120, offsetBase: -120 },
              ]
            : [{ from: win.start === 330 ? 330 : win.start - 1, to: win.end, offsetBase: win.start === 330 ? 330 : win.start - 1 }];

        for (const sr of subRanges) {
          const ovStart = Math.max(sMin, sr.from);
          const ovEnd = Math.min(eMin, sr.to);
          if (ovEnd > ovStart) {
            const partMin = ovEnd - ovStart;
            const partSec = Math.round(partMin * 60);
            matchedSec += partSec;
            totals[p.id] += partSec;

            const relStartMin =
              p.id === 'late_night' && sr.from === 0
                ? 120 + ovStart
                : ovStart - sr.offsetBase;
            const rawLeft = Math.max(0, Math.min(94, (relStartMin / win.span) * 100));
            const rawWidth = Math.max(6, Math.min(100 - rawLeft, (partMin / win.span) * 100));
            const labelStartMs = dayStartMs + ovStart * 60000;
            const labelEndMs = dayStartMs + ovEnd * 60000;

            blocks[p.id].push({
              leftPct: Number(rawLeft.toFixed(2)),
              widthPct: Number(rawWidth.toFixed(2)),
              isDot: partMin <= 14,
              isLive,
              sec: partSec,
              tip: `${bnSubject(subjName || 'Focus')} · ${formatClock12h(labelStartMs)} – ${formatClock12h(labelEndMs)} (${readable(partSec)})`,
            });
          }
        }
      }

      // If recorded outside standard windows, honor explicit chosen phase if active
      const leftover = Math.max(0, durSec - matchedSec);
      if (leftover > 0) {
        if (chosen && Object.prototype.hasOwnProperty.call(totals, chosen)) {
          const win = PHASE_WINDOWS[chosen] || { span: 240 };
          totals[chosen] += leftover;
          const usedPct = blocks[chosen].reduce((s, x) => Math.max(s, x.leftPct + x.widthPct), 0);
          const leftPct = Math.min(88, usedPct > 0 ? usedPct + 2 : (toDhakaMin(a) % 60));
          const partMin = leftover / 60;
          const widthPct = Math.max(7, Math.min(100 - leftPct, (partMin / win.span) * 100));
          blocks[chosen].push({
            leftPct: Number(leftPct.toFixed(2)),
            widthPct: Number(widthPct.toFixed(2)),
            isDot: partMin <= 14,
            isLive,
            sec: leftover,
            tip: `${bnSubject(subjName || 'Focus')} · ${formatClock12h(a)} (${readable(leftover)})`,
          });
        } else {
          outside += leftover;
        }
      }
    };

    for (const session of sorted) {
      const sec = sessionSecondsOnDay(session, selectedDate);
      if (sec <= 0) continue;
      if (Array.isArray(session.segments) && session.segments.length > 0) {
        for (const seg of session.segments) {
          const sa = Array.isArray(seg) ? seg[0] : seg?.start;
          const sb = Array.isArray(seg) ? seg[1] : seg?.end;
          if (sa && sb) {
            plotInterval(sa, sb, session.focusMeta?.phaseId, session.subjectName, false);
          }
        }
      } else {
        const st = session.startedAt ? new Date(session.startedAt).getTime() : NaN;
        const durMs = (Number(session.durationSec) || sec) * 1000;
        const en = session.endedAt
          ? new Date(session.endedAt).getTime()
          : !Number.isNaN(st)
          ? st + durMs
          : NaN;
        if (!Number.isNaN(st) && !Number.isNaN(en) && en > st) {
          plotInterval(st, Math.min(en, st + durMs), session.focusMeta?.phaseId, session.subjectName, false);
        } else {
          const chosen = canonicalPhaseId(session.focusMeta?.phaseId);
          const phase =
            chosen && Object.prototype.hasOwnProperty.call(totals, chosen)
              ? chosen
              : activePhases?.[0]?.id;
          if (phase && Object.prototype.hasOwnProperty.call(totals, phase)) {
            totals[phase] += sec;
            const win = PHASE_WINDOWS[phase] || { span: 240 };
            const w = Math.max(7, Math.min(100, (sec / 60 / win.span) * 100));
            blocks[phase].push({
              leftPct: 4,
              widthPct: Number(w.toFixed(2)),
              isDot: sec <= 840,
              isLive: false,
              sec,
              tip: `${bnSubject(session.subjectName || 'Focus')} · ${readable(sec)}`,
            });
          } else {
            outside += sec;
          }
        }
      }
    }

    if (timer?.phase !== 'break') {
      const liveSegs = timerIntervals(timer, now);
      if (Array.isArray(liveSegs) && liveSegs.length > 0) {
        for (const seg of liveSegs) {
          const sa = Array.isArray(seg) ? seg[0] : seg?.start;
          const sb = Array.isArray(seg) ? seg[1] : seg?.end;
          if (sa && sb) {
            plotInterval(sa, sb, timer?.focusMeta?.phaseId, timer?.subjectName, true);
          }
        }
      }
    }

    return {
      firstStarted: formatClock12h(firstMs),
      lastFinished: formatClock12h(lastMs),
      totals,
      blocks,
      phaseWindows: PHASE_WINDOWS,
      outside,
    };
  }, [sessions, selectedDate, activePhases, phaseMode, timer, now]);

  const monthlyCalendar = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.year, viewMonth.month, 1);
    firstOfMonth.__civilDate = true;
    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const startOffset = (firstOfMonth.getDay() + 6) % 7;

    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ empty: true, id: `pad-${i}` });
    }
    let monthTotalSec = 0;
    let monthActiveDays = 0;
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(viewMonth.year, viewMonth.month, dayNum);
      d.__civilDate = true;
      const key = toDateKey(d);
      const sec = dayTotalsMap.get(key) || 0;
      monthTotalSec += sec;
      if (sec > 0) monthActiveDays += 1;
      cells.push({
        empty: false,
        dayNum,
        date: d,
        key,
        sec,
        level: resolveHeatmapLevel(sec, dailyGoalSec),
      });
    }
    return { firstOfMonth, cells, monthTotalSec, monthActiveDays };
  }, [viewMonth, dayTotalsMap, dailyGoalSec]);

  const activeSec = activeSecondsOnDay(timer, selectedDate, now);
  const longest = Math.max(
    0,
    ...sessions.map((s) => sessionSecondsOnDay(s, selectedDate)),
    activeSec
  );
  const dailyGoalPct = Math.min(100, Math.round((total / dailyGoalSec) * 100));
  const step = (days) => setSelectedDate(toDateKey(addDays(date, days)));
  const totalXp = Math.max(0, Math.round(Number(state.profile?.xp) || 0));

  const shiftMonth = (delta) => {
    setViewMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <div className="view-page v11-insights-root">
      {/* CLEAN FRIENDLY TOP HEADER + SPRING 3-VIEW SWITCHER (NO EXTRA ORBITAL) */}
      <header className="v11-ins-topbar v12-ins-spatial-topbar">
        <div className="v11-ins-brand-title">
          <BrandIcon size={40} variant="line-obsidian" style={{ borderRadius: 11 }} />
          <div>
            <h2>পড়াশোনার অগ্রগতি ও ৩ডি বিশ্লেষণ</h2>
            <p>সহজ ও পরিষ্কারভাবে আপনার প্রতিদিনের ফোকাস সময় এবং ধারাবাহিকতা দেখুন</p>
          </div>
        </div>

        <div className="v11-ins-topbar-right">
          <button
            type="button"
            className="v11-rank-summary-pill"
            onClick={() => setActiveTab('balance')}
            title="র‍্যাঙ্ক ও XP বিস্তারিত দেখুন"
          >
            <JourneyBadge tier={rank?.tier || 1} size={24} />
            <strong>{rank?.name || 'Focused'}</strong>
            <span>· {bnNum(totalXp)} XP</span>
          </button>

          <LayoutGroup id="v13-insights-tabs">
            <div className="v11-ins-tabs" role="tablist" aria-label="ইনসাইটস ভিউ">
              {[
                { id: 'overview', label: 'সার্বিক রিপোর্ট', Icon: LayoutDashboard },
                { id: 'monthly', label: 'মাসিক ক্যালেন্ডার', Icon: CalendarDays },
                { id: 'balance', label: 'বিষয় ভারসাম্য ও র‍্যাঙ্ক', Icon: Compass },
              ].map(({ id, label, Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`v11-ins-tab v13-spring-tab ${isActive ? 'is-active' : ''}`}
                    onClick={() => setActiveTab(id)}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="v13-ins-tab-capsule"
                        className="v13-tab-spring-bg"
                        transition={{ type: 'spring', stiffness: 450, damping: 33 }}
                      />
                    )}
                    <div className="v13-tab-inner">
                      <Icon size={15} />
                      <span>{label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>
      </header>
      {activeTab==='overview' && <PhaseInsights/>}

      {/* =====================================================================
          VIEW 1: সার্বিক রিপোর্ট (Full-Width 4 KPIs + Symmetrical Left & Right!)
         ===================================================================== */}
      {activeTab === 'overview' && (
        <>
          {/* 4 Glanceable Friendly KPI Cards Across Full Width */}
          <div className="v11-ins-kpi-strip">
            <div className="card v11-kpi-card highlight">
              <div className="v11-kpi-ico gold">
                <Clock3 size={18} />
              </div>
              <div className="v11-kpi-copy">
                <small>
                  {selectedDate === todayKey ? 'আজকের মোট পড়া' : 'নির্বাচিত দিনের পড়া'}
                </small>
                <strong>{readable(total)}</strong>
                <span>দৈনিক লক্ষ্যের {bnNum(dailyGoalPct)}% সম্পন্ন</span>
              </div>
            </div>

            <div className="card v11-kpi-card">
              <div className="v11-kpi-ico sky">
                <TrendingUp size={18} />
              </div>
              <div className="v11-kpi-copy">
                <small>গত ৭ দিনে মোট পড়া</small>
                <strong>{readable(weeklyTotal)}</strong>
                <span>দৈনিক গড় {readable(weeklyTotal / 7)}</span>
              </div>
            </div>

            <div className="card v11-kpi-card">
              <div className="v11-kpi-ico amber">
                <Flame size={18} />
              </div>
              <div className="v11-kpi-copy">
                <small>একটানা ধারাবাহিকতা</small>
                <strong>{bnNum(streak)} দিন</strong>
                <span>
                  সেরা দিন:{' '}
                  {bestValue > 0
                    ? `${bnDate(weekly[bestIndex], { weekday: 'short' })} (${compactHM(bestValue)})`
                    : '—'}
                </span>
              </div>
            </div>

            <div className="card v11-kpi-card">
              <div className="v11-kpi-ico violet">
                <Award size={18} />
              </div>
              <div className="v11-kpi-copy">
                <small>একটানা সর্বোচ্চ ফোকাস</small>
                <strong>{readable(longest)}</strong>
                <span>মোট {bnNum(sessions.length)}টি ফোকাস সেশন</span>
              </div>
            </div>
          </div>

          {/* FULL-WIDTH 2-COLUMN BENTO GRID: Left 48% + Right 52% (Zero Empty Right Side!) */}
          <div className="v11-ins-main-two-col">
            {/* LEFT COLUMN: Daily Subject Breakdown */}
            <SpatialTiltCard
              maxTilt={3.8}
              delayIndex={1}
              className="card v11-daily-card"
              ariaLabel="দৈনিক বিষয়ভিত্তিক হিসাব"
            >
              <div className="v11-card-head">
                <div className="v11-card-title">
                  <CalendarDays size={18} className="v11-ico-gold" />
                  <div>
                    <h2>দৈনিক বিষয়ভিত্তিক হিসাব</h2>
                    <small>কোন বিষয়ে কতটুকু সময় পড়েছেন তার সহজ হিসাব</small>
                  </div>
                </div>

                <div className="v11-date-stepper">
                  <button type="button" onClick={() => step(-1)} aria-label="আগের দিন">
                    <ChevronLeft size={15} />
                  </button>
                  <span>{bnDate(date, { day: 'numeric', month: 'short' })}</span>
                  <button type="button" onClick={() => step(1)} aria-label="পরের দিন">
                    <ChevronRight size={15} />
                  </button>
                  {selectedDate !== todayKey && (
                    <button
                      type="button"
                      className="v11-today-chip"
                      onClick={() => setSelectedDate(todayKey)}
                    >
                      আজ
                    </button>
                  )}
                </div>
              </div>

              <div className="v11-date-meta-bar">
                <div className="v11-date-picker-inline">
                  <strong>{bnDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
                  <BanglaDateInput
                    aria-label="তারিখ নির্বাচন"
                    value={selectedDate}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="v11-start-end-pills">
                  <span>শুরু: {dayMeta.firstStarted}</span>
                  <span>শেষ: {dayMeta.lastFinished}</span>
                </div>
              </div>

              {subjectTotals.length > 0 ? (
                <CleanSubjectBreakdown items={subjectTotals} />
              ) : (
                <div className="v11-friendly-empty">
                  <BrandIcon size={48} variant="line" style={{ opacity: 0.65 }} />
                  <strong>এই তারিখে কোনো পড়াশোনার সেশন রেকর্ড নেই</strong>
                  <span>অন্য তারিখ বেছে নিন অথবা নতুন একটি ফোকাস সেশন শুরু করুন।</span>
                </div>
              )}
            </SpatialTiltCard>

            {/* RIGHT COLUMN: 3D 7-Day Study Graph + THE SINGLE 3D Focus Heatmap */}
            <div className="v11-right-column-stack">
              <SpatialTiltCard
                maxTilt={3.8}
                delayIndex={2}
                className="card v11-weekly-card"
                ariaLabel="গত ৭ দিনের অগ্রগতি"
              >
                <div className="v11-card-head">
                  <div className="v11-card-title">
                    <TrendingUp size={18} className="v11-ico-sky" />
                    <div>
                      <h2>গত ৭ দিনের ৩ডি অগ্রগতি গ্রাফ</h2>
                      <small>যেকোনো ৩ডি কলামে ক্লিক করলে সেদিনের বিস্তারিত বাম পাশে দেখাবে</small>
                    </div>
                  </div>
                  <span className="v10-studio-badge gold">{readable(weeklyTotal)}</span>
                </div>

                <CleanWeeklyChart
                  dates={weekly}
                  values={values}
                  dailyGoalSec={dailyGoalSec}
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                />
              </SpatialTiltCard>

              {/* SINGLE FOCUS HEATMAP — APPEARS ONLY ONCE! */}
              <SingleFocusHeatmapCard
                todayKey={todayKey}
                dayTotalsMap={dayTotalsMap}
                dailyGoalSec={dailyGoalSec}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          VIEW 2: মাসিক ক্যালেন্ডার (Clean Full-Width Monthly Calendar + Day Report)
         ===================================================================== */}
      {activeTab === 'monthly' && (
        <div className="v11-monthly-two-col">
          <section className="card v10-month-cal-card" aria-label="মাসিক স্টাডি ক্যালেন্ডার">
            <div className="v10-month-cal-head">
              <button
                type="button"
                className="v10-cal-nav-btn"
                onClick={() => shiftMonth(-1)}
                aria-label="আগের মাস"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="v10-month-title-block">
                <h3>{bnDate(monthlyCalendar.firstOfMonth, { month: 'long', year: 'numeric' })}</h3>
                <small>
                  এই মাসে মোট পড়া: {readable(monthlyCalendar.monthTotalSec)} · সক্রিয় দিন:{' '}
                  {bnNum(monthlyCalendar.monthActiveDays)}টি
                </small>
              </div>

              <button
                type="button"
                className="v10-cal-nav-btn"
                onClick={() => shiftMonth(1)}
                aria-label="পরের মাস"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="v10-cal-weekdays">
              {WEEKDAY_HEADERS_MON_FIRST.map((wd) => (
                <span key={wd}>{wd}</span>
              ))}
            </div>

            <div className="v10-cal-days-grid">
              {monthlyCalendar.cells.map((cell) =>
                cell.empty ? (
                  <div key={cell.id} className="v10-cal-day-empty" aria-hidden="true" />
                ) : (
                  <button
                    key={cell.key}
                    type="button"
                    className={`v10-cal-day-tile lvl-${cell.level} ${
                      cell.key === selectedDate ? 'is-selected' : ''
                    } ${cell.key === todayKey ? 'is-today' : ''}`}
                    onClick={() => setSelectedDate(cell.key)}
                  >
                    <strong className="v10-cal-day-num">{bnNum(cell.dayNum)}</strong>
                    <span className="v10-cal-day-dur">{compactHM(cell.sec)}</span>
                  </button>
                )
              )}
            </div>
          </section>

          <section className="card v10-day-breakdown-card" aria-label="নির্বাচিত দিনের বিস্তারিত">
            <div className="v11-card-head">
              <div className="v11-card-title">
                <Timer size={18} className="v11-ico-gold" />
                <div>
                  <h2>
                    {bnDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h2>
                  <small>নির্বাচিত দিনের সম্পূর্ণ স্টাডি রিপোর্ট</small>
                </div>
              </div>
              <span className="v10-studio-badge">{bnNum(sessions.length)} সেশন</span>
            </div>

            <div className="v10-breakdown-kpi-grid">
              <div className="v10-bd-kpi highlight-gold">
                <small>মোট স্টাডি সময়</small>
                <strong>{bnNum(formatHMS(total))}</strong>
              </div>
              <div className="v10-bd-kpi">
                <small>একটানা সর্বোচ্চ ফোকাস</small>
                <strong>{bnNum(formatHMS(longest))}</strong>
              </div>
              <div className="v10-bd-kpi">
                <small>পড়া শুরু</small>
                <strong>{dayMeta.firstStarted}</strong>
              </div>
              <div className="v10-bd-kpi">
                <small>পড়া সমাপ্তি</small>
                <strong>{dayMeta.lastFinished}</strong>
              </div>
            </div>

            {/* Unified Big Box Divided into 4 or 5 STRICT EQUAL Phase Compartments,
                plotting exact start-position dots & duration-scaled sub-boxes inside each phase */}
            <div
              className={`v29-cal-equal-timeline ${
                activePhases.length === 5 ? 'is-five' : 'is-four'
              }`}
              style={{ '--phase-col-count': activePhases.length || 4 }}
              aria-label="প্রহর অনুযায়ী নির্বাচিত দিনের সমান বিভক্ত টাইমলাইন"
            >
              <div className="v29-cal-tl-head-row">
                {activePhases.map((p) => (
                  <div
                    key={p.id}
                    className="v29-cal-tl-col-head"
                    style={{ '--p-col': p.accent || '#fbbf24' }}
                  >
                    <span className="v29-cal-tl-name">
                      <i aria-hidden="true" />
                      {p.label}
                    </span>
                    <small>{dayMeta.phaseWindows?.[p.id]?.shortWin || ''}</small>
                  </div>
                ))}
              </div>

              <div className="v29-cal-tl-unified-box">
                {activePhases.map((p) => {
                  const segs = dayMeta.blocks?.[p.id] || [];
                  const secInPhase = dayMeta.totals?.[p.id] || 0;
                  return (
                    <div
                      key={p.id}
                      className={`v29-cal-tl-compartment tone-${p.id} ${
                        secInPhase > 0 ? 'has-study' : ''
                      }`}
                      style={{ '--p-col': p.accent || '#fbbf24' }}
                      title={`${p.label} (${p.windowLabel}) · মোট ${readable(secInPhase)}`}
                    >
                      <div className="v29-cal-tl-lane">
                        {segs.map((seg, idx) => (
                          <span
                            key={idx}
                            className={`v29-cal-tl-seg ${seg.isDot ? 'is-dot' : ''} ${
                              seg.isLive ? 'is-live' : ''
                            }`}
                            style={{
                              left: `${seg.leftPct}%`,
                              width: `${seg.widthPct}%`,
                            }}
                            title={seg.tip}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="v29-cal-tl-foot-row">
                {activePhases.map((p) => {
                  const secInPhase = dayMeta.totals?.[p.id] || 0;
                  return (
                    <div
                      key={p.id}
                      className={`v29-cal-tl-col-foot ${secInPhase > 0 ? 'active' : ''}`}
                      style={{ '--p-col': p.accent || '#fbbf24' }}
                    >
                      <strong>{secInPhase > 0 ? compactHM(secInPhase) : '—'}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
            {dayMeta.outside > 0 && (
              <small className="v29-cal-outside-note">
                নির্ধারিত প্রহরের বাইরে: {readable(dayMeta.outside)}
              </small>
            )}

            <div className="v10-top-subjects-block">
              <div className="v10-sub-kicker-row">
                <span>পঠিত বিষয়সমূহ</span>
                <small>{readable(total)}</small>
              </div>
              {subjectTotals.length > 0 ? (
                <div className="v10-top-subj-list">
                  {subjectTotals.slice(0, 5).map((sub, i) => {
                    const col = sub.color || PALETTE[i % PALETTE.length];
                    const pct = total > 0 ? Math.round((sub.seconds / total) * 100) : 0;
                    return (
                      <div key={sub.id} className="v10-top-subj-row">
                        <div className="v10-top-subj-head">
                          <span className="v10-top-subj-name">
                            <i style={{ background: col }} />
                            {bnSubject(sub.name)}
                          </span>
                          <strong style={{ color: col }}>{readable(sub.seconds)}</strong>
                        </div>
                        <div className="v10-top-subj-bar">
                          <span style={{ width: `${Math.max(4, pct)}%`, background: col }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="v10-bd-empty">
                  এই তারিখে কোনো পড়া রেকর্ড নেই। ক্যালেন্ডারের রঙিন ঘরে ক্লিক করুন।
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          VIEW 3: বিষয় ভারসাম্য ও র‍্যাঙ্ক (Full-Width 2-Column: Radar Left + Rank Right)
         ===================================================================== */}
      {activeTab === 'balance' && (
        <div className="v36-balance-tab">
          <div className="v36-balance-hero">
            <FriendlySubjectRadarCard subjects={state.subjects} sessions={state.sessions} />
            <div className="v11-journey-col-wrap v36-journey-wrap">
              <JourneyPanel
                state={state}
                rank={rank}
                nextRank={nextRank}
                xpPercent={xpPercent}
                timer={timer}
                elapsedSec={elapsedSec}
                totalSec={totalSec}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
