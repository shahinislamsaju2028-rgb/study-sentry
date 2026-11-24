import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import BrandIcon from './BrandIcon';

export type SpatialMotionMode = 'ultra' | 'calm';

interface SpatialMotionCtx {
  mode: SpatialMotionMode;
  toggleMode: () => void;
  setMode: (m: SpatialMotionMode) => void;
}

const MotionContext = createContext<SpatialMotionCtx>({
  mode: 'calm',
  toggleMode: () => {},
  setMode: () => {},
});

const STORAGE_KEY = 'ss_spatial_motion_mode_v13_minimal';

export const SpatialMotionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setModeState] = useState<SpatialMotionMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'calm' || saved === 'ultra') return saved;
    } catch {}
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'calm' : 'ultra';
  });

  const setMode = (next: SpatialMotionMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  const toggleMode = () => setMode(mode === 'ultra' ? 'calm' : 'ultra');

  // Pause all GPU 3D keyframes automatically when window/tab is hidden -> 0% background GPU!
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.spatialMotion = mode;

    const syncVisibility = () => {
      root.dataset.docHidden = document.hidden ? '1' : '0';
    };
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, [mode]);

  return (
    <MotionContext.Provider value={{ mode, toggleMode, setMode }}>
      {children}
    </MotionContext.Provider>
  );
};

export function useSpatialMotion() {
  return useContext(MotionContext);
}

/**
 * Zero-Conflict 120FPS 3D Perspective Tilt Card.
 * - Uses MotionValues + Springs directly (ZERO React state re-renders on pointermove).
 * - Owns `transform` exclusively via `.v12-spatial-tilt-owned` so CSS hover transforms never clash.
 */
export interface SpatialTiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  role?: string;
  tabIndex?: number;
  ariaLabel?: string;
  style?: React.CSSProperties;
  delayIndex?: number;
}

