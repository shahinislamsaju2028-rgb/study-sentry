/* Kept as the public entry point for backwards compatibility.
   The real logic now lives in `groupSubjects.js` so the curriculum loader and
   the subject menus can never drift apart again. */
export {
  COMMON_HSC_SUBJECTS,
  GROUP_SUBJECTS,
  ACADEMIC_GROUP_LABELS,
  normalizeAcademicGroup,
  getAcademicGroup,
  getGroupSubjectNames,
  getAcademicSubjectChoices,
  getAcademicGroupDefaults,
  isSubjectInGroup,
  isAcademicGroupSubject,
  groupCatalogKeys,
} from './groupSubjects';
