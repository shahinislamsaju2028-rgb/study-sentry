/* ============================================================================
   GROUP-AWARE HSC SUBJECTS  (v43)
   ----------------------------------------------------------------------------
   The earlier build hard-wired the বিজ্ঞান (science) track everywhere:
   pre-made chapters always merged science + humanities + business into one
   flat catalog, and the subject menus always fell back to
   Physics / Chemistry / Math / Biology.

   Now the selected academic group drives EVERY menu:
     • বাংলা · ইংলিশ · আইসিটি  → common, always present for every group
     • বিজ্ঞান                   → পদার্থ · রসায়ন · গণিত · উচ্চতর গণিত · জীববিজ্ঞান
     • মানবিক                   → ইতিহাস · সমাজবিজ্ঞান · অর্থনীতি · … (৯টি)
     • ব্যবসায় শিক্ষা             → হিসাববিজ্ঞান · ব্যবসায় সংগঠন · … (৬টি)

   Switching the group swaps every chapter list, subject menu and pre-made
   picker — the science chapters disappear completely.
   ========================================================================== */

/** Subjects every HSC group takes, whatever the stream. */
export const COMMON_HSC_SUBJECTS = ['Bangla', 'English', 'ICT'];

/** The complete pool of subjects for each academic group. */
export const GROUP_SUBJECTS = {
  science: ['Physics', 'Chemistry', 'Math', 'Biology'],
  humanities: [
    'History',
    'Sociology',
    'Economics',
    'Psychology',
    'Civics & Good Governance',
    'Logic',
    'Geography & Environment',
    'Islamic History & Culture',
    'Social Work',
  ],
  business: [
    'Accounting',
    'Business Organization & Management',
    'Finance, Banking & Insurance',
    'Production Management & Marketing',
    'Statistics',
    'Economics',
    'Geography & Environment',
  ],
};

/**
 * The group's own subjects (without the three common ones) — the default
 * pick list in the academic setup sheet.
 */
export function getAcademicGroupDefaults(group) {
  return [...GROUP_SUBJECTS[normalizeAcademicGroup(group)]];
}

/** Human-friendly names used in the setup sheet. */
export const ACADEMIC_GROUP_LABELS = {
  science: 'বিজ্ঞান',
  humanities: 'মানবিক',
  business: 'ব্যবসায় শিক্ষা',
};

export function normalizeAcademicGroup(raw) {
  const key = String(raw || '').trim().toLowerCase();
  if (key === 'science' || key === 'humanities' || key === 'business') return key;
  return 'science';
}

/** The group recorded on the profile, falling back to science. */
export function getAcademicGroup(profile = {}) {
  return normalizeAcademicGroup(profile?.academicGroup);
}

/** Every subject that belongs to the given group (common subjects included). */
export function getGroupSubjectNames(group) {
  const key = normalizeAcademicGroup(group);
  return [...new Set([...COMMON_HSC_SUBJECTS, ...GROUP_SUBJECTS[key]])];
}

/**
 * The subjects a student of this group may pick.
 * The group defines the pool; the student's own picks narrow it further.
 * A subject from another group is never offered.
 */
export function getAcademicSubjectChoices(profile = {}) {
  const group = getAcademicGroup(profile);
  const allowed = new Set([...COMMON_HSC_SUBJECTS, ...GROUP_SUBJECTS[group]]);
  const picked = Array.isArray(profile?.academicSubjects) ? profile.academicSubjects : [];
  const inGroup = picked.filter((name) => allowed.has(name));
  const base = inGroup.length ? inGroup : GROUP_SUBJECTS[group];
  return [...new Set([...COMMON_HSC_SUBJECTS, ...base])];
}

/** True when the subject belongs to the given group (common subjects do). */
export function isSubjectInGroup(subject, group) {
  const key = normalizeAcademicGroup(group);
  return (
    COMMON_HSC_SUBJECTS.includes(subject) || GROUP_SUBJECTS[key].includes(subject)
  );
}

/** True when the subject is group-specific (not one of the common three). */
export function isAcademicGroupSubject(subject) {
  return Object.values(GROUP_SUBJECTS).some((names) => names.includes(subject));
}

/**
 * Which pre-made chapter catalog keys belong to this group.
 * Business studies shares Economics + Geography & Environment with humanities,
 * so those two chapter lists stay reachable from the business track as well.
 */
export function groupCatalogKeys(group) {
  const key = normalizeAcademicGroup(group);
  if (key === 'science') {
    return ['Physics', 'Chemistry', 'Math', 'Biology'];
  }
  if (key === 'business') {
    return [
      'Accounting',
      'Business Organization & Management',
      'Finance, Banking & Insurance',
      'Production Management & Marketing',
      'Statistics',
      'Economics',
      'Geography & Environment',
    ];
  }
  return [...GROUP_SUBJECTS.humanities];
}
