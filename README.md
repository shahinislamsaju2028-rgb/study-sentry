# Study Sentry

**HSC শিক্ষার্থীদের জন্য সম্পূর্ণ স্টাডি ওয়ার্কস্পেস** — ফোকাস টাইমার, স্প্রিন্ট
প্ল্যানার, অগ্রগতি বিশ্লেষণ, রুটিন ও সিলেবাস ট্র্যাকিং একসাথে।

Tauri 2 · React 19 · TypeScript · Rust · SQLite

---

## বিল্ড টার্গেট

| টার্গেট | আউটপুট | কমান্ড |
|---|---|---|
| **Windows ডেস্কটপ** | `*.exe` (NSIS ইনস্টলার, ~৪.৬ MB) | `npm run dist:win` |
| **ওয়েব (স্ট্যাটিক)** | `dist-web/` — যেকোনো হোস্টে | `npm run build:web` |
| ডেভ সার্ভার | `localhost:5173` | `npm run dev` |

---

## শুরু করুন

```bash
npm install

npm run dev        # http://localhost:5173 — ব্রাউজার প্রিভিউ
npm run tauri:dev  # নেটিভ উইন্ডোতে চালান (Rust লাগবে)
```

### উইন্ডোজ ইনস্টলার (Windows-এ)

```powershell
npm install
npm run dist:win
# → src-tauri/target/release/bundle/nsis/*.exe
```

### উইন্ডোজ ইনস্টলার (Linux থেকে cross-compile)

```bash
rustup target add x86_64-pc-windows-gnu
sudo apt install gcc-mingw-w64-x86-64 binutils-mingw-w64-x86-64 nsis libayatana-appindicator3-dev
npm ci
npx tauri build --target x86_64-pc-windows-gnu --bundles nsis
# → src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/*.exe
```

> বিস্তারিত: [`docs/build/BUILD_WINDOWS_EXE.md`](docs/build/BUILD_WINDOWS_EXE.md)

### ওয়েব বিল্ড

```bash
npm run build:web   # → dist-web/
```

`dist-web/` ফোল্ডারটা যেকোনো স্ট্যাটিক হোস্টে (Netlify, Vercel, Cloudflare Pages,
GitHub Pages, nginx) আপলোড করুন। ডেটা ব্রাউজারের `localStorage`-এ থাকবে।

> বিস্তারিত: [`docs/web/HOSTING.md`](docs/web/HOSTING.md)

---

## স্ক্রিপ্ট

| স্ক্রিপ্ট | কাজ |
|---|---|
| `npm run dev` | Vite ডেভ সার্ভার (ব্রাউজার প্রিভিউ, JSON স্টোরেজ) |
| `npm run dev:web` | স্ট্যান্ডঅ্যালোন ডেভ সার্ভার (পোর্ট ৫১৭৪) |
| `npm run build` | `tsc --noEmit` + Vite প্রোডাকশন বিল্ড → `dist/` |
| `npm run build:web` | স্ট্যাটিক ওয়েব বিল্ড → `dist-web/` |
| `npm run typecheck` | শুধু TypeScript যাচাই |
| `npm run tauri:dev` | নেটিভ ডেস্কটপ ডেভ |
| `npm run dist:win` | উইন্ডোজ NSIS ইনস্টলার |
| `npm test` | রিগ্রেশন টেস্ট স্যুট |

---

## প্রজেক্ট স্ট্রাকচার

