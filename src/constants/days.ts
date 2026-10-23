/** Friday, as returned by `Date.prototype.getDay()`. */
export const FRIDAY = 5;

/** Weekday labels indexed by `Date.getDay()` (0 = Sunday). */
export const DAY_NAME_BY_INDEX: readonly string[] = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
];

/** Saturday-first ordering, as used by the weekday checkbox grid. */
export const WEEKDAYS_ALL: readonly string[] = [
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة'
];

export const WEEKDAYS_NO_FRIDAY: readonly string[] = WEEKDAYS_ALL.filter(day => day !== 'الجمعة');
