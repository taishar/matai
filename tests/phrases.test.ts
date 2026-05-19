/**
 * Cross-mode phrase tests — every phrase from demo/phrases.html tested in both modes.
 *
 * Conventions:
 *   "single" mode → falls through to parseSingle; returns Date | null
 *   "range"  mode → tries parseNamedRange then splitRange; returns [Date,Date] | null
 *
 * Each phrase is tested in its primary mode (should always pass) and its
 * secondary mode (may return null, or a valid-but-different result).
 * Tests expecting null document that the phrase is NOT supported in that mode.
 */

import { describe, test, expect } from "bun:test";
import { parse } from "../src/parser";
import { en } from "../src/i18n/en";
import { he } from "../src/i18n/he";
import type { DateValue } from "../src/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}
function today(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}
function addDays(dt: Date, n: number): Date {
  const r = new Date(dt); r.setDate(r.getDate() + n); return r;
}
function addWeeks(dt: Date, n: number): Date { return addDays(dt, n * 7); }
function addMonths(dt: Date, n: number): Date {
  const r = new Date(dt); r.setMonth(r.getMonth() + n); return r;
}
function addYears(dt: Date, n: number): Date {
  const r = new Date(dt); r.setFullYear(r.getFullYear() + n); return r;
}
function startOfWeek(dt: Date, ws: number): Date {
  const r = new Date(dt); r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - ((r.getDay() - ws + 7) % 7)); return r;
}
function startOfMonth(dt: Date): Date { return new Date(dt.getFullYear(), dt.getMonth(), 1); }
function endOfMonth(dt: Date): Date { return new Date(dt.getFullYear(), dt.getMonth() + 1, 0); }
function startOfYear(dt: Date): Date { return new Date(dt.getFullYear(), 0, 1); }
function endOfYear(dt: Date): Date { return new Date(dt.getFullYear(), 11, 31); }
function startOfQ(year: number, q: number): Date { return new Date(year, q * 3, 1); }
function endOfQ(year: number, q: number): Date { return new Date(year, q * 3 + 3, 0); }
function curQ() { return Math.floor(today().getMonth() / 3); }
function prevQ(): [number, number] {
  const q = curQ(), yr = today().getFullYear();
  return q === 0 ? [3, yr - 1] : [q - 1, yr];
}
function nextQ(): [number, number] {
  const q = curQ(), yr = today().getFullYear();
  return q === 3 ? [0, yr + 1] : [q + 1, yr];
}

