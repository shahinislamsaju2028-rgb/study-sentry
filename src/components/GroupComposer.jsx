import { GroupVector, GROUP_SYMBOLS, GROUP_SYMBOL_LABELS, groupSymbolMarkup } from './GroupVector';
import React, { useMemo, useState } from 'react';
import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  ChevronRight,
  Code2,
  FlaskConical,
  Globe,
  GraduationCap,
  Landmark,
  Leaf,
  Microscope,
  MoonStar,
  Palette,
  Rocket,
  Sparkles,
  Target,
  Telescope,
  Trophy,
  UsersRound,
  Zap,
} from 'lucide-react';
import { bnNum } from '../utils/bangla';

/* ---------------------------------------------------------------------------
   Pre-made group templates — the student picks one and everything fills in.
   ------------------------------------------------------------------------- */
export const GROUP_TEMPLATES = [
  {
    id: 'hsc28',
    name: 'HSC ২৮ · এইচএসসি প্রস্তুতি',
    tagline: 'পরীক্ষার আগের সব প্রস্তুতি একসাথে — পড়া, নোট, সিলেবাস।',
    category: 'study',
    visibility: 'public',
    icon: 'academy',
  },
  {
    id: 'buet',
    name: 'বুয়েট মিশন ২৮',
    tagline: 'ভর্তি পরীক্ষার লক্ষ্যে নিয়মিত অধ্যায়ভিত্তিক প্রস্তুতি।',
    category: 'study',
    visibility: 'public',
    icon: 'mission',
  },
  {
    id: 'focus',
    name: 'ফোকাস স্টুডিও',
    tagline: 'সাথে পড়ি, সাথে থামি — প্রতিদিন ২ ঘণ্টা গভীর মনোযোগ।',
    category: 'productivity',
    visibility: 'public',
    icon: 'focus',
  },
  {
    id: 'revision',
    name: 'রিভিশন ক্লাব',
    tagline: 'সপ্তাহ শেষে দ্রুত রিভিশন, পরীক্ষার আগের শেষ ঝাঁক।',
    category: 'study',
    visibility: 'public',
    icon: 'revision',
  },
  {
    id: 'science',
    name: 'সায়েন্স স্টাডি হাব',
    tagline: 'পদার্থ, রসায়ন, জীব — ধারণা পরিষ্কার করতে লেব আর প্রশ্ন।',
    category: 'study',
    visibility: 'public',
    icon: 'science',
  },
  {
    id: 'programming',
    name: 'কোডিং ক্লাব',
    tagline: 'প্রোগ্রামিং ধরে ধরে শিখি, প্রতি সপ্তাহে একটি ছোট প্রজেক্ট।',
    category: 'study',
    visibility: 'public',
    icon: 'code',
  },
  {
    id: 'math',
    name: 'ম্যাথ ওডিসি',
    tagline: 'অলিম্পিয়াডের প্রশ্ন, সমাধান আর মাথা খাটানোর আগাম প্রস্তুতি।',
    category: 'study',
    visibility: 'public',
    icon: 'math',
  },
  {
    id: 'english',
    name: 'ইংরেজি স্পিংকিং ক্লাব',
    tagline: 'প্রতিদিন লেখা, পড়া আর উচ্চারণ অনুশীলন।',
    category: 'study',
    visibility: 'public',
    icon: 'voice',
  },
  {
    id: 'night',
    name: 'রাত্রি জেগে স্টাডি',
    tagline: 'রাত ১১টার পরের নীরব সেশন — কেবল গভীর মনোযোগের জন্য।',
    category: 'productivity',
    visibility: 'public',
    icon: 'night',
  },
  {
    id: 'debate',
    name: 'ডিবেট ও প্রেজেন্টেশন',
    tagline: 'উপস্থাপনা, যুক্তি প্রমাণ আর আত্মবিশ্বাস তৈরির রুম।',
    category: 'study',
    visibility: 'public',
    icon: 'voice',
  },
];

/* ---------------------------------------------------------------------------
   Pre-made emblem icons — click to use as the group badge.
   ------------------------------------------------------------------------- */
export const GROUP_EMBLEMS = GROUP_SYMBOLS;

