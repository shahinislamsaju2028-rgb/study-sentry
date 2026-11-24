# ওয়েব ভার্সন — হোস্টিং গাইড

`npm run build:web` → `dist-web/` (৩২টি ফাইল, ~৪ MB)।
সম্পূর্ণ স্ট্যাটিক — কোনো সার্ভার কোড, API বা ডেটাবেস লাগে না।

---

## Netlify — সবচেয়ে সহজ

1. **https://app.netlify.com/drop** খুলুন
2. `dist-web/` ফোল্ডারটা (অথবা তার zip) **ড্র্যাগ করে ছেড়ে দিন**
3. লিংক পেয়ে যাবেন, যেমন `https://random-name.netlify.app`

---

## Vercel

```bash
npx vercel --prod
# ফোল্ডার হিসেবে dist-web/ দেখান
```

---

## Cloudflare Pages

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages**
2. **Upload assets** → `dist-web/` আপলোড → **Deploy**

---

## GitHub Pages

```bash
cd dist-web
git init && git add -A && git commit -m "Study Sentry web build"
git branch -M main
git remote add origin https://github.com/<user>/study-sentry-web.git
git push -u origin main
```

রিপো → **Settings → Pages** → Source: **main / (root)** → **Save**

লিংক: `https://<user>.github.io/study-sentry-web/`

> `base: './'` সেট করা আছে, তাই subpath-এও ঠিক চলবে।

---

## নিজের VPS (nginx)

```bash
scp -r dist-web user@server:/var/www/study-sentry
```

```nginx
location /study-sentry/ {
    alias /var/www/study-sentry/;
    try_files $uri $uri/ /study-sentry/index.html;
}
```

---

## ডেভ সার্ভারে চালিয়ে দেখা

```bash
npm run build:web
cd dist-web && python3 -m http.server 8080
# → http://localhost:8080
```

---

## কী কাজ করে, কী করে না

| ✅ কাজ করে | ❌ কাজ করে না |
|---|---|
| সব ১১টি ভিউ, UI, 3D মোশন | Windows নোটিফিকেশন |
| ফোকাস টাইমার, পমোডোরো, স্টপওয়াচ | ফাইল ডায়ালগ (এক্সপোর্ট/ইমপোর্ট) |
| স্প্রিন্ট প্ল্যানার, ইনসাইটস, র্যাংক | Focus Guard (প্রসেস মনিটর) |
| Tasks, Kanban, Routine, Tracker | Always-on-top PiP |
| ডেটা সেভ — **localStorage** | SQLite ডেটাবেস |

**ডেটা:** ব্রাউজারের `localStorage`-এ। একই ব্রাউজার + ডোমেইনে ফিরলে পাবেন।
ক্যাশে/ডেটা ক্লিয়ার করলে মুছে যাবে — মাঝে মাঝে **Theme & Backup** থেকে ব্যাকআপ নিন।
একাধিক ডিভাইসে সিঙ্ক হয় না।

**প্রথমবার:** ডেমো ডেটা লোড হয় (স্ট্রিক, স্প্রিন্ট, অধ্যায়)।
**Settings → Reset** দিয়ে পরিষ্কার শুরু করুন।

---

## হোস্টিং চেকলিস্ট

- [ ] `index.html` ফোল্ডারের **রুটে** আছে
- [ ] `assets/` ফোল্ডার `index.html`-এর **পাশে** আছে
- [ ] HTTPS (localStorage-এর জন্য ভালো)
- [ ] MIME: `.js → application/javascript`, `.css → text/css`
- [ ] SPA রি-রাইট `/* → /index.html` — সাধারণত **লাগে না**