function ds(dt: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
function expectSingle(result: DateValue, expected: Date) {
  expect(result).toBeInstanceOf(Date);
  expect(ds(result as Date)).toBe(ds(expected));
}
function expectRange(result: DateValue, start: Date, end: Date) {
  expect(Array.isArray(result)).toBe(true);
  const [s, e] = result as [Date, Date];
  expect(ds(s)).toBe(ds(start));
  expect(ds(e)).toBe(ds(end));
}

// ── Section 1 — Fixed Points ─────────────────────────────────────────────────
// Primary mode: single. Range mode returns null (no connector, not a named range).

describe("fixed points / EN", () => {
  const T = today();
  test("today → single: today",   () => expectSingle(parse("today",     en, "single"), T));
  test("today → range: null",     () => expect(parse("today",           en, "range")).toBeNull());
  test("now → single: today",     () => expectSingle(parse("now",       en, "single"), T));
  test("now → range: null",       () => expect(parse("now",             en, "range")).toBeNull());
  test("tomorrow → single",       () => expectSingle(parse("tomorrow",  en, "single"), addDays(T, 1)));
  test("tomorrow → range: null",  () => expect(parse("tomorrow",        en, "range")).toBeNull());
  test("yesterday → single",      () => expectSingle(parse("yesterday", en, "single"), addDays(T, -1)));
  test("yesterday → range: null", () => expect(parse("yesterday",       en, "range")).toBeNull());
});

describe("fixed points / HE", () => {
  const T = today();
  test("היום → single",      () => expectSingle(parse("היום",  he, "single"), T));
  test("היום → range: null", () => expect(parse("היום",        he, "range")).toBeNull());
  test("מחר → single",       () => expectSingle(parse("מחר",   he, "single"), addDays(T, 1)));
  test("מחר → range: null",  () => expect(parse("מחר",         he, "range")).toBeNull());
  test("אתמול → single",     () => expectSingle(parse("אתמול", he, "single"), addDays(T, -1)));
  test("אתמול → range: null",() => expect(parse("אתמול",       he, "range")).toBeNull());

  // מחרתיים is a day dual-form; the parser skips day-unit duals in range mode.
  test("מחרתיים → single: day+2",  () => expectSingle(parse("מחרתיים", he, "single"), addDays(T, 2)));
  test("מחרתיים → range: null",    () => expect(parse("מחרתיים",       he, "range")).toBeNull());
});

// ── Section 2 — Future Offsets ───────────────────────────────────────────────
// "in N unit" constructs are single-only.
// Hebrew dual forms (שבועיים, חודשיים) also work in range mode as [today, today+N].

describe("future offsets / EN", () => {
  const T = today();
  test("in 3 days → single",       () => expectSingle(parse("in 3 days",  en, "single"), addDays(T, 3)));
  test("in 3 days → range: null",  () => expect(parse("in 3 days",        en, "range")).toBeNull());
  test("in 2 weeks → single",      () => expectSingle(parse("in 2 weeks", en, "single"), addWeeks(T, 2)));
  test("in 2 weeks → range: null", () => expect(parse("in 2 weeks",       en, "range")).toBeNull());
  test("in 1 month → single",      () => expectSingle(parse("in 1 month", en, "single"), addMonths(T, 1)));
  test("in 1 month → range: null", () => expect(parse("in 1 month",       en, "range")).toBeNull());
  test("in 1 year → single",       () => expectSingle(parse("in 1 year",  en, "single"), addYears(T, 1)));
  test("in 1 year → range: null",  () => expect(parse("in 1 year",        en, "range")).toBeNull());
});

describe("future offsets / HE", () => {
  const T = today();
  test("בעוד 3 ימים → single",       () => expectSingle(parse("בעוד 3 ימים",    he, "single"), addDays(T, 3)));
  test("בעוד 3 ימים → range: null",  () => expect(parse("בעוד 3 ימים",          he, "range")).toBeNull());
  test("עוד 3 ימים → single",        () => expectSingle(parse("עוד 3 ימים",      he, "single"), addDays(T, 3)));
  test("עוד 3 ימים → range: null",   () => expect(parse("עוד 3 ימים",            he, "range")).toBeNull());
  test("בעוד 2 שבועות → single",     () => expectSingle(parse("בעוד 2 שבועות",  he, "single"), addWeeks(T, 2)));
  test("בעוד 2 שבועות → range: null",() => expect(parse("בעוד 2 שבועות",        he, "range")).toBeNull());
  // Parser requires "prefix + N + unit" (two tokens); bare "בעוד חודש" has only one token after the prefix → null.
  test("בעוד חודש → single: null (bare unit, no number)",  () => expect(parse("בעוד חודש",        he, "single")).toBeNull());
  test("בעוד 1 חודש → single",       () => expectSingle(parse("בעוד 1 חודש",     he, "single"), addMonths(T, 1)));
  test("בעוד 1 חודש → range: null",  () => expect(parse("בעוד 1 חודש",           he, "range")).toBeNull());
  test("בעוד שנה → single: null (bare unit, no number)",  () => expect(parse("בעוד שנה",         he, "single")).toBeNull());
  test("בעוד 1 שנה → single",        () => expectSingle(parse("בעוד 1 שנה",       he, "single"), addYears(T, 1)));
  test("בעוד 1 שנה → range: null",   () => expect(parse("בעוד 1 שנה",             he, "range")).toBeNull());

  // Dual forms: week/month units work in BOTH modes (day unit is excluded from range).
  test("שבועיים → single: today+14d",           () => expectSingle(parse("שבועיים",  he, "single"), addWeeks(T, 2)));
  test("שבועיים → range: [today, today+14d]",   () => expectRange(parse("שבועיים",   he, "range"),  T, addWeeks(T, 2)));
  test("חודשיים → single: today+2mo",           () => expectSingle(parse("חודשיים",  he, "single"), addMonths(T, 2)));
  test("חודשיים → range: [today, today+2mo]",   () => expectRange(parse("חודשיים",   he, "range"),  T, addMonths(T, 2)));
});

// ── Section 3 — Past Offsets ─────────────────────────────────────────────────
// "N unit ago" constructs are single-only.

describe("past offsets / EN", () => {
  const T = today();
  test("3 days ago → single",       () => expectSingle(parse("3 days ago",    en, "single"), addDays(T, -3)));
  test("3 days ago → range: null",  () => expect(parse("3 days ago",          en, "range")).toBeNull());
  test("2 weeks ago → single",      () => expectSingle(parse("2 weeks ago",   en, "single"), addWeeks(T, -2)));
  test("2 weeks ago → range: null", () => expect(parse("2 weeks ago",         en, "range")).toBeNull());
  test("1 month ago → single",      () => expectSingle(parse("1 month ago",   en, "single"), addMonths(T, -1)));
  test("1 month ago → range: null", () => expect(parse("1 month ago",         en, "range")).toBeNull());
  test("1 year ago → single",       () => expectSingle(parse("1 year ago",    en, "single"), addYears(T, -1)));
  test("1 year ago → range: null",  () => expect(parse("1 year ago",          en, "range")).toBeNull());
});

describe("past offsets / HE", () => {
  const T = today();
  test("לפני 3 ימים → single",       () => expectSingle(parse("לפני 3 ימים",    he, "single"), addDays(T, -3)));
  test("לפני 3 ימים → range: null",  () => expect(parse("לפני 3 ימים",          he, "range")).toBeNull());
  test("לפני 2 שבועות → single",     () => expectSingle(parse("לפני 2 שבועות",  he, "single"), addWeeks(T, -2)));
  test("לפני 2 שבועות → range: null",() => expect(parse("לפני 2 שבועות",        he, "range")).toBeNull());
  // Same: "לפני" + unit requires "לפני N unit"; bare unit → null.
  test("לפני חודש → single: null (bare unit, no number)",  () => expect(parse("לפני חודש",       he, "single")).toBeNull());
  test("לפני 1 חודש → single",       () => expectSingle(parse("לפני 1 חודש",     he, "single"), addMonths(T, -1)));
  test("לפני 1 חודש → range: null",  () => expect(parse("לפני 1 חודש",           he, "range")).toBeNull());
  test("לפני שנה → single: null (bare unit, no number)",  () => expect(parse("לפני שנה",         he, "single")).toBeNull());
  test("לפני 1 שנה → single",        () => expectSingle(parse("לפני 1 שנה",       he, "single"), addYears(T, -1)));
  test("לפני 1 שנה → range: null",   () => expect(parse("לפני 1 שנה",             he, "range")).toBeNull());
});

// ── Section 4 — Weekdays ─────────────────────────────────────────────────────
// Weekday phrases resolve to a single point date; range mode returns null.

describe("weekdays / EN", () => {
  test("next Monday → single: future Monday", () => {
    const r = parse("next Monday", en, "single") as Date;
    expect(r).toBeInstanceOf(Date);
    expect(r.getDay()).toBe(1);
    expect(r.getTime()).toBeGreaterThan(today().getTime());
  });
  test("next Monday → range: null", () => expect(parse("next Monday", en, "range")).toBeNull());

  test("last Friday → single: past Friday", () => {
    const r = parse("last Friday", en, "single") as Date;
    expect(r).toBeInstanceOf(Date);
    expect(r.getDay()).toBe(5);
    expect(r.getTime()).toBeLessThanOrEqual(today().getTime());
  });
  test("last Friday → range: null", () => expect(parse("last Friday", en, "range")).toBeNull());

  test("next Sunday → single: future Sunday", () => {
    const r = parse("next Sunday", en, "single") as Date;
    expect(r).toBeInstanceOf(Date);
    expect(r.getDay()).toBe(0);
  });
  test("next Sunday → range: null", () => expect(parse("next Sunday", en, "range")).toBeNull());

  test("next Wednesday → single", () => {
    const r = parse("next Wednesday", en, "single") as Date;
    expect(r).toBeInstanceOf(Date);
    expect(r.getDay()).toBe(3);
  });
  test("next Wednesday → range: null", () => expect(parse("next Wednesday", en, "range")).toBeNull());

  test("last Thursday → single: past Thursday", () => {
    const r = parse("last Thursday", en, "single") as Date;
    expect(r).toBeInstanceOf(Date);
    expect(r.getDay()).toBe(4);
    expect(r.getTime()).toBeLessThanOrEqual(today().getTime());
  });
  test("last Thursday → range: null", () => expect(parse("last Thursday", en, "range")).toBeNull());
});

describe("weekdays / HE", () => {
  test("שני הבא → single: next Monday", () => {
    const r = parse("שני הבא", he, "single") as Date;
    expect(r).toBeInstanceOf(Date);
    expect(r.getDay()).toBe(1);
    expect(r.getTime()).toBeGreaterThan(today().getTime());
  });
  test("שני הבא → range: null", () => expect(parse("שני הבא", he, "range")).toBeNull());

  test("שישי האחרון → single: past Friday", () => {
    const r = parse("שישי האחרון", he, "single") as Date;
    expect(r).toBeInstanceOf(Date);
    expect(r.getDay()).toBe(5);
    expect(r.getTime()).toBeLessThanOrEqual(today().getTime());
  });
  test("שישי האחרון → range: null", () => expect(parse("שישי האחרון", he, "range")).toBeNull());

  test("ביום ראשון → single: next Sunday", () => {
    const r = parse("ביום ראשון", he, "single") as Date;
    expect(r).toBeInstanceOf(Date);
    expect(r.getDay()).toBe(0);
  });
  test("ביום ראשון → range: null", () => expect(parse("ביום ראשון", he, "range")).toBeNull());

  test("רביעי הקרוב → single: next Wednesday", () => {
    const r = parse("רביעי הקרוב", he, "single") as Date;
    expect(r).toBeInstanceOf(Date);
    expect(r.getDay()).toBe(3);
  });
  test("רביעי הקרוב → range: null", () => expect(parse("רביעי הקרוב", he, "range")).toBeNull());

  test("חמישי הקודם → single: past Thursday", () => {
    const r = parse("חמישי הקודם", he, "single") as Date;
    expect(r).toBeInstanceOf(Date);
    expect(r.getDay()).toBe(4);
    expect(r.getTime()).toBeLessThanOrEqual(today().getTime());
  });
  test("חמישי הקודם → range: null", () => expect(parse("חמישי הקודם", he, "range")).toBeNull());
});

// ── Section 5 — Named Date Ranges ────────────────────────────────────────────
//
// "this X" — range-only. parseSingle has no handler for "this" + unit.
//
// "next/last X" — works in BOTH modes:
//   range: full calendar period (start–end of the week/month/etc.)
//   single: a point date N units away from today (addWeeks/addMonths/addYears/addQuarters)
//
// Hebrew asymmetry:
//   "שבוע הבא" / "חודש הבא" / "רבעון הבא" end with the masculine suffix " הבא"
//     → parseSingle unitDirPairs matches → works in single mode
//   "שנה הבאה" ends with the feminine suffix " הבאה" (not in nextPrefix list)
//     → parseSingle does NOT match → single mode returns null
//   "שבוע שעבר" / "חודש שעבר" / "שנה שעברה" use a fixed compound form (not a suffix token)
//     → parseSingle unitDirPairs does NOT match → single mode returns null

describe("named ranges / EN — this variants (range-only)", () => {
  const T = today();
  test("this week → range",        () => { const sw = startOfWeek(T, en.weekStart); expectRange(parse("this week",    en, "range"), sw, addDays(sw, 6)); });
  test("this week → single: null", () => expect(parse("this week",                                                     en, "single")).toBeNull());
  test("this month → range",       () => expectRange(parse("this month",    en, "range"), startOfMonth(T), endOfMonth(T)));
  test("this month → single: null",() => expect(parse("this month",                                                     en, "single")).toBeNull());
  test("this year → range",        () => expectRange(parse("this year",     en, "range"), startOfYear(T), endOfYear(T)));
  test("this year → single: null", () => expect(parse("this year",                                                      en, "single")).toBeNull());
  test("this quarter → range",     () => expectRange(parse("this quarter",  en, "range"), startOfQ(T.getFullYear(), curQ()), endOfQ(T.getFullYear(), curQ())));
  test("this quarter → single: null",() => expect(parse("this quarter",                                                 en, "single")).toBeNull());
});

describe("named ranges / EN — next variants (range + single both work)", () => {
  const T = today();
  test("next week → range: full next week",       () => { const sw = startOfWeek(addDays(T, 7), en.weekStart); expectRange(parse("next week",    en, "range"), sw, addDays(sw, 6)); });
  test("next week → single: today+7d",            () => expectSingle(parse("next week",                                                           en, "single"), addWeeks(T, 1)));
  test("next month → range: full next month",     () => { const m = addMonths(T, 1); expectRange(parse("next month",   en, "range"), startOfMonth(m), endOfMonth(m)); });
  test("next month → single: today+1mo",          () => expectSingle(parse("next month",                                                          en, "single"), addMonths(T, 1)));
  test("next year → range: full next year",       () => { const y = addYears(T, 1); expectRange(parse("next year",    en, "range"), startOfYear(y), endOfYear(y)); });
  test("next year → single: today+1yr",           () => expectSingle(parse("next year",                                                           en, "single"), addYears(T, 1)));
  test("next quarter → range: full next quarter", () => { const [nq, nqyr] = nextQ(); expectRange(parse("next quarter", en, "range"), startOfQ(nqyr, nq), endOfQ(nqyr, nq)); });
  test("next quarter → single: today+3mo",        () => expectSingle(parse("next quarter",                                                        en, "single"), addMonths(T, 3)));
});

describe("named ranges / EN — last variants (range + single both work)", () => {
  const T = today();
  test("last week → range: full last week",       () => { const sw = startOfWeek(addDays(T, -7), en.weekStart); expectRange(parse("last week",    en, "range"), sw, addDays(sw, 6)); });
  test("last week → single: today-7d",            () => expectSingle(parse("last week",                                                           en, "single"), addWeeks(T, -1)));
  test("last month → range: full last month",     () => { const m = addMonths(T, -1); expectRange(parse("last month",  en, "range"), startOfMonth(m), endOfMonth(m)); });
  test("last month → single: today-1mo",          () => expectSingle(parse("last month",                                                          en, "single"), addMonths(T, -1)));
  test("last year → range: full last year",       () => { const y = addYears(T, -1); expectRange(parse("last year",   en, "range"), startOfYear(y), endOfYear(y)); });
  test("last year → single: today-1yr",           () => expectSingle(parse("last year",                                                           en, "single"), addYears(T, -1)));
  test("last quarter → range: full last quarter", () => { const [pq, pqyr] = prevQ(); expectRange(parse("last quarter", en, "range"), startOfQ(pqyr, pq), endOfQ(pqyr, pq)); });
  test("last quarter → single: today-3mo",        () => expectSingle(parse("last quarter",                                                        en, "single"), addMonths(T, -3)));
});

describe("named ranges / HE — this variants (range-only)", () => {
  const T = today();
  test("השבוע → range",         () => { const sw = startOfWeek(T, he.weekStart); expectRange(parse("השבוע",       he, "range"), sw, addDays(sw, 6)); });
  test("השבוע → single: null",  () => expect(parse("השבוע",                                                         he, "single")).toBeNull());
  test("החודש → range",         () => expectRange(parse("החודש",       he, "range"), startOfMonth(T), endOfMonth(T)));
  test("החודש → single: null",  () => expect(parse("החודש",                                                         he, "single")).toBeNull());
  test("חודש זה → range",       () => expectRange(parse("חודש זה",     he, "range"), startOfMonth(T), endOfMonth(T)));
  test("חודש זה → single: null",() => expect(parse("חודש זה",                                                       he, "single")).toBeNull());
  test("השנה → range",          () => expectRange(parse("השנה",        he, "range"), startOfYear(T), endOfYear(T)));
  test("השנה → single: null",   () => expect(parse("השנה",                                                          he, "single")).toBeNull());
  test("שנה זו → range",        () => expectRange(parse("שנה זו",      he, "range"), startOfYear(T), endOfYear(T)));
  test("שנה זו → single: null", () => expect(parse("שנה זו",                                                        he, "single")).toBeNull());
  test("הרבעון → range",        () => expectRange(parse("הרבעון",      he, "range"), startOfQ(T.getFullYear(), curQ()), endOfQ(T.getFullYear(), curQ())));
  test("הרבעון → single: null", () => expect(parse("הרבעון",                                                        he, "single")).toBeNull());
  test("הרבעון הזה → range",    () => expectRange(parse("הרבעון הזה",  he, "range"), startOfQ(T.getFullYear(), curQ()), endOfQ(T.getFullYear(), curQ())));
  test("הרבעון הזה → single: null",() => expect(parse("הרבעון הזה",                                                 he, "single")).toBeNull());
});

describe("named ranges / HE — next variants (masculine suffix הבא → also single)", () => {
  const T = today();
  // שבוע הבא: ends with " הבא" (masc) → parseSingle unitDirPairs matches
  test("שבוע הבא → range: full next week",  () => { const sw = startOfWeek(addDays(T, 7), he.weekStart); expectRange(parse("שבוע הבא", he, "range"), sw, addDays(sw, 6)); });
  test("שבוע הבא → single: today+1w",       () => expectSingle(parse("שבוע הבא",                                                                    he, "single"), addWeeks(T, 1)));
  // חודש הבא: same
  test("חודש הבא → range: full next month", () => { const m = addMonths(T, 1); expectRange(parse("חודש הבא", he, "range"), startOfMonth(m), endOfMonth(m)); });
  test("חודש הבא → single: today+1mo",      () => expectSingle(parse("חודש הבא",                                                                    he, "single"), addMonths(T, 1)));
  // רבעון הבא: same
  test("רבעון הבא → range: full next quarter", () => { const [nq, nqyr] = nextQ(); expectRange(parse("רבעון הבא", he, "range"), startOfQ(nqyr, nq), endOfQ(nqyr, nq)); });
  test("רבעון הבא → single: today+3mo",        () => expectSingle(parse("רבעון הבא",                                                                he, "single"), addMonths(T, 3)));
  // שנה הבאה: feminine suffix "הבאה" is NOT in nextPrefix → single returns null
  test("שנה הבאה → range: full next year",  () => { const y = addYears(T, 1); expectRange(parse("שנה הבאה", he, "range"), startOfYear(y), endOfYear(y)); });
  test("שנה הבאה → single: null (fem suffix not in nextPrefix)", () => expect(parse("שנה הבאה", he, "single")).toBeNull());
});

describe("named ranges / HE — last variants (compound form שעבר → range-only)", () => {
  const T = today();
  // "שבוע שעבר" is a compound namedRange phrase, not a unit+suffix token → parseSingle returns null
  test("שבוע שעבר → range: full last week",   () => { const sw = startOfWeek(addDays(T, -7), he.weekStart); expectRange(parse("שבוע שעבר",   he, "range"), sw, addDays(sw, 6)); });
  test("שבוע שעבר → single: null",            () => expect(parse("שבוע שעבר",                                                                       he, "single")).toBeNull());
  test("חודש שעבר → range: full last month",  () => { const m = addMonths(T, -1); expectRange(parse("חודש שעבר",  he, "range"), startOfMonth(m), endOfMonth(m)); });
  test("חודש שעבר → single: null",            () => expect(parse("חודש שעבר",                                                                       he, "single")).toBeNull());
  test("שנה שעברה → range: full last year",   () => { const y = addYears(T, -1); expectRange(parse("שנה שעברה",  he, "range"), startOfYear(y), endOfYear(y)); });
  test("שנה שעברה → single: null",            () => expect(parse("שנה שעברה",                                                                       he, "single")).toBeNull());
  test("רבעון שעבר → range: full last quarter",() => { const [pq, pqyr] = prevQ(); expectRange(parse("רבעון שעבר", he, "range"), startOfQ(pqyr, pq), endOfQ(pqyr, pq)); });
  test("רבעון שעבר → single: null",           () => expect(parse("רבעון שעבר",                                                                      he, "single")).toBeNull());
  test("החודש הבא → range: full next month",  () => { const m = addMonths(T, 1); expectRange(parse("החודש הבא",  he, "range"), startOfMonth(m), endOfMonth(m)); });
  test("החודש הבא → single: null (ה prefix)",  () => expect(parse("החודש הבא",                                                                      he, "single")).toBeNull());
  test("השנה שעברה → range: full last year",  () => { const y = addYears(T, -1); expectRange(parse("השנה שעברה", he, "range"), startOfYear(y), endOfYear(y)); });
  test("השנה שעברה → single: null",           () => expect(parse("השנה שעברה",                                                                      he, "single")).toBeNull());
});

// ── Section 6 — Rolling Ranges ───────────────────────────────────────────────
// All rolling range phrases are range-only; parseSingle has no handler for them.

describe("rolling ranges / EN", () => {
  const T = today();
  test("last 30 days → range",        () => expectRange(parse("last 30 days",          en, "range"), addDays(T, -30), T));
  test("last 30 days → single: null", () => expect(parse("last 30 days",               en, "single")).toBeNull());
  test("last 3 weeks → range",        () => expectRange(parse("last 3 weeks",          en, "range"), addWeeks(T, -3), T));
  test("last 3 weeks → single: null", () => expect(parse("last 3 weeks",               en, "single")).toBeNull());
  test("last 6 months → range",       () => expectRange(parse("last 6 months",         en, "range"), addMonths(T, -6), T));
  test("last 6 months → single: null",() => expect(parse("last 6 months",              en, "single")).toBeNull());
  test("past 90 days → range",        () => expectRange(parse("past 90 days",          en, "range"), addDays(T, -90), T));
  test("past 90 days → single: null", () => expect(parse("past 90 days",               en, "single")).toBeNull());
  test("rolling 90 days → range",     () => expectRange(parse("rolling 90 days",       en, "range"), addDays(T, -90), T));
  test("trailing 90 days → range",    () => expectRange(parse("trailing 90 days",      en, "range"), addDays(T, -90), T));
  test("over the last 90 days → range",() => expectRange(parse("over the last 90 days",en, "range"), addDays(T, -90), T));
  test("next 7 days → range",         () => expectRange(parse("next 7 days",           en, "range"), T, addDays(T, 7)));
  test("next 7 days → single: null",  () => expect(parse("next 7 days",                en, "single")).toBeNull());
  test("next 3 months → range",       () => expectRange(parse("next 3 months",         en, "range"), T, addMonths(T, 3)));
  test("next 3 months → single: null",() => expect(parse("next 3 months",              en, "single")).toBeNull());
});

describe("rolling ranges / HE", () => {
  const T = today();
  test("30 ימים האחרונים → range",        () => expectRange(parse("30 ימים האחרונים", he, "range"), addDays(T, -30), T));
  test("30 ימים האחרונים → single: null", () => expect(parse("30 ימים האחרונים",       he, "single")).toBeNull());
  test("30 ימים אחרונים → range",         () => expectRange(parse("30 ימים אחרונים",   he, "range"), addDays(T, -30), T));
  test("3 שבועות האחרונים → range",       () => expectRange(parse("3 שבועות האחרונים", he, "range"), addWeeks(T, -3), T));
  test("3 שבועות האחרונים → single: null",() => expect(parse("3 שבועות האחרונים",      he, "single")).toBeNull());
  test("6 חודשים האחרונים → range",       () => expectRange(parse("6 חודשים האחרונים", he, "range"), addMonths(T, -6), T));
  test("2 שנים האחרונות → range",         () => expectRange(parse("2 שנים האחרונות",   he, "range"), addYears(T, -2), T));
  test("7 ימים הבאים → range",            () => expectRange(parse("7 ימים הבאים",       he, "range"), T, addDays(T, 7)));
  test("7 ימים הבאים → single: null",     () => expect(parse("7 ימים הבאים",            he, "single")).toBeNull());
  test("3 חודשים הבאים → range",          () => expectRange(parse("3 חודשים הבאים",     he, "range"), T, addMonths(T, 3)));
});

// ── Section 7 — Weekend ──────────────────────────────────────────────────────
// EN "weekend" → range-only.
// HE "סוף השבוע" → works in BOTH modes:
//   range: computeWeekend → [Friday, Saturday]
//   single: periodEndWords["סוף"] + resolveStartEnd("השבוע") → end of this week (Saturday)
// HE 'סופ"ש' → range-only (shorthand doesn't match periodEndWords).

describe("weekend / EN", () => {
  test("weekend → range: [Sat, Sun]", () => {
    const r = parse("weekend", en, "range") as [Date, Date];
    expect(Array.isArray(r)).toBe(true);
    expect(r[0].getDay()).toBe(6); // Saturday
    expect(r[1].getDay()).toBe(0); // Sunday
  });
  test("weekend → single: null", () => expect(parse("weekend", en, "single")).toBeNull());
});

describe("weekend / HE", () => {
  test("סוף השבוע → range: [Fri, Sat]", () => {
    const r = parse("סוף השבוע", he, "range") as [Date, Date];
    expect(Array.isArray(r)).toBe(true);
    expect(r[0].getDay()).toBe(5); // Friday
    expect(r[1].getDay()).toBe(6); // Saturday
  });
  // single: periodEndWords "סוף" resolves "השבוע" to end of this week = Saturday
  test("סוף השבוע → single: end of this week (Saturday)", () => {
    const r = parse("סוף השבוע", he, "single") as Date;
    expect(r).toBeInstanceOf(Date);
    expect(r.getDay()).toBe(6); // Saturday
  });
  test('סופ"ש → range: [Fri, Sat]', () => {
    const r = parse('סופ"ש', he, "range") as [Date, Date];
    expect(Array.isArray(r)).toBe(true);
    expect(r[0].getDay()).toBe(5);
    expect(r[1].getDay()).toBe(6);
  });
  test('סופ"ש → single: null', () => expect(parse('סופ"ש', he, "single")).toBeNull());
});

// ── Section 8 — Quarters ─────────────────────────────────────────────────────
// Q1–Q4 and רבעון N are range-only; parseSingle has no handler for them.

describe("quarters / EN", () => {
  const T = today();
  const yr = T.getFullYear();
  test("Q1 → range: Jan–Mar current year",  () => expectRange(parse("Q1",      en, "range"), startOfQ(yr, 0), endOfQ(yr, 0)));
  test("Q1 → single: null",                 () => expect(parse("Q1",            en, "single")).toBeNull());
  test("Q2 → range",                        () => expectRange(parse("Q2",       en, "range"), startOfQ(yr, 1), endOfQ(yr, 1)));
  test("Q2 → single: null",                 () => expect(parse("Q2",            en, "single")).toBeNull());
  test("Q3 → range",                        () => expectRange(parse("Q3",       en, "range"), startOfQ(yr, 2), endOfQ(yr, 2)));
  test("Q3 → single: null",                 () => expect(parse("Q3",            en, "single")).toBeNull());
  test("Q4 → range",                        () => expectRange(parse("Q4",       en, "range"), startOfQ(yr, 3), endOfQ(yr, 3)));
  test("Q4 → single: null",                 () => expect(parse("Q4",            en, "single")).toBeNull());
  test("Q1 2024 → range: Jan–Mar 2024",     () => expectRange(parse("Q1 2024",  en, "range"), d(2024, 1, 1), d(2024, 3, 31)));
  test("Q1 2024 → single: null",            () => expect(parse("Q1 2024",       en, "single")).toBeNull());
});

describe("quarters / HE", () => {
  const T = today();
  const yr = T.getFullYear();
  test("רבעון ראשון → range",               () => expectRange(parse("רבעון ראשון",       he, "range"), startOfQ(yr, 0), endOfQ(yr, 0)));
  test("רבעון ראשון → single: null",        () => expect(parse("רבעון ראשון",             he, "single")).toBeNull());
  test("רבעון שני → range",                 () => expectRange(parse("רבעון שני",          he, "range"), startOfQ(yr, 1), endOfQ(yr, 1)));
  test("רבעון שני → single: null",          () => expect(parse("רבעון שני",               he, "single")).toBeNull());
  test("רבעון שלישי → range",               () => expectRange(parse("רבעון שלישי",        he, "range"), startOfQ(yr, 2), endOfQ(yr, 2)));
  test("רבעון רביעי → range",               () => expectRange(parse("רבעון רביעי",        he, "range"), startOfQ(yr, 3), endOfQ(yr, 3)));
  test("רבעון 1 → range",                   () => expectRange(parse("רבעון 1",            he, "range"), startOfQ(yr, 0), endOfQ(yr, 0)));
  test("רבעון 1 → single: null",            () => expect(parse("רבעון 1",                 he, "single")).toBeNull());
  test("רבעון ראשון 2024 → range",          () => expectRange(parse("רבעון ראשון 2024",   he, "range"), d(2024, 1, 1), d(2024, 3, 31)));
});

// ── Section 9 — Half-Year ────────────────────────────────────────────────────
// H1/H2 and text variants are range-only.

describe("half-year / EN", () => {
  const yr = today().getFullYear();
  test("H1 → range: Jan–Jun current year", () => expectRange(parse("H1",               en, "range"), d(yr, 1, 1), d(yr, 6, 30)));
  test("H1 → single: null",                () => expect(parse("H1",                     en, "single")).toBeNull());
  test("H2 → range: Jul–Dec current year", () => expectRange(parse("H2",               en, "range"), d(yr, 7, 1), d(yr, 12, 31)));
  test("H2 → single: null",                () => expect(parse("H2",                     en, "single")).toBeNull());
  test("first half → range",               () => expectRange(parse("first half",        en, "range"), d(yr, 1, 1), d(yr, 6, 30)));
  test("first half → single: null",        () => expect(parse("first half",              en, "single")).toBeNull());
  test("second half → range",              () => expectRange(parse("second half",        en, "range"), d(yr, 7, 1), d(yr, 12, 31)));
  test("second half → single: null",       () => expect(parse("second half",             en, "single")).toBeNull());
  test("first half of 2024 → range",       () => expectRange(parse("first half of 2024",en, "range"), d(2024, 1, 1), d(2024, 6, 30)));
  test("H2 2024 → range",                  () => expectRange(parse("H2 2024",            en, "range"), d(2024, 7, 1), d(2024, 12, 31)));
});

describe("half-year / HE", () => {
  const yr = today().getFullYear();
  test("מחצית ראשונה → range",       () => expectRange(parse("מחצית ראשונה",      he, "range"), d(yr, 1, 1), d(yr, 6, 30)));
  test("מחצית ראשונה → single: null",() => expect(parse("מחצית ראשונה",           he, "single")).toBeNull());
  test("מחצית שנייה → range",        () => expectRange(parse("מחצית שנייה",        he, "range"), d(yr, 7, 1), d(yr, 12, 31)));
  test("מחצית שנייה → single: null", () => expect(parse("מחצית שנייה",             he, "single")).toBeNull());
  test("מחצית ראשונה 2024 → range",  () => expectRange(parse("מחצית ראשונה 2024",  he, "range"), d(2024, 1, 1), d(2024, 6, 30)));
  test("מחצית שנייה 2024 → range",   () => expectRange(parse("מחצית שנייה 2024",   he, "range"), d(2024, 7, 1), d(2024, 12, 31)));
});

// ── Section 10 — Period-to-Date ───────────────────────────────────────────────
// YTD/MTD/QTD and HE equivalents are range-only.

describe("period-to-date / EN", () => {
  const T = today();
  const yr = T.getFullYear();
  const q  = curQ();
  test("year to date → range",         () => expectRange(parse("year to date",    en, "range"), startOfYear(T), T));
  test("year to date → single: null",  () => expect(parse("year to date",          en, "single")).toBeNull());
  test("YTD → range",                  () => expectRange(parse("YTD",              en, "range"), startOfYear(T), T));
  test("YTD → single: null",           () => expect(parse("YTD",                   en, "single")).toBeNull());
  test("month to date → range",        () => expectRange(parse("month to date",    en, "range"), startOfMonth(T), T));
  test("month to date → single: null", () => expect(parse("month to date",          en, "single")).toBeNull());
  test("MTD → range",                  () => expectRange(parse("MTD",              en, "range"), startOfMonth(T), T));
  test("MTD → single: null",           () => expect(parse("MTD",                   en, "single")).toBeNull());
  test("quarter to date → range",      () => expectRange(parse("quarter to date",  en, "range"), startOfQ(yr, q), T));
  test("quarter to date → single: null",() => expect(parse("quarter to date",      en, "single")).toBeNull());
  test("QTD → range",                  () => expectRange(parse("QTD",              en, "range"), startOfQ(yr, q), T));
  test("QTD → single: null",           () => expect(parse("QTD",                   en, "single")).toBeNull());
});

describe("period-to-date / HE", () => {
  const T = today();
  const yr = T.getFullYear();
  const q  = curQ();
  test("מתחילת השנה → range",        () => expectRange(parse("מתחילת השנה",    he, "range"), startOfYear(T), T));
  test("מתחילת השנה → single: null", () => expect(parse("מתחילת השנה",         he, "single")).toBeNull());
  test("מתחילת החודש → range",       () => expectRange(parse("מתחילת החודש",   he, "range"), startOfMonth(T), T));
  test("מתחילת החודש → single: null",() => expect(parse("מתחילת החודש",        he, "single")).toBeNull());
  test("מתחילת הרבעון → range",      () => expectRange(parse("מתחילת הרבעון",  he, "range"), startOfQ(yr, q), T));
  test("מתחילת הרבעון → single: null",() => expect(parse("מתחילת הרבעון",     he, "single")).toBeNull());
});

// ── Section 11 — Calendar Months ─────────────────────────────────────────────
// Month names resolve to a full calendar month in range mode.
// In single mode the parser finds no single-date interpretation → null.
// Note: requireYearForMonthRange is false in BOTH locales, so a bare month
// name returns the current year's full month without needing an explicit year.

describe("calendar months / EN", () => {
  const yr = today().getFullYear();
  test("January → range: Jan current year",  () => expectRange(parse("January",      en, "range"), d(yr, 1, 1),  d(yr, 1, 31)));
  test("January → single: null",             () => expect(parse("January",            en, "single")).toBeNull());
  test("Jan → range: Jan current year",      () => expectRange(parse("Jan",           en, "range"), d(yr, 1, 1),  d(yr, 1, 31)));
  test("Jan → single: null",                 () => expect(parse("Jan",                en, "single")).toBeNull());
  test("March 2024 → range: Mar 2024",       () => expectRange(parse("March 2024",    en, "range"), d(2024, 3, 1), d(2024, 3, 31)));
  test("March 2024 → single: null",          () => expect(parse("March 2024",          en, "single")).toBeNull());
  test("Sep 2025 → range: Sep 2025",         () => expectRange(parse("Sep 2025",       en, "range"), d(2025, 9, 1), d(2025, 9, 30)));
  test("December 2023 → range: Dec 2023",   () => expectRange(parse("December 2023",  en, "range"), d(2023, 12, 1), d(2023, 12, 31)));

  // "Jan 15" quirk: in range mode the parser reads "15" as a 2-digit year (→ 2015),
  // returning the full month of January 2015. In single mode it correctly parses
  // as January 15 of the current year.
  test("Jan 15 → single: Jan 15 current year",          () => expectSingle(parse("Jan 15", en, "single"), d(yr, 1, 15)));
  test("Jan 15 → range: Jan 2015 (2-digit year quirk)", () => expectRange(parse("Jan 15",  en, "range"),  d(2015, 1, 1), d(2015, 1, 31)));
});

describe("calendar months / HE", () => {
  const yr = today().getFullYear();
  // requireYearForMonthRange is false in HE, so bare month names work without a year
  test("ינואר → range: Jan current year",    () => expectRange(parse("ינואר",         he, "range"), d(yr, 1, 1),  d(yr, 1, 31)));
  test("ינואר → single: null",               () => expect(parse("ינואר",               he, "single")).toBeNull());
  test("ינואר 2024 → range: Jan 2024",       () => expectRange(parse("ינואר 2024",     he, "range"), d(2024, 1, 1), d(2024, 1, 31)));
  test("ינואר 2024 → single: null",          () => expect(parse("ינואר 2024",           he, "single")).toBeNull());
  test("מרץ 2024 → range: Mar 2024",         () => expectRange(parse("מרץ 2024",        he, "range"), d(2024, 3, 1), d(2024, 3, 31)));
  test("ספט׳ 2025 → range: Sep 2025",        () => expectRange(parse("ספט׳ 2025",        he, "range"), d(2025, 9, 1), d(2025, 9, 30)));
  test("דצמבר 2023 → range: Dec 2023",       () => expectRange(parse("דצמבר 2023",      he, "range"), d(2023, 12, 1), d(2023, 12, 31)));
});

// ── Section 12 — Period Start & End ──────────────────────────────────────────
// These are single-only; range mode returns null.

describe("period start & end / EN", () => {
  const T = today();
  test("start of this month → single", () => expectSingle(parse("start of this month",     en, "single"), startOfMonth(T)));
  test("start of this month → range: null", () => expect(parse("start of this month",      en, "range")).toBeNull());
  test("beginning of this month → single",  () => expectSingle(parse("beginning of this month", en, "single"), startOfMonth(T)));
  test("beginning of this month → range: null", () => expect(parse("beginning of this month",    en, "range")).toBeNull());
  test("start of next year → single",       () => expectSingle(parse("start of next year",  en, "single"), startOfYear(addYears(T, 1))));
  test("start of next year → range: null",  () => expect(parse("start of next year",         en, "range")).toBeNull());
  test("end of last month → single",        () => expectSingle(parse("end of last month",    en, "single"), endOfMonth(addMonths(T, -1))));
  test("end of last month → range: null",   () => expect(parse("end of last month",           en, "range")).toBeNull());
  test("end of next year → single",         () => expectSingle(parse("end of next year",      en, "single"), endOfYear(addYears(T, 1))));
  test("end of next year → range: null",    () => expect(parse("end of next year",             en, "range")).toBeNull());
  test("end of this week → single",         () => expectSingle(parse("end of this week",       en, "single"), addDays(startOfWeek(T, en.weekStart), 6)));
  test("end of this week → range: null",    () => expect(parse("end of this week",              en, "range")).toBeNull());
});

describe("period start & end / HE", () => {
  const T = today();
  test("תחילת החודש → single",        () => expectSingle(parse("תחילת החודש",      he, "single"), startOfMonth(T)));
  test("תחילת החודש → range: null",   () => expect(parse("תחילת החודש",             he, "range")).toBeNull());
  test("תחילת שנה הבאה → single",     () => expectSingle(parse("תחילת שנה הבאה",   he, "single"), startOfYear(addYears(T, 1))));
  test("תחילת שנה הבאה → range: null",() => expect(parse("תחילת שנה הבאה",          he, "range")).toBeNull());
  test("סוף חודש שעבר → single",      () => expectSingle(parse("סוף חודש שעבר",    he, "single"), endOfMonth(addMonths(T, -1))));
  test("סוף חודש שעבר → range: null", () => expect(parse("סוף חודש שעבר",           he, "range")).toBeNull());
  test("סוף שנה הבאה → single",       () => expectSingle(parse("סוף שנה הבאה",      he, "single"), endOfYear(addYears(T, 1))));
  test("סוף שנה הבאה → range: null",  () => expect(parse("סוף שנה הבאה",             he, "range")).toBeNull());
});

// ── Section 13 — Nth Weekday of Month ────────────────────────────────────────
// Single-only; range mode returns null.

function nthWeekday(year: number, month: number, weekday: number, nth: number): Date {
  if (nth > 0) {
    const first = new Date(year, month - 1, 1);
    const diff  = (weekday - first.getDay() + 7) % 7;
    return new Date(year, month - 1, 1 + diff + (nth - 1) * 7);
  }
  const last = new Date(year, month, 0);
  const diff  = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month - 1, last.getDate() - diff);
}

