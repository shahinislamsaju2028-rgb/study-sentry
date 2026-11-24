// Unified Study Sentry activity set:
// - ক্লাস (replaces Recorded Class / Class)
// - লেকচার শিট রিভিউ (replaces Lecture Sheet / Lecture Sheet Practice)
// - প্র্যাকটিস (merges Book Practice / Cycle Book Solve + Question Bank / Question Bank Solve)
export const SUBJECT_ACTIVITIES = ['Class', 'Lecture Sheet Review', 'Practice', 'Revision'];

export function activityName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const low = raw.toLowerCase();
  if (
    low === 'recorded class' ||
    low === 'recorded' ||
    low === 'class' ||
    raw === 'রেকর্ডেড ক্লাস' ||
    raw === 'ক্লাস'
  ) {
    return 'Class';
  }
  if (
    low === 'lecture sheet' ||
    low === 'lecture sheet practice' ||
    low === 'lecture sheet review' ||
    low === 'sheet' ||
    raw === 'লেকচার শিট' ||
    raw === 'লেকচার শিট রিভিউ'
  ) {
    return 'Lecture Sheet Review';
  }
  if (
    low === 'question bank' ||
    low === 'question bank solve' ||
    low === 'book practice' ||
    low === 'cycle book solve' ||
    low === 'practice' ||
    low === 'practice / revision' ||
    low === 'bank' ||
    raw === 'কোশ্চেন ব্যাংক' ||
    raw === 'প্রশ্নব্যাংক' ||
    raw === 'বুক প্র্যাকটিস' ||
    raw === 'বই অনুশীলনী' ||
    raw === 'মূল বই অনুশীলন' ||
    raw === 'প্র্যাকটিস'
  ) {
    return 'Practice';
  }
  if (low === 'revision' || raw === 'রিভিশন') {
    return 'Revision';
  }
  return raw;
}

export const activityBangla = {
  Class: 'ক্লাস',
  'Recorded Class': 'ক্লাস',
  'রেকর্ডেড ক্লাস': 'ক্লাস',
  'ক্লাস': 'ক্লাস',
  'Lecture Sheet': 'লেকচার শিট রিভিউ',
  'Lecture Sheet Practice': 'লেকচার শিট রিভিউ',
  'Lecture Sheet Review': 'লেকচার শিট রিভিউ',
  'লেকচার শিট': 'লেকচার শিট রিভিউ',
  'লেকচার শিট রিভিউ': 'লেকচার শিট রিভিউ',
  Practice: 'প্র্যাকটিস',
  'Practice / Revision': 'প্র্যাকটিস',
  'Book Practice': 'প্র্যাকটিস',
  'Cycle Book Solve': 'প্র্যাকটিস',
  'Question Bank': 'প্র্যাকটিস',
  'Question Bank Solve': 'প্র্যাকটিস',
  'কোশ্চেন ব্যাংক': 'প্র্যাকটিস',
  'প্রশ্নব্যাংক': 'প্র্যাকটিস',
  'বুক প্র্যাকটিস': 'প্র্যাকটিস',
  'বই অনুশীলনী': 'প্র্যাকটিস',
  'প্র্যাকটিস': 'প্র্যাকটিস',
  Revision: 'রিভিশন',
  'রিভিশন': 'রিভিশন',
};

export function formatActivityLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (activityBangla[raw]) return activityBangla[raw];
  const canon = activityName(raw);
  return activityBangla[canon] || raw;
}