export const SpatialTiltCard: React.FC<SpatialTiltCardProps> = ({
  children,
  className = '',
  maxTilt = 6,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  ariaLabel,
  style,
  delayIndex = 0,
}) => {
  const { mode } = useSpatialMotion();
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spring = { stiffness: 280, damping: 26, mass: 0.55 };
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [maxTilt, -maxTilt]), spring);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-maxTilt, maxTilt]), spring);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'ultra' || e.pointerType === 'touch') return;
    const el = tiltRef.current;
    if (!el) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (clientX - rect.left) / rect.width - 0.5;
      const ny = (clientY - rect.top) / rect.height - 0.5;
      mx.set(Math.max(-0.5, Math.min(0.5, nx)));
      my.set(Math.max(-0.5, Math.min(0.5, ny)));
      el.style.setProperty('--spot-x', `${((nx + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--spot-y', `${((ny + 0.5) * 100).toFixed(1)}%`);
    });
  };

  const handlePointerLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={tiltRef}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      initial={{ opacity: 0, y: 5, scale: 0.994 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.22,
        delay: Math.min(0.12, delayIndex * 0.016),
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={onClick ? { scale: 0.988 } : undefined}
      className={`v12-spatial-tilt-owned ${className}`}
      style={{
        transformPerspective: 1100,
        rotateX: mode === 'ultra' ? rotateX : 0,
        rotateY: mode === 'ultra' ? rotateY : 0,
        ...style,
      }}
    >
      <span className="v12-specular-glare" aria-hidden="true" />
      {children}
    </motion.div>
  );
};

export const SentryChronoCore3D: React.FC<{
  progressPct?: number;
  isLive?: boolean;
  size?: number;
  label?: string;
  sublabel?: string;
  onClick?: () => void;
}> = ({
  progressPct = 0,
  isLive = false,
  size = 162,
  label = 'সম্পন্ন',
  sublabel,
  onClick,
}) => {
  const { mode } = useSpatialMotion();
  const clamped = Math.max(0, Math.min(100, Math.round(progressPct)));

  /* ---- v35: a machined "astrolabe instrument" ring -------------------------
     The home hero ring used to be a flat dark disc with faint ticks. It now
     reads like a real instrument: a knurled champagne bezel, a 60-step
     calibration track, applied hour indices, an engraved chapter ring, a
     luminous progress arc with a comet head and a glass reflection sweep. */
  const cx = 80;
  const cy = 80;
  const arcR = 56;
  const circ = 2 * Math.PI * arcR;
  const dashOffset = circ * (1 - clamped / 100);
  const angleRad = ((clamped / 100) * 360 - 90) * (Math.PI / 180);
  const tipX = cx + arcR * Math.cos(angleRad);
  const tipY = cy + arcR * Math.sin(angleRad);
  const bnPct = String(clamped).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

  const polar = (r: number, deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };

  // 60 precision calibration ticks — every 5th marker is major
  const ticks = Array.from({ length: 60 }, (_, idx) => {
    const a = idx * 6;
    const major = idx % 5 === 0;
    const [x1, y1] = polar(major ? 60 : 63, a);
    const [x2, y2] = polar(67.5, a);
    const activeTick = clamped > 0 && idx / 60 <= clamped / 100;
    return { key: `t${idx}`, x1, y1, x2, y2, activeTick, major };
  });

  // 12 applied hour indices (batons) sitting just inside the tick track
  const indices = Array.from({ length: 12 }, (_, idx) => {
    const a = idx * 30;
    const rad = ((a - 90) * Math.PI) / 180;
    const nx = Math.cos(rad);
    const ny = Math.sin(rad);
    const w = 1.9;
    const [ax, ay] = polar(56.5, a);
    const [bx, by] = polar(49.5, a);
    return {
      key: `i${idx}`,
      d: `M ${ax - ny * w} ${ay + nx * w} L ${bx - ny * w} ${by + nx * w} L ${bx + ny * w} ${
        by - nx * w
      } L ${ax + ny * w} ${ay - nx * w} Z`,
    };
  });

  // Fine knurling around the metal rim
  const knurl = Array.from({ length: 96 }, (_, idx) => {
    const a = idx * (360 / 96);
    const [x1, y1] = polar(72.5, a);
    const [x2, y2] = polar(78, a);
    return { key: `k${idx}`, x1, y1, x2, y2 };
  });

  return (
    <div
      className={`v12-chrono-core-scene v13-hero-astrolabe v29-hero-ring-showcase v31-hero-ring v35-hero-ring ${
        isLive ? 'is-live' : ''
      } ${mode === 'calm' ? 'is-calm' : 'is-ultra'}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`আজকের লক্ষ্য ${bnPct}% সম্পন্ন`}
      title={`আজকের লক্ষ্য ${bnPct}% সম্পন্ন`}
    >
      {/* Layered ambient aura — breathes softly, never distracting */}
      <span className="v31-ring-aura" aria-hidden="true" />
      <span className="v31-ring-halo" aria-hidden="true" />

      <div className="v12-chrono-core-rig v29-chrono-rig v31-ring-rig">
        {/* Slowly sweeping conic light band around the bezel */}
        <span className="v31-ring-sheen" aria-hidden="true" />

        <svg
          className="v13-astrolabe-progress-svg v29-progress-ring-svg v31-ring-svg v35-ring-svg"
          viewBox="0 0 160 160"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="v35ArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--v30-accent-2, var(--vd-accent-2, #38bdf8))" />
              <stop offset="46%" stopColor="var(--v30-accent, var(--vd-accent, #fbbf24))" />
              <stop offset="100%" stopColor="var(--v30-accent-bright, var(--vd-accent, #fde047))" />
            </linearGradient>
            <linearGradient id="v35BezelGrad" x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
              <stop offset="26%" stopColor="#b45309" stopOpacity="0.8" />
              <stop offset="52%" stopColor="#fef3c7" stopOpacity="0.92" />
              <stop offset="78%" stopColor="#92400e" stopOpacity="0.78" />
              <stop offset="100%" stopColor="#fcd34d" stopOpacity="0.9" />
            </linearGradient>
            <radialGradient id="v35GlassWell" cx="34%" cy="24%" r="76%">
              <stop offset="0%" stopColor="#2b3242" />
              <stop offset="46%" stopColor="#141a27" />
              <stop offset="100%" stopColor="#05070c" />
            </radialGradient>
            <linearGradient id="v35RingGlass" x1="0.1" y1="0" x2="0.75" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.17" />
              <stop offset="44%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="72%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <filter id="v35ArcGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="v35FaceClip">
              <circle cx={cx} cy={cy} r="69" />
            </clipPath>
          </defs>

          {/* Champagne bezel + knurled rim */}
          <circle cx={cx} cy={cy} r="78.5" fill="url(#v35BezelGrad)" opacity="0.95" />
          <circle cx={cx} cy={cy} r="71.5" fill="#070a11" />
          <g aria-hidden="true" opacity="0.55">
            {knurl.map((k) => (
              <line
                key={k.key}
                x1={k.x1}
                y1={k.y1}
                x2={k.x2}
                y2={k.y2}
                stroke="#2a1d06"
                strokeWidth="0.8"
              />
            ))}
          </g>

          {/* Sculpted obsidian glass face */}
          <circle cx={cx} cy={cy} r="70" fill="url(#v35GlassWell)" />
          <circle cx={cx} cy={cy} r="70" fill="none" stroke="#ffffff" strokeOpacity="0.09" strokeWidth="0.9" />

          {/* Engraved chapter ring */}
          <circle
            cx={cx}
            cy={cy}
            r="47"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.09"
            strokeWidth="0.9"
            strokeDasharray="1.4 4.2"
          />

          {/* Deep recessed progress track */}
          <circle cx={cx} cy={cy} r={arcR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />

          {/* 60 precision calibration ticks */}
          {ticks.map((tk) => (
            <line
              key={tk.key}
              x1={tk.x1}
              y1={tk.y1}
              x2={tk.x2}
              y2={tk.y2}
              stroke={
                tk.activeTick
                  ? 'var(--v30-accent, var(--vd-accent, #fbbf24))'
                  : tk.major
                  ? 'rgba(255,255,255,0.32)'
                  : 'rgba(255,255,255,0.13)'
              }
              strokeWidth={tk.major ? 1.5 : 0.9}
              strokeLinecap="round"
              opacity={tk.activeTick ? 0.95 : 1}
            />
          ))}

          {/* Applied hour indices */}
          <g aria-hidden="true">
            {indices.map((ix) => (
              <path
                key={ix.key}
                d={ix.d}
                fill="rgba(248,250,252,0.55)"
                opacity="0.8"
              />
            ))}
          </g>

          {/* Primary luminous progress arc */}
          {clamped > 0 && (
            <circle
              className="v31-ring-arc v35-ring-arc"
              cx={cx}
              cy={cy}
              r={arcR}
              fill="none"
              stroke="url(#v35ArcGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={dashOffset}
              style={{ transform: 'rotate(-90deg)', transformBox: 'view-box', transformOrigin: '50% 50%' }}
              filter="url(#v35ArcGlow)"
            />
          )}

          {/* Glowing comet head riding the arc tip */}
          {clamped > 0 && (
            <g className="v31-ring-comet v35-ring-comet">
              <circle
                cx={tipX}
                cy={tipY}
                r="7"
                fill="var(--v30-accent, var(--vd-accent, #fbbf24))"
                opacity="0.26"
              />
              <circle
                cx={tipX}
                cy={tipY}
                r="3.8"
                fill="#FFFFFF"
                stroke="var(--v30-accent, var(--vd-accent, #fbbf24))"
                strokeWidth="1.8"
              />
            </g>
          )}

          {/* Glass reflection sweep */}
          <g clipPath="url(#v35FaceClip)" aria-hidden="true">
            <path
              d={`M ${cx - 74} ${cy - 26} Q ${cx - 26} ${cy - 76} ${cx + 46} ${cy - 60} Q ${
                cx + 4
              } ${cy - 30} ${cx - 74} ${cy + 6} Z`}
              fill="url(#v35RingGlass)"
            />
          </g>
        </svg>

        {/* 3D gyroscopic gimbals (animated in Ultra, sculpted in Calm) */}
        <div className="v12-gyro-ring ring-gold" aria-hidden="true">
          <span className="v12-gyro-satellite sat-gold" />
        </div>
        <div className="v12-gyro-ring ring-cyan" aria-hidden="true">
          <span className="v12-gyro-satellite sat-cyan" />
        </div>
        <div className="v12-gyro-ring ring-violet" aria-hidden="true" />

        {/* Crystal medallion — large, instantly readable percentage */}
        <div className="v31-ring-medallion v35-ring-medallion">
          <span className={`v31-ring-dot ${isLive ? 'is-live' : ''}`} aria-hidden="true" />
          <strong className="v31-ring-pct">
            {/* Each Bengali digit is its own span: Hind Siliguri gives
                ০-৯ almost no side bearing, so a plain text node lets
                neighbouring digits touch (৭৫ read as one blob). */}
            <span className="v31-ring-digits" aria-hidden="true">
              {[...bnPct].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </span>
            <em>%</em>
          </strong>
          <small className="v31-ring-label">{label}</small>
          {sublabel && <span className="v31-ring-sub">{sublabel}</span>}
        </div>
      </div>
    </div>
  );
};

/**
 * Pure-GPU 3D Rotating Wireframe Holo-Cube / Octahedron Accent Badge
 */
export const HoloCube3D: React.FC<{ size?: number; active?: boolean }> = ({
  size = 26,
  active = false,
}) => {
  const half = Math.round(size / 2);
  return (
    <div
      className={`v12-holo-cube-scene ${active ? 'is-active' : ''}`}
      style={
        {
          width: size,
          height: size,
          '--cube-half': `${half}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <div className="v12-holo-cube">
        <i className="face front" />
        <i className="face back" />
        <i className="face right" />
        <i className="face left" />
        <i className="face top" />
        <i className="face bottom" />
      </div>
    </div>
  );
};