describe("nth weekday of month / EN", () => {
  const yr = today().getFullYear();
  test("first Monday of March → single",       () => expectSingle(parse("first Monday of March",           en, "single"), nthWeekday(yr, 3, 1, 1)));
  test("first Monday of March → range: null",  () => expect(parse("first Monday of March",                 en, "range")).toBeNull());
  test("second Friday of January → single",    () => expectSingle(parse("second Friday of January",        en, "single"), nthWeekday(yr, 1, 5, 2)));
  test("second Friday of January → range: null",() => expect(parse("second Friday of January",             en, "range")).toBeNull());
  test("third Tuesday of June → single",       () => expectSingle(parse("third Tuesday of June",           en, "single"), nthWeekday(yr, 6, 2, 3)));
  test("fourth Wednesday of October → single", () => expectSingle(parse("fourth Wednesday of October",     en, "single"), nthWeekday(yr, 10, 3, 4)));
  test("last Sunday of December → single",     () => expectSingle(parse("last Sunday of December",         en, "single"), nthWeekday(yr, 12, 0, -1)));
  test("last Sunday of December → range: null",() => expect(parse("last Sunday of December",               en, "range")).toBeNull());
});

describe("nth weekday of month / HE", () => {
  const yr = today().getFullYear();
  test("שני הראשון של מרץ → single",       () => expectSingle(parse("שני הראשון של מרץ",     he, "single"), nthWeekday(yr, 3, 1, 1)));
  test("שני הראשון של מרץ → range: null",  () => expect(parse("שני הראשון של מרץ",            he, "range")).toBeNull());
  test("שישי השני של ינואר → single",      () => expectSingle(parse("שישי השני של ינואר",     he, "single"), nthWeekday(yr, 1, 5, 2)));
  test("שלישי השלישי של יוני → single",    () => expectSingle(parse("שלישי השלישי של יוני",   he, "single"), nthWeekday(yr, 6, 2, 3)));
  test("ראשון האחרון של דצמבר → single",   () => expectSingle(parse("ראשון האחרון של דצמבר",  he, "single"), nthWeekday(yr, 12, 0, -1)));
  test("ראשון האחרון של דצמבר → range: null",() => expect(parse("ראשון האחרון של דצמבר",     he, "range")).toBeNull());
});

