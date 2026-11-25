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
 flask: '<path d="M13 4h6M15 4v8L8 25c-1 2 1 3 3 3h10c2 0 4-1 3-3l-7-13V4"/><path d="M10 22h12M12 17h8"/>',
 pen: '<path d="M6 26l2-6L21 7a2 2 0 0 1 3 0l1 1a2 2 0 0 1 0 3L12 24l-6 2Zm12-16 4 4"/><path d="M6 26l5-1"/>',
 compass: '<circle cx="16" cy="16" r="12"/><path d="m20 12-2.5 6.5L11 21l2.5-6.5L20 12Z"/><circle cx="16" cy="16" r="1"/>',
 atom: '<circle cx="16" cy="16" r="2.2"/><ellipse cx="16" cy="16" rx="13" ry="5.5" transform="rotate(30 16 16)"/><ellipse cx="16" cy="16" rx="13" ry="5.5" transform="rotate(-30 16 16)"/><ellipse cx="16" cy="16" rx="13" ry="5.5" transform="rotate(90 16 16)"/>',
 globe: '<circle cx="16" cy="16" r="12"/><path d="M4 16h24M16 4c4 4 6 8 6 12s-2 8-6 12c-4-4-6-8-6-12s2-8 6-12Z"/>',
 clock: '<circle cx="16" cy="16" r="12"/><path d="M16 9v7l5 3"/><path d="M16 3v2m0 22v2M3 16h2m22 0h2"/>',
 leaf: '<path d="M27 6c-13 0-20 5-20 12 0 4 3 7 7 7 7 0 12-7 13-19Z"/><path d="M6 28C10 18 16 12 25 8"/>',
 rocket: '<path d="M16 4c4 3 6 8 6 13l-3 4H13l-3-4c0-5 2-10 6-13Z"/><circle cx="16" cy="13" r="2.4"/><path d="M13 21l-4 5 5-1m5-4 4 5-5-1M16 24v5"/>',
 book: '<path d="M4 8c4-2 8-2 12 1 4-3 8-3 12-1v17c-4-2-8-2-12 1-4-3-8-3-12-1V8Z"/><path d="M16 9v17"/>',
 medal: '<circle cx="16" cy="20" r="8"/><path d="M11 13 8 4h6l2 5 2-5h6l-3 9"/><path d="m16 16 1.5 3 3 .4-2.2 2.2.5 3-2.8-1.5-2.8 1.5.5-3L11.5 19.4l3-.4L16 16Z"/>',
 puzzle: '<path d="M13 5a2 2 0 1 1 4 0v3h4v4h3a2 2 0 1 1 0 4h-3v5h-5v-3a2 2 0 1 0-4 0v3H8v-5H5a2 2 0 1 1 0-4h3V8h5V5Z"/>',
 spark: '<path d="M16 3v6m0 14v6M3 16h6m14 0h6M7.5 7.5l4 4m9 9 4 4m0-17-4 4m-9 9-4 4"/><circle cx="16" cy="16" r="4.5"/>',
 scales: '<path d="M16 5v22M8 27h16M16 9 7 13m9-4 9 4"/><path d="M4 20a5 5 0 0 0 6 0l-3-7-3 7Zm18 0a5 5 0 0 0 6 0l-3-7-3 7Z"/>',
 moon: '<path d="M24 20a9 9 0 0 1-11-12 10 10 0 1 0 11 12Z"/><path d="M26 6v4m-2-2h4"/>',

};
const legacy={'🎓':'academy','🚀':'mission','🎯':'focus','🔁':'revision','🔬':'science','💻':'code','🧮':'math','🗣️':'voice','🌙':'night','🎤':'voice','🧠':'focus','⚡':'mission','🏆':'trophy','🌿':'science','🎨':'academy','🏛️':'academy','🔭':'science','📐':'math','📊':'math','🧪':'science','🛠️':'code','📖':'academy','🕯️':'night','☕':'night'};
export const GROUP_SYMBOLS = Object.keys(symbols);
export const GROUP_SYMBOL_LABELS = {academy:'একাডেমি',mission:'মিশন',focus:'ফোকাস',revision:'রিভিশন',science:'সায়েন্স',code:'কোডিং',math:'গণিত',night:'নাইট স্টাডি',voice:'আলোচনা',trophy:'অর্জন',flask:'ল্যাব',pen:'লেখা',compass:'জ্যামিতি',atom:'পদার্থ',globe:'ভূগোল',clock:'সময়',leaf:'বিশ্রাম',rocket:'স্প্রিন্ট',book:'পড়া',medal:'পুরস্কার',puzzle:'ধাঁধা',spark:'প্রেরণা',scales:'ভারসাম্য',moon:'রাত্রি'};
export function groupSymbolMarkup(id){ return symbols[legacy[id] || id] || symbols.academy; }
export function GroupVector({id, className}) {return <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{__html:groupSymbolMarkup(id)}} />;}
