import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
export default function SprintNameControl({ names, value, onChange }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const index = names.indexOf(value);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside); window.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="v37-minute-control v39-name-control" ref={root}>
    <div className="v37-minute-control-row"><div className="v37-minute-stepper" role="group" aria-label="প্রি-মেইড স্প্রিন্ট নাম">
      <button type="button" aria-label="আগের নাম" disabled={index === 0} onClick={() => onChange(names[index < 0 ? names.length - 1 : index - 1])}><Minus size={13}/></button>
      <button type="button" className="v37-minute-value" aria-label="প্রি-মেইড স্প্রিন্ট নাম বেছে নিন" aria-expanded={open} onClick={() => setOpen(x => !x)}><strong>{index < 0 ? 'কাস্টম নাম' : value}</strong><ChevronDown size={12}/></button>
      <button type="button" aria-label="পরের নাম" disabled={index === names.length - 1} onClick={() => onChange(names[index < 0 ? 0 : index + 1])}><Plus size={13}/></button>
    </div></div>
    {open && <div className="v37-minute-popover v39-name-popover" role="dialog" aria-label="প্রি-মেইড নামের তালিকা"><div className="v37-minute-presets">
      {names.map(name => <button type="button" key={name} className={value === name ? 'is-selected' : ''} aria-pressed={value === name} onClick={() => { onChange(name); setOpen(false); }}>{name}</button>)}
    </div></div>}
  </div>;
}
