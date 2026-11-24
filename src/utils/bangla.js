// Display helpers. Stored identifiers, user-entered text and old records are never rewritten.
// Study Sentry bilingual policy: every app-generated digit, date, time, countdown and percentage
// is shown in English (Latin numerals). Bengali is used for descriptions, prompts, statuses and
// display names of subjects/projects; user-authored text is never rewritten.
export const bnNum = value => String(value ?? '');
export const bnDate = (value,options={}) => {
  const d=new Date(value);
  if(!d||Number.isNaN(d.getTime())) return String(value||'');
  const opt={...options};
  if(!('dateStyle' in opt)&&!('timeStyle' in opt)&&!['year','month','day','weekday'].some(k=>k in opt)){
    opt.year='numeric';opt.month='short';opt.day='numeric';
  }
  return d.toLocaleDateString('en-US',opt);
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
export const bnSubject = name => String(name || 'General');
export const bnActivity = name => formatActivityLabel(name);
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
 'Ch 1: Physical World & Measurement':'অধ্যায় 1: ভৌত জগৎ ও পরিমাপ','Ch 2: Vectors':'অধ্যায় 2: ভেক্টর','Ch 4: Newtonian Mechanics':'অধ্যায় 4: নিউটনীয় বলবিদ্যা','Ch 9.1–9.3: Limits & Differentiation':'অধ্যায় 9.1–9.3: সীমা ও অন্তরীকরণ','Ch 9.4–9.6: Successive & Maxima/Minima':'অধ্যায় 9.4–9.6: অন্তরীকরণের প্রয়োগ','Ch 2: Qualitative Chemistry':'অধ্যায় 2: গুণগত রসায়ন','Ch 3: Number Systems & Digital Logic':'অধ্যায় 3: সংখ্যা পদ্ধতি ও ডিজিটাল লজিক',
 'Physics (50/10 x2)':'পদার্থবিজ্ঞান (50/10 × 2)','College / Lab + Break':'কলেজ / ল্যাব ও বিরতি','Higher Math Problem Set':'উচ্চতর গণিতের সমস্যা','Mathematics Calculus':'গণিতের ক্যালকুলাস','Classes & Notes Cleanup':'ক্লাস ও নোট গুছানো','Chemistry Organic/Qual.':'রসায়ন অনুশীলন','Physics Mechanics':'পদার্থবিজ্ঞানের বলবিদ্যা','English + ICT Practice':'ইংরেজি ও আইসিটি অনুশীলন','Past Paper CQ Solve':'বিগত প্রশ্ন সমাধান','Chemistry Deep Focus':'রসায়নে নিবিড় ফোকাস','Classes + Rest':'ক্লাস ও বিশ্রাম','Mathematics Revision':'গণিত পুনরাবৃত্তি','ICT & Programming':'আইসিটি ও প্রোগ্রামিং','Physics Lab / Notes':'পদার্থবিজ্ঞানের ল্যাব ও নোট','Timed MCQ Mock Test':'সময়ের মধ্যে বহুনির্বাচনী পরীক্ষা','Weak-Topic Catchup':'দুর্বল বিষয় অনুশীলন','English Writing & Reading':'ইংরেজি লেখা ও পড়া','Flashcards & Weekly Review':'স্মৃতিকার্ড ও সাপ্তাহিক পর্যালোচনা','Weekly review & practice':'সাপ্তাহিক পর্যালোচনা ও অনুশীলন','Full Model Test (3h)':'সম্পূর্ণ মডেল পরীক্ষা (3 ঘণ্টা)','Mistake Analysis + Rest':'ভুল বিশ্লেষণ ও বিশ্রাম','Next Week Planning':'পরের সপ্তাহের পরিকল্পনা'
};
export const bnSample = (text,isDemo) => String(text||'');
export const bnTask = (title,isDemo) => SUBJECTS[String(title||'')] ? bnSubject(title) : bnSample(title,isDemo);
