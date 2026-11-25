// Display helpers. Stored identifiers, user-entered text and old records are never rewritten.
// Study Sentry bilingual policy: every app-generated digit, date, time, countdown and percentage
// is shown in English (Latin numerals). Bengali is used for descriptions, prompts, statuses and
// display names of subjects/projects; user-authored text is never rewritten.
export const bnNum = value => String(value ?? '');
/* `toLocaleDateString` is expensive — it builds an Intl.DateTimeFormat and
   walks the option bag on every call. bnDate is the hottest formatter in the
   app (it appeared at 31ms self-time in a single navigation profile) and it is
   called with the same handful of option shapes over and over, so the formatter
   is cached per option signature. Dates themselves are not cached; only the
   formatter object is, which is what Intl is designed for. */
const DATE_FMT_CACHE = new Map();
/* Keep every Intl option in the signature (including timeZone, hour12, etc.); a
   partial key could return a formatter with the wrong date/time presentation. */
const dateKeyFor = opt => JSON.stringify(
  Object.keys(opt).sort().map(key => [key, typeof opt[key], opt[key]])
);

export const bnDate = (value,options={}) => {
  const d=new Date(value);
  if(!d||Number.isNaN(d.getTime())) return String(value||'');
  const opt={...options};
  if(!('dateStyle' in opt)&&!('timeStyle' in opt)&&!['year','month','day','weekday'].some(k=>k in opt)){
    opt.year='numeric';opt.month='short';opt.day='numeric';
  }
  const key=dateKeyFor(opt);
  let fmt=DATE_FMT_CACHE.get(key);
  if(!fmt){
    try { fmt=new Intl.DateTimeFormat('en-US',opt); } catch { return d.toLocaleDateString('en-US',opt); }
    DATE_FMT_CACHE.set(key,fmt);
  }
  return fmt.format(d);
};
export const bnDateTime = (value,options={dateStyle:'medium',timeStyle:'short'}) => {
  const input=typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)?value+'+06:00':value;
  const d=new Date(input);
  if(!d||Number.isNaN(d.getTime())) return String(value||'');
  return d.toLocaleString('en-US',{...options,timeZone:'Asia/Dhaka'});
};
export const bnClock = value => String(value ?? '');
export function bnDuration(seconds){const s=Math.max(0,Math.floor(Number(seconds)||0)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h} hr ${m} min`:`${m} min`;}
export function bnShortDuration(seconds){const s=Math.max(0,Math.floor(Number(seconds)||0)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h} hr`:`${m} min`;}
const SUBJECTS={Physics:'পদার্থবিজ্ঞান',Chemistry:'রসায়ন',Math:'গণিত',Mathematics:'গণিত','Higher Math':'গণিত','Higher Mathematics':'গণিত',Biology:'জীববিজ্ঞান',English:'ইংরেজি',Bangla:'বাংলা',ICT:'আইসিটি','ICT & Coding':'আইসিটি',Class:'ক্লাস',General:'সাধারণ',Economics:'অর্থনীতি','Civics & Good Governance':'পৌরনীতি ও সুশাসন',Logic:'যুক্তিবিদ্যা',History:'ইতিহাস','Islamic History & Culture':'ইসলামের ইতিহাস ও সংস্কৃতি','Geography & Environment':'ভূগোল ও পরিবেশ',Sociology:'সমাজবিজ্ঞান','Social Work':'সমাজকর্ম',Psychology:'মনোবিজ্ঞান',Accounting:'হিসাববিজ্ঞান','Business Organization & Management':'ব্যবসায় সংগঠন ও ব্যবস্থাপনা','Finance, Banking & Insurance':'ফিন্যান্স, ব্যাংকিং ও বিমা','Production Management & Marketing':'উৎপাদন ব্যবস্থাপনা ও বিপণন',Statistics:'পরিসংখ্যান'};
import { formatActivityLabel } from './subjectActivities';
/* Math is shown in English in subject pickers. Legacy aliases remain valid
   stored values and resolve to the same visible subject name. */
const MATH_SUBJECTS = new Set(['Math', 'Mathematics', 'Higher Math', 'Higher Mathematics', 'ম্যাথ']);
export const bnSubject = name => {
  const raw = String(name || 'General');
  if (MATH_SUBJECTS.has(raw)) return 'Math';
  return raw;
};
export const bnActivity = name => formatActivityLabel(name);

/* 5.txt ① — chapter titles read "Ch 2: Vectors". On a syllabus card that meant
   a Latin numeral plus a number the reader never asked for. bnChapterName keeps
   only the name, in Bengali: it strips "Ch 4:", "Chapter 2 -", "অধ্যায় ২:" and
   range forms like "Ch 9.1–9.3:", then maps the known titles. Anything it can
   not parse is returned untouched, so user-authored titles are never mangled. */