// ── Section 14 — Specific Dates ───────────────────────────────────────────────
// Specific date formats are single-only.
// Exception: "Jan 15" in range mode — the parser treats "15" as a 2-digit year
// and returns the full month of January 2015 (documented in section 11 above).
// Formats with an unambiguous year component ("January 15 2024", ISO, DD.MM.YYYY)
// correctly return null in range mode.

describe("specific dates / EN", () => {
  const yr = today().getFullYear();
  test("Jan 15 → single",           () => expectSingle(parse("Jan 15",           en, "single"), d(yr, 1, 15)));
  test("January 15 → single",       () => expectSingle(parse("January 15",       en, "single"), d(yr, 1, 15)));
  test("January 15 2024 → single",  () => expectSingle(parse("January 15 2024",  en, "single"), d(2024, 1, 15)));
  test("January 15 2024 → range: null", () => expect(parse("January 15 2024",    en, "range")).toBeNull());
  test("Jan 15 2024 → single",      () => expectSingle(parse("Jan 15 2024",       en, "single"), d(2024, 1, 15)));
  test("Jan 15 2024 → range: null", () => expect(parse("Jan 15 2024",             en, "range")).toBeNull());
  test("01/15/2024 → single (MDY)", () => expectSingle(parse("01/15/2024",        en, "single"), d(2024, 1, 15)));
  test("01/15/2024 → range: null",  () => expect(parse("01/15/2024",              en, "range")).toBeNull());
  test("2024-01-15 → single (ISO)", () => expectSingle(parse("2024-01-15",        en, "single"), d(2024, 1, 15)));
  test("2024-01-15 → range: null",  () => expect(parse("2024-01-15",              en, "range")).toBeNull());
  test("15.01.2024 → single",       () => expectSingle(parse("15.01.2024",        en, "single"), d(2024, 1, 15)));
  test("15.01.2024 → range: null",  () => expect(parse("15.01.2024",              en, "range")).toBeNull());
});

