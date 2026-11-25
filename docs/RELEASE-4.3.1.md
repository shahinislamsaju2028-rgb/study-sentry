# Study Sentry 4.3.1 — AI সাইটে টাইমার পজ

**তারিখ:** ২০২৬-১১-২২ · **ব্রিফ:** 7.txt ① · **আগের ভার্সন:** 4.3.0

---

## কী চাওয়া হয়েছিল

> arena.ai, Gemini, NotebookLM — এগুলো অ্যালাউ করা থাকবে, কিন্তু এগুলোতে
> যখন যাওয়া হবে তখন টাইমার অটোমেটিকলি পজ হবে। Sumatra PDF, PotPlayer-এ
> ফিরলে আবার কাউন্ট রিজিউম হবে।

## যেভাবে হয়েছে

এখন Focus Guard-এ **দুই ধরনের "allowed"** আছে, আর পার্থক্যটা স্ক্রিনেই দেখা যায়:

| | মানে | উদাহরণ |
|---|---|---|
| **Allowed · টাইমার চলবে** | খোলা যাবে, সময় গোনা হবে | Study Sentry, SumatraPDF, PotPlayer, BlueStacks |
| **Allowed · টাইমার পজ** | খোলা যাবে, **বন্ধ হবে না**, কিন্তু ঘড়ি থামবে | Gemini, NotebookLM, arena.ai/agent, Google sign-in |

আগে AI সাইটগুলো "allowed" হিসেবে গণ্য হত — অর্থাৎ সেখানে গেলে টাইমার চলতেই থাকত।
এখন সেগুলো `AllowedPausing` ভার্ডিক্ট পায়: ট্যাব বন্ধ হয় না, কোনো "violation"
পয়েন্ট ওঠে না, শুধু টাইমার `pausedByGuard` অবস্থায় থামে।

### পজ/রিজিউম

```
Gemini ট্যাবে যান   → shouldPause: true,  reason: "ai"   → টাইমার পজ
SumatraPDF-এ ফিরুন → shouldPause: false, reason: ""     → টাইমার রিজিউম
Discord খুলুন      → shouldPause: true,  reason: "app"  → টাইমার পজ + সতর্কবার্তা
```

AI সাইটের টোস্ট আরো নরম: *"AI সাইটে আছেন — টাইমার নিজে থেকেই পজ আছে। পড়ায় ফিরলেই আবার চলবে।"*
ব্লকড অ্যাপে আগের মতোই সতর্কবার্তা + সাউন্ড।

---

## যা বদলেছে (ফাইল ধরে)

| ফাইল | পরিবর্তন |
|---|---|
| `src-tauri/src/guard.rs` | নতুন `BraveUrlVerdict::AllowedPausing` ও `ForegroundVerdict::AllowedButPausing`; AI হোস্টগুলো এখন এই ভার্ডিক্ট দেয়; `guard://focus-state` এ `reason: "ai"` পাঠায়; ট্যাব/প্রসেস ক্লোজ হয় না |
| `src/context/StudyContext.jsx` | গার্ড-হ্যান্ডলার এক জায়গায় (`applyGuardFocusState`), `reason: 'ai'` এর জন্য আলাদা টোস্ট, ব্রাউজার প্রিভিউরে `window.__studySentryGuardFocus` |
| `src/components/StrictGuardPanel.jsx` | UI দুই ভাগে — "টাইমার চলবে" আর "AI সাইট · খোলা যাবে (পজ)"; AI কার্ডে `পজ` চিপ |
| `src/styles/v49-sprint-unify.css` | `.v30-guard-ai-chip`, `.is-ai`, `.is-idle` |

---

## যাচাই

### Rust লজিক (`tests/rust/run.sh` — নতুন, প্ল্যাটফর্ম-নিরপেক্ষ)

`guard.rs` থেকে শুধু বিশুদ্ধ ফাংশনগুলো কেটে নিয়ে plain Rust test বাইনারিতে চালায়:

```
test ai_sites_are_allowed_but_pausing ... ok
test arena_agent_pauses_only_when_enabled ... ok
test blank_and_internal_pages ... ok
test other_sites_are_still_blocked ... ok
test study_apps_stay_counted ... ok
test result: ok. 5 passed; 0 failed
```

এতে প্রমাণ হয় — Gemini/NotebookLM/sign-in **কখনো ব্লকড নয়** (ট্যাব বন্ধ হবে না),
কিন্তু সেগুলো `AllowedPausing`; আর YouTube/Facebook আগের মতোই ব্লকড।

### ব্রাউজার ফ্লো (Playwright)

```
1. started          {status: running, pausedByGuard: false}
2. on Gemini        {status: paused,  pausedByGuard: true}   + AI টোস্ট
3. back to Sumatra  {status: running, pausedByGuard: false}  + রিজিউম টোস্ট
4. Discord opened   {status: paused,  pausedByGuard: true}   + সতর্ক টোস্ট
5. closed Discord   {status: running, pausedByGuard: false}
0 page errors
```

### বাকি

- `cargo check --target x86_64-pc-windows-gnu` — ক্লিন
- `tsc --noEmit` — ক্লিন
- `npm test` — ২০/২০ ও ১৩/১৩ ব্লকিং পাস
- ৭-ভিউ সুইপ — ০ এরর

---

## সীমাবদ্ধতা