```
StudySentry/
├── src/                        # React অ্যাপ
│   ├── views/                  # ১১টি স্ক্রিন (Home, Focus, Insights, Sprint, …)
│   ├── components/             # পুনর্ব্যবহারযোগ্য UI (TaskBoard, Pickers, Scene)
│   ├── context/                # StudyContext — কেন্দ্রীয় স্টেট ও পারসিস্টেন্স
│   ├── utils/                  # seedData, bangla, phase, sprint helpers
│   ├── styles/                 # স্তরভিত্তিক CSS (v2 … v48)
│   ├── bridge/                 # Tauri ↔ ব্রাউজার অ্যাবস্ট্রাকশন
│   ├── standalone-entry.tsx    # ওয়েব বিল্ডের এন্ট্রি
│   └── main.tsx                # ডেস্কটপ এন্ট্রি
├── src-tauri/                  # Rust ব্যাকএন্ড
│   ├── src/                    # SQLite, উইন্ডো, IPC
│   ├── windows/hooks.nsh       # NSIS ইনস্টলার হুক
│   ├── third_party/webview2/   # WebView2Loader শিম
│   └── tauri.conf.json         # বান্ডল কনফিগ
├── tests/                      # Node রিগ্রেশন টেস্ট (jsdom)
├── docs/
│   ├── build/                  # উইন্ডোজ বিল্ড নির্দেশিকা
│   ├── release/                # রিলিজ নোট ও স্কোপ
│   ├── web/                    # ওয়েব হোস্টিং গাইড
│   └── curriculum-sources/     # HSC ২০২৮ অধ্যায়-তালিকা সোর্স
├── cloud/                      # Study Circle SQL মাইগ্রেশন
├── data/                       # ডেভ JSON স্টোরেজ (gitignored)
├── scripts/                    # ক্যাটালগ জেনারেটর
├── public/                     # স্ট্যাটিক অ্যাসেট (icon, font)
├── .dev/                       # লোকাল ডেভ হারনেস (শিপিংয়ে যাবে না)
├── index.html                  # ডেস্কটপ/ডেভ এন্ট্রি
├── standalone.html             # ওয়েব এন্ট্রি
├── vite.config.ts              # ডেস্কটপ বিল্ড কনফিগ
└── vite.config.standalone.ts   # ওয়েব বিল্ড কনফিগ
```

---

## ফিচার

| ভিউ | কী করে |
|---|---|
| **Study Center** (হোম) | ৮টি Bento কার্ডে সব টুলের আজকের অবস্থা + কুইক কন্ট্রোল ডক |
| **Focus Session** | পমোডোরো, স্টপওয়াচ, ঘুমন্ত-ছেলে দৃশ্য, দেয়ালে ঘড়ি (অ্যানালগ ⇄ ডিজিটাল) |
| **Insights & Rank** | ৩D সাবজেক্ট বার, ডোনাট, ৭-দিনের ট্রেন্ড, র‍্যাংক স্ট্রিপ |
| **Tasks & Kanban** | টাস্ক বোর্ড, সাব-টাস্ক, আইকন-চিপ, período ভিত্তিক ফিল্টার |
| **Weekly Routine** | ৫ প্রহরের রুটিন গ্রিড |
| **Sprint Planner** | ৩৬টি প্রিসেট নাম, অধ্যায়-মাল্টিপিকার, ডান-ক্লিক এডিট |
| **Daily Tracker** | ৭ বিষয় × ৪ অ্যাক্টিভিটি ম্যাট্রিক্স |
| **Student Suite** | সিলেবাস (৪ স্তর), পরীক্ষা কাউন্টডাউন, ফ্ল্যাশকার্ড |
| **Study Lounge** | Study Circle — লাইভ রুম, লিডারবোর্ড |
| **Overview** | স্প্রিন্ট ওভারভিউ, দৈনিক প্রহর বণ্টন |
| **Settings** | থিম, ব্যাকআপ, Focus Guard, Junk Note |

### ফোকাস প্রহর (৫টি)

| প্রহর | সময় |
|---|---|
| ভোর | ৫:৩০ – ১০:০০ |
| সকাল | ১০:০১ – ২:০০ |
| দুপুর | ২:০১ – ৬:০০ |
| রাত | ৬:০১ – ১০:০০ |
| গভীর রাত | ১০:০১ – ২:০০ |

---

## ডেটা

**ডেস্কটপ:** Rust + SQLite (WAL), `%APPDATA%\com.studysentry.desktop.personal\study-sentry.db`
**ওয়েব:** ব্রাউজারের `localStorage` (ডোমেইন-ভিত্তিক)

দুটোতেই শেপ একই — তাই ওয়েব থেকে ব্যাকআপ নিয়ে ডেস্কটপে ইমপোর্ট করা যায়।

---

## টেস্ট

```bash
npm test              # সম্পূর্ণ স্যুট
node tests/v45-redesign-check.mjs   # শুধু UI রিডিজাইন
```

কিছু টেস্ট পুরোনো স্ক্রিন-লেআউট ধরে রাখে — দেখুন [`tests/STALE_TESTS.md`](tests/STALE_TESTS.md)।

---

## লাইসেন্স

MIT — দেখুন [`LICENSE`](LICENSE)

সাবজেক্ট আইকন ও বাংলা ফন্টের লাইসেন্স: [`THIRD_PARTY_NOTICES.txt`](THIRD_PARTY_NOTICES.txt)