describe("specific dates / HE", () => {
  const yr = today().getFullYear();
  test("15 ינואר → single",         () => expectSingle(parse("15 ינואר",          he, "single"), d(yr, 1, 15)));
  test("15 ינואר → range: null",    () => expect(parse("15 ינואר",                he, "range")).toBeNull());
  test("ה-15 בינואר → single",      () => expectSingle(parse("ה-15 בינואר",       he, "single"), d(yr, 1, 15)));
  test("ה-15 בינואר → range: null", () => expect(parse("ה-15 בינואר",             he, "range")).toBeNull());
  test("15 ינואר 2024 → single",    () => expectSingle(parse("15 ינואר 2024",      he, "single"), d(2024, 1, 15)));
  test("15 ינואר 2024 → range: null",() => expect(parse("15 ינואר 2024",           he, "range")).toBeNull());
  test("ה-15 בינואר 2024 → single", () => expectSingle(parse("ה-15 בינואר 2024",  he, "single"), d(2024, 1, 15)));
  test("15/01/2024 → single (DMY)", () => expectSingle(parse("15/01/2024",         he, "single"), d(2024, 1, 15)));
  test("15/01/2024 → range: null",  () => expect(parse("15/01/2024",               he, "range")).toBeNull());
  test("2024-01-15 → single (ISO)", () => expectSingle(parse("2024-01-15",         he, "single"), d(2024, 1, 15)));
  test("2024-01-15 → range: null",  () => expect(parse("2024-01-15",               he, "range")).toBeNull());
  test("15.01.2024 → single",       () => expectSingle(parse("15.01.2024",         he, "single"), d(2024, 1, 15)));
  test("15.01.2024 → range: null",  () => expect(parse("15.01.2024",               he, "range")).toBeNull());
});