অ্যাকটিভ উইন্ডো শনাক্তকরণ **শুধু Windows ডেস্কটপ বিল্ডে** কাজ করে (Rust + Win32 API)।
ওয়েব/ব্রাউজার সংস্করণে OS দেখার সুযোগ নেই, তাই সেখানে এই ফ্লো চালানোর জন্য
`window.__studySentryGuardFocus(payload)` হুক রাখা হয়েছে — শুধু প্রিভিউ ও টেস্টের জন্য।

---

## আপডেট

Windows ইনস্টলার ও একক-ফাইল ওয়েব বিল্ড নতুন করে তৈরি।

| ফাইল | লিঙ্ক |
|---|---|
| Windows ইনস্টলার | https://drive.google.com/file/d/1Qdt4Y3ewkHGTFCM84pWgd1H80TXbx1JH/view |
| একক-ফাইল ওয়েব | https://drive.google.com/file/d/1XNe1841tbqctnoeYGVh8ljHbN_J7eX2R/view |
| সোর্স | https://drive.google.com/file/d/1d43bcmgLvfYyaLYYxrDCW_jJHVocb4T8/view |

---

## v4.3.1-এর সাথে যুক্ত — হায়ারার্কি ও স্পেসিং পাস (`v52-hierarchy.css`)

ড্যাশবোর্ডের ভিজ্যুয়াল অর্ডার আরো পরিষ্কার করা হয়েছে। মূল ফাইলগুলোতে হাত না দিয়ে
শেষে লোড হওয়া একটি নতুন লেয়ারে কাজটা করা, তাই আগের কোনো রুল ভাঙেনি।

**১ · হিরো ব্যানার** — প্যাডিং `14/20` → `26/32`, উপাদানের ফাঁক `22` → `28`। বাঁ পাশে
ব্যাজ আর লেখার মাঝে ২০px। ডান পাশে টেলিমেট্রি · রিং · CTA তিনটির মাঝে ২৬px।
চওড়া ১০৮০px-এর নিচে নামলে ব্যানার আর নিজে থেকে ভেঙে এলোমেলো হয় না — পরিকল্পিত
দুই সারি: উপরে পরিচয়, নিচে পুরো প্রস্থে ইনস্ট্রুমেন্ট সারি।

**২ · কার্ড স্পেসিং** — গ্রিড গ্যাপ `14` → `18`, কার্ড প্যাডিং `18/20` → `22/24`,
ভেতরের ফাঁক `14` → `16`। আইকন-বক্স ৩৮ → ৪০px। কুইক-কন্ট্রোল ডক একই স্কেলে।

**৩ · টাইপোগ্রাফি** — একটাই মই, সব কার্ডে:

| স্তর | আগে | এখন |
|---|---|---|
| কার্ড শিরোনাম | 14.7px / 800 / #fff | **14.5 / 700 / #f8fafc** |
| সাবটাইটেল | 10.95px / 400 / #6f7989 | **11.5 / 500 / #8e9bb2** |
| মেট্রিক পিল | 11.25 / 800 | **12 / 800 / tabular** |
| বড় মেট্রিক | 24.75 / 800 | **30 / 800 / −0.028em** |
| মেট্রিক ক্যাপশন | 11.4px | **11.5 / 500** |
| হিরো শিরোনাম | 21px | **25px** |
| টেলিমেট্রি সংখ্যা | 21.3px | **26px** |

মেট্রিক সংখ্যাগুলো এখন `tabular-nums` — টিক-টিক করে পাল্টালেও চওড়া বদলায় না।

**৪ · পপওভার** — সব অ্যাংকরড মেনু (select, date/time picker, minute preset,
context menu) এখন এক ভাষায়: `blur(28px) saturate(155%)`, দুই স্তরের ছায়া,
স্পষ্ট হেয়ারলাইন, ভেতরে এক পিক্সেল কী-লাইন। hover = সাদা ওয়াশ,
selected = সোনালি ফিল + টিক, focus = সোনালি রিং — তিনটাই আলাদা চোখে পড়ে।

পাশাপাশি একটা পুরনো বাগ সারানো হয়েছে: ক্যালেন্ডার পপওভারের মাস/বছর ড্রপডাউন
`display:grid` পেয়ে যাওয়ায় লেবেল আর শেভরন দুই লাইনে ভাগ হয়ে বাটনটা ৩২px-এ
চেপে যাচ্ছিল। এখন সঠিক flex row — লেবেল বাঁয়ে, শেভরন ডানে।

**৫ · বটম ডক** — `blur(34px) saturate(175%)`, উজ্জ্বলতর এজ (`0.20`), নিচের দিকে
দিকনির্দেশক ছায়া। আইকনে hover করলে পেছনে একটা নরম কূপ ফোটে আর গ্লিফ উপরে ওঠে,
চাপলে কূপটা সংকুচিত হয়। অ্যাকটিভ অর্বে এখন হেলো রিং — তাই "সিলেক্টেড" আর
"হোভার" আর এক নয়।

**৬ · কলআউট ব্যানার** — অ্যালার্ম/গার্ড ব্যানার শেলের অংশ হিসেবে জায়গা নেয়।
মেন্টর কলআউট আর হিরোর ওপরে ভেসে থাকে না: `body:has()` দিয়ে কনটেন্টের উপরে
প্যাডিং রিজার্ভ হয়, তাই কোনো ব্যানার কোনো কনটেন্ট ঢাকে না। টোস্ট স্ট্যাক ডকের
উপরে সরে এসেছে (৯৬px) এবং পঠনযোগ্য সারফেস পেয়েছে।
