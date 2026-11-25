// Display-only numeric input: English (Latin) digits at all times.
// Canonical ASCII values are stored; user-entered text is never rewritten.
import React from 'react';
import { CustomDateInput, CustomTimeInput } from './CustomPickers';

export function BanglaNumberInput({ value, onChange, onKeyDown, min, max, step=1, inputMode, plain=false, ...props }) {
  const forward = next => onChange?.({target:{value:String(next)},currentTarget:{value:String(next)}});
  const numeric=String(value ?? '');
  const valid=numeric!==''&&Number.isFinite(Number(numeric));
  const handleChange = event => {
    const next=event.target.value.replace(/[^0-9.-]/g,'');
    if (/^-?\d*\.?\d*$/.test(next)) forward(next);
  };
  const handleKey = event => {
    onKeyDown?.(event);
    if(event.defaultPrevented || !['ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();
    const increment=Number(step)||1, current=Number(numeric)||0;
    let next=Math.round((current+(event.key==='ArrowUp'?increment:-increment))*10000)/10000;
    if(min!==undefined)next=Math.max(Number(min),next);
    if(max!==undefined)next=Math.min(Number(max),next);
    forward(next);
  };
  const stepValue = delta => {let n=(valid?Number(numeric):0)+delta*(Number(step)||1);if(min!==undefined)n=Math.max(Number(min),n);if(max!==undefined)n=Math.min(Number(max),n);forward(Math.round(n*10000)/10000);};
  const field=<input {...props} type="text" role="spinbutton" inputMode={inputMode || (String(step).includes('.')?'decimal':'numeric')} value={numeric} onChange={handleChange} onKeyDown={handleKey} aria-valuemin={min} aria-valuemax={max} aria-valuenow={valid?Number(numeric):undefined} aria-valuetext={valid?numeric:undefined}/>;
  if(plain)return field;
  return <span className="cp-number"><button type="button" aria-label={`Reduce ${props['aria-label']||"Value"}`} disabled={props.disabled || (valid&&min!==undefined&&Number(numeric)<=Number(min))} onClick={()=>stepValue(-1)}>−</button>{field}<button type="button" aria-label={`Increase ${props['aria-label']||"Value"}`} disabled={props.disabled || (valid&&max!==undefined&&Number(numeric)>=Number(max))} onClick={()=>stepValue(1)}>+</button></span>;
}

// Custom controls still emit the same event shape as native inputs.
export const BanglaDateInput = CustomDateInput;
export const BanglaTimeInput = CustomTimeInput;