// ── Section 15 — Range Syntax ────────────────────────────────────────────────
// Explicit range connectors produce a [Date,Date] in range mode.
// In single mode the whole string fails to parse as a single date → null.

describe("range syntax / EN", () => {
  const yr = today().getFullYear();
  test("from Jan 1 to Jan 31 → range",        () => expectRange(parse("from Jan 1 to Jan 31",       en, "range"), d(yr, 1, 1), d(yr, 1, 31)));
  test("from Jan 1 to Jan 31 → single: null", () => expect(parse("from Jan 1 to Jan 31",             en, "single")).toBeNull());
  test("Jan 1 to Jan 31 → range",             () => expectRange(parse("Jan 1 to Jan 31",             en, "range"), d(yr, 1, 1), d(yr, 1, 31)));
  test("Jan 1 to Jan 31 → single: null",      () => expect(parse("Jan 1 to Jan 31",                  en, "single")).toBeNull());
  // Bare weekday names ("monday", "friday") have no direction word → parseSingle returns null → range fails.
  test("between Monday and Friday → range: null (bare weekday names need direction)",
    () => expect(parse("between monday and friday", en, "range")).toBeNull());
  // With direction words the split works correctly.
  test("between next Monday and next Friday → range", () => {
    const r = parse("between next monday and next friday", en, "range") as [Date, Date];
    expect(Array.isArray(r)).toBe(true);
    // Range is sorted ascending; whichever of Mon/Fri falls first depends on the current weekday.
    const days = new Set([r[0].getDay(), r[1].getDay()]);
    expect(days.has(1)).toBe(true); // contains a Monday
    expect(days.has(5)).toBe(true); // contains a Friday
    expect(r[0].getTime()).toBeLessThanOrEqual(r[1].getTime());
  });
  test("between next Monday and next Friday → single: null", () => expect(parse("between next monday and next friday", en, "single")).toBeNull());
  test("tomorrow to next Friday → range", () => {
    const T   = today();
    const r   = parse("tomorrow to next friday", en, "range") as [Date, Date];
    expect(Array.isArray(r)).toBe(true);
    expect(ds(r[0])).toBe(ds(addDays(T, 1)));
    expect(r[1].getDay()).toBe(5);
    expect(r[1].getTime()).toBeGreaterThan(r[0].getTime());
  });
  test("tomorrow to next Friday → single: null", () => expect(parse("tomorrow to next friday",       en, "single")).toBeNull());
  test("Jan 1 - Jan 31 → range",              () => expectRange(parse("Jan 1 - Jan 31",              en, "range"), d(yr, 1, 1), d(yr, 1, 31)));
  test("Jan 1 - Jan 31 → single: null",       () => expect(parse("Jan 1 - Jan 31",                   en, "single")).toBeNull());
});