const CHAPTER_NAME_BN = {
  'physical world & measurement': 'ভৌত জগৎ ও পরিমাপ',
  vectors: 'ভেক্টর',
  'newtonian mechanics': 'নিউটনীয় বলবিদ্যা',
  'limits & differentiation': 'সীমা ও অন্তরীকরণ',
  'successive & maxima/minima': 'অন্তরীকরণের প্রয়োগ',
  'qualitative chemistry': 'গুণগত রসায়ন',
  'number systems & digital logic': 'সংখ্যা পদ্ধতি ও ডিজিটাল লজিক',
  'ওয়েব ডিজাইন পরিচিতি এবং html': 'ওয়েব ডিজাইন পরিচিতি ও এইচটিএমএল',
  'ডেটাবেজ ম্যানেজমেন্ট সিস্টেম (dbms)': 'ডেটাবেজ ম্যানেজমেন্ট সিস্টেম (ডিবিএমএস)',
  'people or institutions making history': 'ইতিহাস নির্মাণকারী ব্যক্তি বা প্রতিষ্ঠান',
  dreams: 'স্বপ্ন',
  lifestyle: 'জীবনধারা',
  adolescence: 'কৈশোর',
  'youthful achievers': 'তরুণ সফল ব্যক্তিত্ব',
  relationships: 'সম্পর্ক',
  'human rights': 'মানবাধিকার',
  'education and life': 'শিক্ষা ও জীবন',
  'writing: cloze test, rearrange, graph/chart, story & informal letter':
    'লেখা: শূন্যস্থান পূরণ, বাক্য সাজানো, গ্রাফ বা চার্ট, গল্প ও অনানুষ্ঠানিক চিঠি',
  'grammar: prepositions & special uses of words/phrases':
    'ব্যাকরণ: পদান্বয়ী অব্যয় ও শব্দ বা বাক্যাংশের বিশেষ ব্যবহার',
  'grammar: completing sentences & right form of verbs':
    'ব্যাকরণ: বাক্য পূরণ ও ক্রিয়ার সঠিক রূপ',
  'grammar: narrative style (narration) & modifiers':
    'ব্যাকরণ: বর্ণনামূলক রীতি ও বিশেষক',
  'grammar: sentence connectors & synonym-antonym':
    'ব্যাকরণ: বাক্য সংযোজক ও সমার্থক-বিপরীতার্থক শব্দ',
  'grammar: punctuation & pronoun reference':
    'ব্যাকরণ: বিরামচিহ্ন ও সর্বনামের নির্দেশ',
  'writing: formal letter, email, report, paragraph & composition':
    'লেখা: আনুষ্ঠানিক চিঠি, ইমেইল, প্রতিবেদন, অনুচ্ছেদ ও রচনা',
};

