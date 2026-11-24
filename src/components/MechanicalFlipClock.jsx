import React, { memo, useEffect, useRef, useState } from 'react';

const FlipDigitUnit = memo(function FlipDigitUnit({ digit, sizeClass }) {
  const [animState, setAnimState] = useState({
    curr: digit,
    prev: digit,
    flipKey: 0,
    isFlipping: false,
  });
  const timerRef = useRef(null);

  useEffect(() => {
    if (digit === animState.curr) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    setAnimState((prev) => ({
      curr: digit,
      prev: prev.curr,
      flipKey: prev.flipKey + 1,
      isFlipping: true,
    }));

    timerRef.current = setTimeout(() => {
      setAnimState((prev) => ({ ...prev, prev: prev.curr, isFlipping: false }));
    }, 360);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [digit]); // eslint-disable-line react-hooks/exhaustive-deps

  const { curr, prev, flipKey, isFlipping } = animState;

  return (
    <span className={`v4-mech-card ${sizeClass} ${isFlipping ? 'is-flipping' : ''}`}>
      {/* Static Upper Plate (reveals NEW digit underneath falling top leaf) */}
      <span className="v4-mech-half v4-mech-top">
        <span className="v4-mech-glyph">{curr}</span>
      </span>

      {/* Static Lower Plate (shows OLD digit until unfolding bottom leaf lands, then NEW digit) */}
      <span className="v4-mech-half v4-mech-bottom">
        <span className="v4-mech-glyph">{isFlipping ? prev : curr}</span>
      </span>

      {/* Animated Mechanical Split Leaves (rendered only during 360ms transition) */}
      {isFlipping && (
        <span key={flipKey} className="v4-mech-flap-stage" aria-hidden="true">
          <span className="v4-mech-half v4-mech-flap-top">
            <span className="v4-mech-glyph">{prev}</span>
          </span>
          <span className="v4-mech-half v4-mech-flap-bottom">
            <span className="v4-mech-glyph">{curr}</span>
          </span>
        </span>
      )}

      {/* Physical Split-Flap Axle Seam & Side Hinge Pins */}
      <span className="v4-mech-hinge-line" aria-hidden="true">
        <i className="v4-mech-pin left" />
        <i className="v4-mech-pin right" />
      </span>
    </span>
  );
});

export function MechanicalFlipClock({ timeStr = '25:00', size = 'md', isAlarm = false }) {
  // Normalize Bangla numerals to Western 0-9 if ever passed so Bodoni glyphs render authentically
  const normalized = String(timeStr || '25:00').replace(/[০-৯]/g, (d) =>
    String('০১২৩৪৫৬৭৮৯'.indexOf(d))
  );
  const chars = normalized.split('');
  const sizeClass = `v4-mech-size-${size}`;

  return (
    <div
      className={`v4-mech-clock-row ${sizeClass} ${isAlarm ? 'is-alarm' : ''}`}
      aria-label={normalized}
    >
      {chars.map((ch, idx) => {
        if (ch === ':') {
          return (
            <span key={`sep-${idx}`} className="v4-mech-colon" aria-hidden="true">
              <i />
              <i />
            </span>
          );
        }
        if (ch === '-') {
          return (
            <span key={`neg-${idx}`} className="v4-mech-minus">
              −
            </span>
          );
        }
        return <FlipDigitUnit key={`slot-${idx}`} digit={ch} sizeClass={sizeClass} />;
      })}
    </div>
  );
}

/**
 * Real-Time Perimeter Outline Progress Ring hugging the exact rounded border of PiP!
 * Uses SVG pathLength="100" so 0% -> 100% traces smoothly around all 4 edges & corners.
 */
export function PipPerimeterProgressRing({
  progressPct = 0,
  width = 0,
  height = 0,
  radius = 22,
  isAlarm = false,
  isPaused = false,
}) {
  const svgRef = useRef(null);
  const [box, setBox] = useState({ w: width || 320, h: height || 156 });

  useEffect(() => {
    if (width > 0 && height > 0) {
      setBox({ w: width, h: height });
      return;
    }
    const el = svgRef.current?.parentElement;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const sync = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setBox({ w: Math.round(r.width), h: Math.round(r.height) });
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  const w = Math.max(40, width > 0 ? width : box.w);
  const h = Math.max(30, height > 0 ? height : box.h);
  const strokePad = 1.75;
  const rw = Math.max(10, w - strokePad * 2);
  const rh = Math.max(10, h - strokePad * 2);
  const rx = Math.min(Math.max(4, radius - strokePad), rw / 2, rh / 2);

  const clamped = Math.max(0, Math.min(100, Number(progressPct) || 0));
  const dashOffset = clamped <= 0 ? 100 : Math.max(0, 100 - Math.max(1.5, clamped));

  return (
    <svg
      ref={svgRef}
      className={`v4-pip-ring-svg ${isAlarm ? 'is-alarm' : ''} ${isPaused ? 'is-paused' : ''}`}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden="true"
    >
      <rect
        className="v4-pip-ring-track"
        x={strokePad}
        y={strokePad}
        width={rw}
        height={rh}
        rx={rx}
        ry={rx}
      />
      <rect
        className="v4-pip-ring-progress"
        x={strokePad}
        y={strokePad}
        width={rw}
        height={rh}
        rx={rx}
        ry={rx}
        pathLength="100"
        strokeDasharray="100"
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
}

export default MechanicalFlipClock;