describe("range syntax / HE", () => {
  const yr = today().getFullYear();
  test("מ-1 ינואר עד 31 ינואר → range",        () => expectRange(parse("מ-1 ינואר עד 31 ינואר",  he, "range"), d(yr, 1, 1), d(yr, 1, 31)));
  test("מ-1 ינואר עד 31 ינואר → single: null", () => expect(parse("מ-1 ינואר עד 31 ינואר",       he, "single")).toBeNull());
  test("1 ינואר עד 31 ינואר → range",           () => expectRange(parse("1 ינואר עד 31 ינואר",    he, "range"), d(yr, 1, 1), d(yr, 1, 31)));
  test("1 ינואר עד 31 ינואר → single: null",    () => expect(parse("1 ינואר עד 31 ינואר",         he, "single")).toBeNull());
  // Bare weekday names have no direction word → parseSingle returns null → split fails.
  test("בין שני ל-שישי → range: null (bare weekday names need direction)",
    () => expect(parse("בין שני ל-שישי", he, "range")).toBeNull());
  // With direction suffix the split resolves both sides.
  test("בין שני הבא ל-שישי הבא → range", () => {
    const r = parse("בין שני הבא ל-שישי הבא", he, "range") as [Date, Date];
    expect(Array.isArray(r)).toBe(true);
    const days = new Set([r[0].getDay(), r[1].getDay()]);
    expect(days.has(1)).toBe(true); // contains a Monday
    expect(days.has(5)).toBe(true); // contains a Friday
    expect(r[0].getTime()).toBeLessThanOrEqual(r[1].getTime());
  });
  test("בין שני הבא ל-שישי הבא → single: null", () => expect(parse("בין שני הבא ל-שישי הבא", he, "single")).toBeNull());
  // Parser bug: the ["מ", "עד"] rangePair greedily strips the leading "מ" from "מחר",
  // leaving "חר" which can't parse. Use " - " separator instead.
  test("מחר עד שישי הבא → range: null (מ prefix bug)",
    () => expect(parse("מחר עד שישי הבא", he, "range")).toBeNull());
  test("מחר - שישי הבא → range (workaround)", () => {
    const T = today();
    const r = parse("מחר - שישי הבא", he, "range") as [Date, Date];
    expect(Array.isArray(r)).toBe(true);
    expect(ds(r[0])).toBe(ds(addDays(T, 1)));
    expect(r[1].getDay()).toBe(5);
  });
  test("מחר - שישי הבא → single: null", () => expect(parse("מחר - שישי הבא", he, "single")).toBeNull());
});