const EMBLEM_TINTS = [
  ['#fbbf24', '#f59e0b'],
  ['#34d399', '#10b981'],
  ['#60a5fa', '#3b82f6'],
  ['#f472b6', '#ec4899'],
  ['#a78bfa', '#8b5cf6'],
  ['#fb923c', '#f97316'],
  ['#22d3ee', '#06b6d4'],
  ['#f87171', '#ef4444'],
];

export function emblemDataUri(symbol, tintIndex = 0) {
  const [from, to] = EMBLEM_TINTS[tintIndex % EMBLEM_TINTS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 32 32"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#g)"/><g fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${groupSymbolMarkup(symbol)}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const CATEGORY_META = {
  study: { label: 'একাডেমিক', hint: 'পড়া ও পরীক্ষা', Icon: BookOpen, tint: '#fbbf24' },
  productivity: { label: 'ফোকাস', hint: 'রুটিন ও ডিসিপ্লিন', Icon: Target, tint: '#34d399' },
};

const VISIBILITY_META = {
  public: { label: 'পাবলিক', hint: 'সবাই খুঁজতে ও যুক্ত হতে পারবে', Icon: Globe },
  private: { label: 'প্রাইভেট', hint: 'শুধু আমন্ত্রণ কোড দিয়ে', Icon: Landmark },
};

/**
 * Premium "new group" composer.
 *
 * The student can start from a pre-made template, pick one of the pre-made
 * emblem icons, and everything else is filled in for them.
 */
export default function GroupComposer({
  name,
  setName,
  tagline,
  setTagline,
  category,
  setCategory,
  visibility,
  setVisibility,
  emblem,
  setEmblem,
  onUpload,
  onSubmit,
  busy,
  onClose,
}) {
  const [tintIndex, setTintIndex] = useState(0);

  const applyTemplate = (tpl) => {
    setName(tpl.name);
    setTagline(tpl.tagline);
    setCategory(tpl.category);
    setVisibility(tpl.visibility);
    setEmblem(tpl.icon);
  };

  const activeTemplate = useMemo(
    () => GROUP_TEMPLATES.find((t) => t.name === name && t.icon === emblem),
    [name, emblem]
  );

  return (
    <div className="v34-gc" role="region" aria-label="নতুন গ্রুপ তৈরি করুন">
      <header className="v34-gc-head">
        <span className="v34-gc-head-icon">
          <Sparkles size={17} />
        </span>
        <div className="v34-gc-head-copy">
          <strong>নতুন গ্রুপ তৈরি করুন</strong>
          <small>টেমপ্লেট বেছে নিন বা নিজের মতো সাজান — যেকোনো সময় বদলানো যাবে</small>
        </div>
        <button type="button" className="v34-gc-close" onClick={onClose} aria-label="বন্ধ">
          ✕
        </button>
      </header>

      {/* ---------- PRE-MADE TEMPLATES ---------- */}
      <section className="v34-gc-block">
        <div className="v34-gc-label">
          <Rocket size={13} /> প্রি-মেড গ্রুপ টেমপ্লেট
          <em>এক ক্লিকেই সব নিয়ে আসবে</em>
        </div>
        <div className="v34-gc-templates">
          {GROUP_TEMPLATES.map((tpl) => (
            <button
              type="button"
              key={tpl.id}
              className={`v34-gc-template ${activeTemplate?.id === tpl.id ? 'is-active' : ''}`}
              onClick={() => applyTemplate(tpl)}
            >
              <span className="v34-gc-template-icon"><GroupVector id={tpl.icon} /></span>
              <span className="v34-gc-template-copy">
                <strong>{tpl.name}</strong>
                <small>{tpl.tagline}</small>
              </span>
              <ChevronRight size={14} className="v34-gc-template-go" />
            </button>
          ))}
        </div>
      </section>

      {/* ---------- EMBLEM PICKER ---------- */}
      <section className="v34-gc-block">
        <div className="v34-gc-label">
          <Palette size={13} /> গ্রুপ আইকন
          <em>একটি বেছে নিন বা নিজের ছবি আপলোড করুন</em>
        </div>
        <div className="v34-gc-emblem-row">
          <div className="v34-gc-emblem-preview">
            <span><GroupVector id={emblem || 'focus'} /></span>
          </div>
          <div className="v34-gc-emblem-grid">
            {GROUP_EMBLEMS.map((e) => (
              <button
                type="button"
                key={e}
                className={`v34-gc-emblem ${emblem === e ? 'is-active' : ''}`}
                onClick={() => setEmblem(e)}
                aria-label={`আইকন ${GROUP_SYMBOL_LABELS[e]}`} aria-pressed={emblem === e}
              >
                <GroupVector id={e} />
              </button>
            ))}
          </div>
        </div>
        <div className="v34-gc-tints">
          <span>রঙ</span>
          {EMBLEM_TINTS.map(([from], i) => (
            <button
              type="button"
              key={from}
              className={`v34-gc-tint ${tintIndex === i ? 'is-active' : ''}`}
              style={{ background: `linear-gradient(135deg, ${from}, ${EMBLEM_TINTS[i][1]})` }}
              onClick={() => setTintIndex(i)}
              aria-label={`রঙ ${bnNum(i + 1)}`}
            />
          ))}
          <label className="v34-gc-upload">
            <UsersRound size={13} /> নিজের ছবি
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} />
          </label>
        </div>
      </section>

      {/* ---------- DETAILS ---------- */}
      <section className="v34-gc-block">
        <div className="v34-gc-label">
          <BookOpen size={13} /> গ্রুপের তথ্য
        </div>
        <div className="v34-gc-fields">
          <label className="v34-gc-field">
            <span>গ্রুপের নাম</span>
            <input
              value={name}
              maxLength={80}
              placeholder="যেমন: বুয়েট মিশন ২৮"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="v34-gc-field">
            <span>সংক্ষিপ্ত পরিচিতি (ঐচ্ছিক)</span>
            <input
              value={tagline}
              maxLength={180}
              placeholder="এই রুমে কী হবে — এক লাইনে"
              onChange={(e) => setTagline(e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* ---------- CATEGORY + VISIBILITY ---------- */}
      <section className="v34-gc-block">
        <div className="v34-gc-label">
          <Target size={13} /> ধরন ও দৃশ্যমানতা
        </div>
        <div className="v34-gc-picks">
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const Icon = meta.Icon;
            return (
              <button
                type="button"
                key={key}
                className={`v34-gc-pick ${category === key ? 'is-active' : ''}`}
                style={{ '--pick-tone': meta.tint }}
                onClick={() => setCategory(key)}
              >
                <span className="v34-gc-pick-icon">
                  <Icon size={15} />
                </span>
                <span className="v34-gc-pick-copy">
                  <strong>{meta.label}</strong>
                  <small>{meta.hint}</small>
                </span>
              </button>
            );
          })}
          {Object.entries(VISIBILITY_META).map(([key, meta]) => {
            const Icon = meta.Icon;
            return (
              <button
                type="button"
                key={key}
                className={`v34-gc-pick ${visibility === key ? 'is-active' : ''}`}
                style={{ '--pick-tone': '#60a5fa' }}
                onClick={() => setVisibility(key)}
              >
                <span className="v34-gc-pick-icon">
                  <Icon size={15} />
                </span>
                <span className="v34-gc-pick-copy">
                  <strong>{meta.label}</strong>
                  <small>{meta.hint}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <footer className="v34-gc-foot">
        <p className="v34-gc-hint">
          <Atom size={13} /> তৈরির পর গ্রুপটি “যুক্ত স্টাডি রুমসমূহ”-এ সুন্দর রাউন্ড কার্ড হিসেবে দেখা যাবে।
        </p>
        <button
          type="button"
          className="v34-gc-submit"
          disabled={busy || !name.trim()}
          onClick={() => onSubmit(tintIndex)}
        >
          <Sparkles size={14} /> {busy ? 'তৈরি হচ্ছে…' : 'গ্রুপ তৈরি করুন'}
        </button>
      </footer>
    </div>
  );
}

/* Small helpers kept local so the composer stays self-contained. */
export const GROUP_META_ICONS = {
  Atom,
  Brain,
  Calculator,
  Code2,
  FlaskConical,
  GraduationCap,
  Microscope,
  MoonStar,
  Telescope,
  Trophy,
  UsersRound,
  Zap,
};
