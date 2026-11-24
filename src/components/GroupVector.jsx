import React from 'react';
/* Original, hand-drawn geometric symbols in a shared 32×32 coordinate system. */
const symbols = {
 academy: '<path d="M3 11 16 5l13 6-13 6L3 11Zm5 3v7c4 4 12 4 16 0v-7M28 12v7"/><path d="M12 24h8"/>',
 mission: '<path d="M10 21c-1-7 3-13 12-16 3 9 1 15-6 19l-6-3Zm3-2 5 4M11 18l-5 1-2 5 7-1m8-3 1 7 5-3 1-5"/><circle cx="19" cy="11" r="2"/>',
 focus: '<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><circle cx="16" cy="16" r="2"/><path d="m20 12 7-7m-4 0h4v4"/>',
 revision: '<path d="M7 12a10 10 0 0 1 17-3l3 3M27 5v7h-7M25 20a10 10 0 0 1-17 3l-3-3m0 7v-7h7"/>',
 science: '<path d="M11 5h10M14 5v9L7 25c-1 2 0 3 2 3h14c2 0 3-1 2-3l-7-11V5M10 21h12"/><circle cx="16" cy="18" r="1"/>',
 code: '<rect x="4" y="6" width="24" height="18" rx="3"/><path d="m12 12-3 3 3 3m8-6 3 3-3 3m-3-7-2 8M11 28h10"/>',
 math: '<rect x="6" y="4" width="20" height="24" rx="4"/><path d="M10 9h12M10 15h4m-2-2v4m5-2h5m-12 7h4m4-2 4 4m0-4-4 4"/>',
 night: '<path d="M22 23A10 10 0 0 1 13 5a10 10 0 1 0 9 18ZM23 5v5m-2.5-2.5h5M27 14v3m-1.5-1.5h3"/>',
 voice: '<path d="M5 7h22v15H16l-6 5v-5H5zM10 12h12M10 16h8"/>',
 trophy: '<path d="M10 5h12v7c0 6-3 9-6 9s-6-3-6-9V5Zm0 3H5c0 6 2 9 6 9m11-9h5c0 6-2 9-6 9M16 21v5m-5 2h10"/>',
};
const legacy={'🎓':'academy','🚀':'mission','🎯':'focus','🔁':'revision','🔬':'science','💻':'code','🧮':'math','🗣️':'voice','🌙':'night','🎤':'voice','🧠':'focus','⚡':'mission','🏆':'trophy','🌿':'science','🎨':'academy','🏛️':'academy','🔭':'science','📐':'math','📊':'math','🧪':'science','🛠️':'code','📖':'academy','🕯️':'night','☕':'night'};
export const GROUP_SYMBOLS = Object.keys(symbols);
export const GROUP_SYMBOL_LABELS = {academy:'একাডেমি',mission:'মিশন',focus:'ফোকাস',revision:'রিভিশন',science:'সায়েন্স',code:'কোডিং',math:'গণিত',night:'নাইট স্টাডি',voice:'আলোচনা',trophy:'অর্জন'};
export function groupSymbolMarkup(id){ return symbols[legacy[id] || id] || symbols.academy; }
export function GroupVector({id, className}) {return <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{__html:groupSymbolMarkup(id)}} />;}