export const bnChapterName = (raw) => {
  let text = String(raw || '').trim();
  if (!text) return '';
  text = text.replace(
    /^(?:ch|chapter|unit|ইউনিট|অধ্যায়|অধ্যায়ঃ|অধ্যায়:)\s*\.?\s*[0-9০-৯]+(?:\.[0-9০-৯]+)?(?:\s*[–\-]\s*[0-9০-৯]+(?:\.[0-9০-৯]+)?)?\s*[:.\-–—]?\s*/i,
    ''
  );
  text = text.replace(/^[0-9০-৯]+\s*[:.\-–—]\s*/, '');
  const key = text.toLowerCase().trim();
  if (CHAPTER_NAME_BN[key]) return CHAPTER_NAME_BN[key];
  return text || String(raw || '');
};
export const bnCategory = name => String(name || 'Study');
export const bnPriority = name => String(name || 'Medium');
export const bnRank = name => String(name || '');
export const bnDay = name => String(name || '');
const DEMO={
 'Personal Student':'শিক্ষার্থী','50/10 Deep Focus • Consistency beats intensity.':'নিয়মিত চর্চাই এগিয়ে নেয়।','A+ Distinction':'এ-প্লাস','30-Day Pre-Exam Monk Focus Challenge':'পরীক্ষার আগে 30 দিনের ফোকাস লক্ষ্য',
 '30-Day Deep Study Commitment':'30 দিনের পড়ার লক্ষ্য',
 'Morning Formula Revision':'সকালের সূত্র পুনরাবৃত্তি','Quick warm-up review before deep Pomodoro block.':'ফোকাস সেশনের আগে সংক্ষিপ্ত পুনরাবৃত্তি।','Review vector projection & projectile motion key equations.':'ভেক্টর ও প্রক্ষেপণের গুরুত্বপূর্ণ সূত্রগুলো দেখুন।','Vector dot & cross product formulas':'ভেক্টরের ডট ও ক্রস গুণনের সূত্র','Projectile max height & range':'প্রক্ষেপণের সর্বোচ্চ উচ্চতা ও পাল্লা',
 'Physics — Chapter 2 CQ & MCQ Solve':'পদার্থবিজ্ঞান — দ্বিতীয় অধ্যায়ের সৃজনশীল ও বহুনির্বাচনী','Board questions + conceptual problem set.':'বোর্ড প্রশ্ন ও ধারণাভিত্তিক অনুশীলন।','Focus on river-boat & rain-umbrella relative velocity problems.':'নদী-নৌকা ও বৃষ্টি-ছাতার আপেক্ষিক বেগ অনুশীলন।','Chapter 2 core theory recap':'দ্বিতীয় অধ্যায়ের মূল ধারণা','Solve 5 Board CQ problems':'পাঁচটি বোর্ড সৃজনশীল প্রশ্ন','25 timed MCQ practice':'সময়ের মধ্যে 25টি বহুনির্বাচনী',
 'Calculus — Differentiation Ex 9.4':'ক্যালকুলাস — অন্তরীকরণ অনুশীলনী 9.4','Chain rule & implicit function derivatives.':'চেইন রুল ও অন্তর্নিহিত ফাংশনের অন্তরক।','Work through examples 1–6':'উদাহরণ 1–6 অনুশীলন','Complete 12 exercise problems':'অনুশীলনীর 12টি সমস্যা',
 'Evening Walk & Stretch':'সন্ধ্যার হাঁটা ও ব্যায়াম','15m screen-free recharge before night study session.':'রাতের পড়ার আগে পর্দা থেকে বিরতি।','Night Flashcard & Mistake Log Review':'রাতের স্মৃতিকার্ড ও ভুলের তালিকা দেখা','Active recall before sleep.':'ঘুমের আগে মনে করে অনুশীলন।','Review 10 Chemistry & Physics flashcards':'রসায়ন ও পদার্থের 10টি স্মৃতিকার্ড',"Plan tomorrow's top 3 priorities":'আগামীকালের তিনটি গুরুত্বপূর্ণ কাজ',
 'Physics Paper 1 — Term Assessment':'পদার্থবিজ্ঞান প্রথম পত্র — সাময়িক পরীক্ষা','Higher Mathematics — Calculus Test':'উচ্চতর গণিত — ক্যালকুলাস পরীক্ষা','Semester / Final Board Preparation':'সেমিস্টার ও বোর্ড পরীক্ষার প্রস্তুতি','Chapters 1–5 (Vectors, Dynamics, Work-Energy, Gravity)':'প্রথম থেকে পঞ্চম অধ্যায়','Limits, Continuity, Differentiation & Applications':'সীমা, ধারাবাহিকতা ও অন্তরীকরণ','Full Syllabus Revision + Model Tests':'সম্পূর্ণ সিলেবাস পুনরাবৃত্তি ও মডেল পরীক্ষা',
 'Ch 1: Physical World & Measurement':'ভৌত জগৎ ও পরিমাপ','Ch 2: Vectors':'ভেক্টর','Ch 4: Newtonian Mechanics':'নিউটনীয় বলবিদ্যা','Ch 9.1–9.3: Limits & Differentiation':'সীমা ও অন্তরীকরণ','Ch 9.4–9.6: Successive & Maxima/Minima':'অন্তরীকরণের প্রয়োগ','Ch 2: Qualitative Chemistry':'গুণগত রসায়ন','Ch 3: Number Systems & Digital Logic':'সংখ্যা পদ্ধতি ও ডিজিটাল লজিক',
 'Physics (50/10 x2)':'পদার্থবিজ্ঞান (50/10 × 2)','College / Lab + Break':'কলেজ / ল্যাব ও বিরতি','Higher Math Problem Set':'উচ্চতর গণিতের সমস্যা','Mathematics Calculus':'গণিতের ক্যালকুলাস','Classes & Notes Cleanup':'ক্লাস ও নোট গুছানো','Chemistry Organic/Qual.':'রসায়ন অনুশীলন','Physics Mechanics':'পদার্থবিজ্ঞানের বলবিদ্যা','English + ICT Practice':'ইংরেজি ও আইসিটি অনুশীলন','Past Paper CQ Solve':'বিগত প্রশ্ন সমাধান','Chemistry Deep Focus':'রসায়নে নিবিড় ফোকাস','Classes + Rest':'ক্লাস ও বিশ্রাম','Mathematics Revision':'গণিত পুনরাবৃত্তি','ICT & Programming':'আইসিটি ও প্রোগ্রামিং','Physics Lab / Notes':'পদার্থবিজ্ঞানের ল্যাব ও নোট','Timed MCQ Mock Test':'সময়ের মধ্যে বহুনির্বাচনী পরীক্ষা','Weak-Topic Catchup':'দুর্বল বিষয় অনুশীলন','English Writing & Reading':'ইংরেজি লেখা ও পড়া','Flashcards & Weekly Review':'স্মৃতিকার্ড ও সাপ্তাহিক পর্যালোচনা','Weekly review & practice':'সাপ্তাহিক পর্যালোচনা ও অনুশীলন','Full Model Test (3h)':'সম্পূর্ণ মডেল পরীক্ষা (3 ঘণ্টা)','Mistake Analysis + Rest':'ভুল বিশ্লেষণ ও বিশ্রাম','Next Week Planning':'পরের সপ্তাহের পরিকল্পনা'
};
export const bnSample = (text,isDemo) => String(text||'');
export const bnTask = (title,isDemo) => SUBJECTS[String(title||'')] ? bnSubject(title) : bnSample(title,isDemo);
