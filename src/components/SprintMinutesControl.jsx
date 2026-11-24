import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { bnNum } from '../utils/bangla';

export default function SprintMinutesControl({ label, value, onChange, presets = [], min = 0, max = 240, step = 5, unit = 'মিনিট', customAction, format = bnNum }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const current = Math.max(min, Math.min(max, Number(value) || min));
  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('keydown', esc); };
  }, [open]);
  const set = (n) => onChange(Math.max(min, Math.min(max, Number(n) || min)));
  return <div className="v37-minute-control" ref={root}>
    <span className="v37-minute-label">{label}</span>
    <div className="v37-minute-control-row">
      <div className="v37-minute-stepper" role="group" aria-label={`${label} ${unit}`}>
        <button type="button" aria-label={`${label} ${bnNum(step)} ${unit} কমান`} disabled={current <= min} onClick={() => set(current - step)}><Minus size={13}/></button>
        <button type="button" className="v37-minute-value" aria-label={`${label} প্রি-সেট বেছে নিন`} aria-expanded={open} onClick={() => setOpen((x) => !x)}>
          <strong>{format(current)}</strong><ChevronDown size={12}/>
        </button>
        <button type="button" aria-label={`${label} ${bnNum(step)} ${unit} বাড়ান`} disabled={current >= max} onClick={() => set(current + step)}><Plus size={13}/></button>
      </div>
    </div>
    {open && <div className="v37-minute-popover" role="dialog" aria-label={`${label} প্রি-সেট`}>
      <div className="v37-minute-presets">{presets.map((n) => <button type="button" key={n} className={current === n ? 'is-selected' : ''} aria-pressed={current === n} onClick={() => { set(n); setOpen(false); }}>{format(n)}</button>)}{customAction && <button type="button" className="v38-custom-preset" onClick={() => { setOpen(false); customAction(); }}>কাস্টম তারিখ…</button>}</div>
    </div>}
  </div>;
}
