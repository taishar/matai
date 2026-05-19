import { describe, test, expect } from "bun:test";
import { parse, parseWithAutoDetect } from "../src/parser";
import { en } from "../src/i18n/en";
import { he } from "../src/i18n/he";
import type { DateValue } from "../src/types";

// ---- Test helpers ----

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function today(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function addDays(date: Date, n: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(date: Date, n: number): Date {
  const r = new Date(date);
  r.setMonth(r.getMonth() + n);
  return r;
}

function addYears(date: Date, n: number): Date {
  const r = new Date(date);
  r.setFullYear(r.getFullYear() + n);
  return r;
}

function startOfHalf(year: number, half: 0 | 1): Date {
  return half === 0 ? new Date(year, 0, 1) : new Date(year, 6, 1);
}
function endOfHalf(year: number, half: 0 | 1): Date {
  return half === 0 ? new Date(year, 5, 30) : new Date(year, 11, 31);
}
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
  if (nth > 0) {
    const first = new Date(year, month - 1, 1);
    const diff = (weekday - first.getDay() + 7) % 7;
    return new Date(year, month - 1, 1 + diff + (nth - 1) * 7);
  }
  const last = new Date(year, month, 0);
  const diff = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month - 1, last.getDate() - diff);
}

function startOfWeek(date: Date, weekStart: number): Date {
  const r = new Date(date);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - ((r.getDay() - weekStart + 7) % 7));
  return r;
}

function startOfMonth(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), 1); }
function endOfMonth(date: Date): Date { return new Date(date.getFullYear(), date.getMonth() + 1, 0); }
function startOfYear(date: Date): Date { return new Date(date.getFullYear(), 0, 1); }
function endOfYear(date: Date): Date { return new Date(date.getFullYear(), 11, 31); }
function startOfQuarter(year: number, q: number): Date { return new Date(year, q * 3, 1); }
function endOfQuarter(year: number, q: number): Date { return new Date(year, q * 3 + 3, 0); }

function ds(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
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

// ---- Single mode (EN) ----

describe("single/EN - numeric formats", () => {
  test("ISO YYYY-MM-DD", () => expectSingle(parse("2024-03-15", en, "single"), d(2024, 3, 15)));
  test("ISO 2-digit year (24 → 2024)", () => expectSingle(parse("24-03-15", en, "single"), d(2024, 3, 15)));
  test("DD.MM.YYYY", () => expectSingle(parse("15.3.2024", en, "single"), d(2024, 3, 15)));
  test("DD.MM.YY (84 → 1984)", () => expectSingle(parse("15.3.84", en, "single"), d(1984, 3, 15)));
  test("MM/DD/YYYY (EN default order)", () => expectSingle(parse("3/15/2024", en, "single"), d(2024, 3, 15)));
  test("DD/MM/YYYY fallback when day>12", () => expectSingle(parse("22/3/2024", en, "single"), d(2024, 3, 22)));
  test("DD/MM/YY with 2-digit year (22/3/84)", () => expectSingle(parse("22/3/84", en, "single"), d(1984, 3, 22)));
  test("2-digit year 00-49 → 2000s (25 → 2025)", () => expectSingle(parse("1/1/25", en, "single"), d(2025, 1, 1)));
  test("2-digit year 50-99 → 1900s (84 → 1984)", () => expectSingle(parse("1/1/84", en, "single"), d(1984, 1, 1)));
  test("pivot boundary 49 → 2049", () => expectSingle(parse("1/1/49", en, "single"), d(2049, 1, 1)));
  test("pivot boundary 50 → 1950", () => expectSingle(parse("1/1/50", en, "single"), d(1950, 1, 1)));
});

describe("single/EN - relative keywords", () => {
  const T = today();
  test("today", () => expectSingle(parse("today", en, "single"), T));
  test("now", () => expectSingle(parse("now", en, "single"), T));
  test("tomorrow", () => expectSingle(parse("tomorrow", en, "single"), addDays(T, 1)));
  test("yesterday", () => expectSingle(parse("yesterday", en, "single"), addDays(T, -1)));
  test("in 3 days", () => expectSingle(parse("in 3 days", en, "single"), addDays(T, 3)));
  test("2 weeks ago", () => expectSingle(parse("2 weeks ago", en, "single"), addDays(T, -14)));
  test("in 1 month", () => expectSingle(parse("in 1 month", en, "single"), addMonths(T, 1)));
  test("in 2 years", () => expectSingle(parse("in 2 years", en, "single"), addYears(T, 2)));
  test("3 years ago", () => expectSingle(parse("3 years ago", en, "single"), addYears(T, -3)));
});

describe("single/EN - weekdays", () => {
  test("next monday → future Monday", () => {
    const result = parse("next monday", en, "single") as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getDay()).toBe(1);
    expect(result.getTime()).toBeGreaterThan(today().getTime());
  });
  test("last friday → past Friday", () => {
    const result = parse("last friday", en, "single") as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getDay()).toBe(5);
    expect(result.getTime()).toBeLessThanOrEqual(today().getTime());
  });
  test("this tuesday → nearest Tuesday", () => {
    const result = parse("this tuesday", en, "single") as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getDay()).toBe(2);
  });
});

describe("single/EN - text month formats", () => {
  const yr = new Date().getFullYear();
  test("Month Day (current year)", () => expectSingle(parse("January 15", en, "single"), d(yr, 1, 15)));
  test("Mon Day (abbreviated)", () => expectSingle(parse("Jan 15", en, "single"), d(yr, 1, 15)));
  test("Month Day Year", () => expectSingle(parse("January 15 2024", en, "single"), d(2024, 1, 15)));
  test("Mon Day, Year", () => expectSingle(parse("Jan 15, 2024", en, "single"), d(2024, 1, 15)));
  test("Day Month Year", () => expectSingle(parse("15 January 2024", en, "single"), d(2024, 1, 15)));
  test("Day Mon Year", () => expectSingle(parse("15 Jan 2024", en, "single"), d(2024, 1, 15)));
});

describe("single/EN - edge cases", () => {
  test("empty string → null", () => expect(parse("", en, "single")).toBeNull());
  test("whitespace → null", () => expect(parse("   ", en, "single")).toBeNull());
  test("garbage → null", () => expect(parse("not a date", en, "single")).toBeNull());
  test("invalid date (Feb 30) → null", () => expect(parse("2024-02-30", en, "single")).toBeNull());
});

// ---- Single mode (HE) ----

describe("single/HE - keywords and relative", () => {
  const T = today();
  test("היום (today)", () => expectSingle(parse("היום", he, "single"), T));
  test("מחר (tomorrow)", () => expectSingle(parse("מחר", he, "single"), addDays(T, 1)));
  test("אתמול (yesterday)", () => expectSingle(parse("אתמול", he, "single"), addDays(T, -1)));
  test("בעוד 5 ימים (in 5 days)", () => expectSingle(parse("בעוד 5 ימים", he, "single"), addDays(T, 5)));
  test("לפני 2 שבועות (2 weeks ago)", () => expectSingle(parse("לפני 2 שבועות", he, "single"), addDays(T, -14)));
  test("בעוד 3 חודשים (in 3 months)", () => expectSingle(parse("בעוד 3 חודשים", he, "single"), addMonths(T, 3)));
  test("בעוד 1 שנה (in 1 year)", () => expectSingle(parse("בעוד 1 שנה", he, "single"), addYears(T, 1)));
  test("לפני 2 שנים (2 years ago)", () => expectSingle(parse("לפני 2 שנים", he, "single"), addYears(T, -2)));
});

describe("single/HE - weekdays", () => {
  test("ביום שלישי → next Tuesday", () => {
    const result = parse("ביום שלישי", he, "single") as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getDay()).toBe(2);
  });
  test("שני הבא (next Monday)", () => {
    const result = parse("שני הבא", he, "single") as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getDay()).toBe(1);
    expect(result.getTime()).toBeGreaterThan(today().getTime());
  });
  test("שישי האחרון (last Friday)", () => {
    const result = parse("שישי האחרון", he, "single") as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getDay()).toBe(5);
    expect(result.getTime()).toBeLessThanOrEqual(today().getTime());
  });
});

describe("single/HE - month name formats", () => {
  const yr = new Date().getFullYear();
  test("15 בינואר 2024 (with ב prefix)", () => expectSingle(parse("15 בינואר 2024", he, "single"), d(2024, 1, 15)));
  test("15 ינואר 2024 (without ב)", () => expectSingle(parse("15 ינואר 2024", he, "single"), d(2024, 1, 15)));
  test("1 אוגוסט (no prefix, no year → current year)", () => expectSingle(parse("1 אוגוסט", he, "single"), d(yr, 8, 1)));
  test("ה-15 בינואר 2024 (with ה- prefix)", () => expectSingle(parse("ה-15 בינואר 2024", he, "single"), d(2024, 1, 15)));
  test("DD/MM/YYYY (HE dmy order)", () => expectSingle(parse("15/3/2024", he, "single"), d(2024, 3, 15)));
  test("DD/MM/YY (84 → 1984)", () => expectSingle(parse("22/3/84", he, "single"), d(1984, 3, 22)));
});

// ---- Range mode - partial context inheritance ----

describe("range - partial date context", () => {
  const yr = new Date().getFullYear();

  test("'march 20 - 24' → day inherits month from first", () =>
    expectRange(parse("march 20 - 24", en, "range"), d(yr, 3, 20), d(yr, 3, 24)));

  test("'20 - 24 march' → day inherits month from second", () =>
    expectRange(parse("20 - 24 march", en, "range"), d(yr, 3, 20), d(yr, 3, 24)));

  test("'march 20 - april 5' → both fully specified", () =>
    expectRange(parse("march 20 - april 5", en, "range"), d(yr, 3, 20), d(yr, 4, 5)));

  test("'2024-03-01 - 15' → day inherits month+year", () =>
    expectRange(parse("2024-03-01 - 15", en, "range"), d(2024, 3, 1), d(2024, 3, 15)));

  test("'march 24 - 20' → reversed order is normalized", () =>
    expectRange(parse("march 24 - 20", en, "range"), d(yr, 3, 20), d(yr, 3, 24)));

  test("'1 ינואר 2024 - 15' HE → day inherits month+year", () =>
    expectRange(parse("1 ינואר 2024 - 15", he, "range"), d(2024, 1, 1), d(2024, 1, 15)));

  test("'from jan 1 to mar 31' EN connector", () =>
    expectRange(parse("from jan 1 to mar 31", en, "range"), d(yr, 1, 1), d(yr, 3, 31)));

  test("'between jan 5 and feb 10' (no year → both current year)", () =>
    expectRange(parse("between jan 5 and feb 10", en, "range"), d(yr, 1, 5), d(yr, 2, 10)));
});

// ---- Range mode - named periods (EN) ----

describe("range/EN - this/last/next week", () => {
  const T = today();
  test("this week", () => {
    const start = startOfWeek(T, en.weekStart);
    expectRange(parse("this week", en, "range"), start, addDays(start, 6));
  });
  test("last week", () => {
    const start = startOfWeek(addDays(T, -7), en.weekStart);
    expectRange(parse("last week", en, "range"), start, addDays(start, 6));
  });
  test("next week", () => {
    const start = startOfWeek(addDays(T, 7), en.weekStart);
    expectRange(parse("next week", en, "range"), start, addDays(start, 6));
  });
});

describe("range/EN - this/last/next month", () => {
  const T = today();
  test("this month", () => expectRange(parse("this month", en, "range"), startOfMonth(T), endOfMonth(T)));
  test("last month", () => {
    const m = addMonths(T, -1);
    expectRange(parse("last month", en, "range"), startOfMonth(m), endOfMonth(m));
  });
  test("next month", () => {
    const m = addMonths(T, 1);
    expectRange(parse("next month", en, "range"), startOfMonth(m), endOfMonth(m));
  });
});

describe("range/EN - this/last/next year", () => {
  const T = today();
  test("this year", () => expectRange(parse("this year", en, "range"), startOfYear(T), endOfYear(T)));
  test("last year", () => expectRange(parse("last year", en, "range"), startOfYear(addYears(T, -1)), endOfYear(addYears(T, -1))));
  test("next year", () => expectRange(parse("next year", en, "range"), startOfYear(addYears(T, 1)), endOfYear(addYears(T, 1))));
});

describe("range/EN - quarters", () => {
  const T = today();
  test("this quarter", () => {
    const q = Math.floor(T.getMonth() / 3);
    expectRange(parse("this quarter", en, "range"), startOfQuarter(T.getFullYear(), q), endOfQuarter(T.getFullYear(), q));
  });
  test("last quarter", () => {
    let q = Math.floor(T.getMonth() / 3) - 1, qyr = T.getFullYear();
    if (q < 0) { q = 3; qyr--; }
    expectRange(parse("last quarter", en, "range"), startOfQuarter(qyr, q), endOfQuarter(qyr, q));
  });
  test("next quarter", () => {
    let q = Math.floor(T.getMonth() / 3) + 1, qyr = T.getFullYear();
    if (q > 3) { q = 0; qyr++; }
    expectRange(parse("next quarter", en, "range"), startOfQuarter(qyr, q), endOfQuarter(qyr, q));
  });
  test("Q1 → Jan 1 – Mar 31 (current year)", () => {
    expectRange(parse("Q1", en, "range"), startOfQuarter(T.getFullYear(), 0), endOfQuarter(T.getFullYear(), 0));
  });
  test("Q2 2024", () => expectRange(parse("Q2 2024", en, "range"), d(2024, 4, 1), d(2024, 6, 30)));
  test("Q3 2024", () => expectRange(parse("Q3 2024", en, "range"), d(2024, 7, 1), d(2024, 9, 30)));
  test("Q4 2023", () => expectRange(parse("Q4 2023", en, "range"), d(2023, 10, 1), d(2023, 12, 31)));
  test("q2 (lowercase)", () => expectRange(parse("q2", en, "range"), startOfQuarter(T.getFullYear(), 1), endOfQuarter(T.getFullYear(), 1)));
});

describe("range/EN - weekends", () => {
  test("this weekend → [Saturday, Sunday]", () => {
    const result = parse("this weekend", en, "range") as [Date, Date];
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].getDay()).toBe(6);
    expect(result[1].getDay()).toBe(0);
    expect(ds(result[1])).toBe(ds(addDays(result[0], 1)));
  });
  test("last weekend → past [Saturday, Sunday]", () => {
    const result = parse("last weekend", en, "range") as [Date, Date];
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].getDay()).toBe(6);
    expect(result[1].getDay()).toBe(0);
    expect(result[0].getTime()).toBeLessThan(today().getTime() + 1);
  });
  test("next weekend → future [Saturday, Sunday]", () => {
    const result = parse("next weekend", en, "range") as [Date, Date];
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].getDay()).toBe(6);
    expect(result[1].getDay()).toBe(0);
    expect(result[0].getTime()).toBeGreaterThan(today().getTime());
  });
});

describe("range/EN - last/next N units", () => {
  const T = today();
  test("last 7 days", () => expectRange(parse("last 7 days", en, "range"), addDays(T, -7), T));
  test("last 30 days", () => expectRange(parse("last 30 days", en, "range"), addDays(T, -30), T));
  test("last 2 weeks", () => expectRange(parse("last 2 weeks", en, "range"), addDays(T, -14), T));
  test("last 3 months", () => expectRange(parse("last 3 months", en, "range"), addMonths(T, -3), T));
  test("last 2 years", () => expectRange(parse("last 2 years", en, "range"), addYears(T, -2), T));
  test("next 14 days", () => expectRange(parse("next 14 days", en, "range"), T, addDays(T, 14)));
  test("next 3 months", () => expectRange(parse("next 3 months", en, "range"), T, addMonths(T, 3)));
  test("next 1 year", () => expectRange(parse("next 1 year", en, "range"), T, addYears(T, 1)));
  test("past 90 days (alias for last N)", () => expectRange(parse("past 90 days", en, "range"), addDays(T, -90), T));
});

describe("range/EN - year and month shortcuts", () => {
  const T = today();
  const yr = T.getFullYear();
  test("4-digit year → full year", () => expectRange(parse("2024", en, "range"), d(2024, 1, 1), d(2024, 12, 31)));
  test("month name alone → full month (current year)", () =>
    expectRange(parse("march", en, "range"), d(yr, 3, 1), d(yr, 3, 31)));
  test("month name + year", () => expectRange(parse("march 2024", en, "range"), d(2024, 3, 1), d(2024, 3, 31)));
  test("month with 30 days (april)", () => expectRange(parse("april 2024", en, "range"), d(2024, 4, 1), d(2024, 4, 30)));
  test("february 2024 (leap year → 29 days)", () =>
    expectRange(parse("february 2024", en, "range"), d(2024, 2, 1), d(2024, 2, 29)));
  test("february 2023 (non-leap year → 28 days)", () =>
    expectRange(parse("february 2023", en, "range"), d(2023, 2, 1), d(2023, 2, 28)));
  test("abbreviated month (jan)", () => expectRange(parse("jan 2025", en, "range"), d(2025, 1, 1), d(2025, 1, 31)));
});

// ---- Range mode - named periods (HE) ----

describe("range/HE - weeks", () => {
  const T = today();
  test("השבוע (this week)", () => {
    const start = startOfWeek(T, he.weekStart);
    expectRange(parse("השבוע", he, "range"), start, addDays(start, 6));
  });
  test("שבוע שעבר (last week)", () => {
    const start = startOfWeek(addDays(T, -7), he.weekStart);
    expectRange(parse("שבוע שעבר", he, "range"), start, addDays(start, 6));
  });
  test("שבוע הבא (next week)", () => {
    const start = startOfWeek(addDays(T, 7), he.weekStart);
    expectRange(parse("שבוע הבא", he, "range"), start, addDays(start, 6));
  });
});

describe("range/HE - months", () => {
  const T = today();
  test("החודש (this month)", () => expectRange(parse("החודש", he, "range"), startOfMonth(T), endOfMonth(T)));
  test("חודש זה (this month alias)", () => expectRange(parse("חודש זה", he, "range"), startOfMonth(T), endOfMonth(T)));
  test("חודש שעבר (last month)", () => {
    const m = addMonths(T, -1);
    expectRange(parse("חודש שעבר", he, "range"), startOfMonth(m), endOfMonth(m));
  });
  test("חודש הבא (next month)", () => {
    const m = addMonths(T, 1);
    expectRange(parse("חודש הבא", he, "range"), startOfMonth(m), endOfMonth(m));
  });
});

describe("range/HE - years", () => {
  const T = today();
  test("השנה (this year)", () => expectRange(parse("השנה", he, "range"), startOfYear(T), endOfYear(T)));
  test("שנה זו (this year alias)", () => expectRange(parse("שנה זו", he, "range"), startOfYear(T), endOfYear(T)));
  test("שנה שעברה (last year)", () =>
    expectRange(parse("שנה שעברה", he, "range"), startOfYear(addYears(T, -1)), endOfYear(addYears(T, -1))));
  test("שנה הבאה (next year)", () =>
    expectRange(parse("שנה הבאה", he, "range"), startOfYear(addYears(T, 1)), endOfYear(addYears(T, 1))));
});

describe("range/HE - quarters", () => {
  const T = today();
  test("הרבעון (this quarter)", () => {
    const q = Math.floor(T.getMonth() / 3);
    expectRange(parse("הרבעון", he, "range"), startOfQuarter(T.getFullYear(), q), endOfQuarter(T.getFullYear(), q));
  });
  test("הרבעון הזה (this quarter alias)", () => {
    const q = Math.floor(T.getMonth() / 3);
    expectRange(parse("הרבעון הזה", he, "range"), startOfQuarter(T.getFullYear(), q), endOfQuarter(T.getFullYear(), q));
  });
  test("רבעון שעבר (last quarter)", () => {
    let q = Math.floor(T.getMonth() / 3) - 1, qyr = T.getFullYear();
    if (q < 0) { q = 3; qyr--; }
    expectRange(parse("רבעון שעבר", he, "range"), startOfQuarter(qyr, q), endOfQuarter(qyr, q));
  });
  test("רבעון הבא (next quarter)", () => {
    let q = Math.floor(T.getMonth() / 3) + 1, qyr = T.getFullYear();
    if (q > 3) { q = 0; qyr++; }
    expectRange(parse("רבעון הבא", he, "range"), startOfQuarter(qyr, q), endOfQuarter(qyr, q));
  });
  test("רבעון ראשון (Q1, current year)", () =>
    expectRange(parse("רבעון ראשון", he, "range"), startOfQuarter(T.getFullYear(), 0), endOfQuarter(T.getFullYear(), 0)));
  test("רבעון שני (Q2, current year)", () =>
    expectRange(parse("רבעון שני", he, "range"), startOfQuarter(T.getFullYear(), 1), endOfQuarter(T.getFullYear(), 1)));
  test("רבעון שלישי (Q3, current year)", () =>
    expectRange(parse("רבעון שלישי", he, "range"), startOfQuarter(T.getFullYear(), 2), endOfQuarter(T.getFullYear(), 2)));
  test("רבעון רביעי (Q4, current year)", () =>
    expectRange(parse("רבעון רביעי", he, "range"), startOfQuarter(T.getFullYear(), 3), endOfQuarter(T.getFullYear(), 3)));
  test("רבעון ראשון 2024 (Q1 with year)", () =>
    expectRange(parse("רבעון ראשון 2024", he, "range"), d(2024, 1, 1), d(2024, 3, 31)));
  test("רבעון רביעי 2023 (Q4 with year)", () =>
    expectRange(parse("רבעון רביעי 2023", he, "range"), d(2023, 10, 1), d(2023, 12, 31)));
  test("רבעון 1 (Q1 numeric, current year)", () =>
    expectRange(parse("רבעון 1", he, "range"), startOfQuarter(T.getFullYear(), 0), endOfQuarter(T.getFullYear(), 0)));
  test("רבעון 2 (Q2 numeric, current year)", () =>
    expectRange(parse("רבעון 2", he, "range"), startOfQuarter(T.getFullYear(), 1), endOfQuarter(T.getFullYear(), 1)));
  test("רבעון 3 (Q3 numeric, current year)", () =>
    expectRange(parse("רבעון 3", he, "range"), startOfQuarter(T.getFullYear(), 2), endOfQuarter(T.getFullYear(), 2)));
  test("רבעון 4 (Q4 numeric, current year)", () =>
    expectRange(parse("רבעון 4", he, "range"), startOfQuarter(T.getFullYear(), 3), endOfQuarter(T.getFullYear(), 3)));
  test("רבעון 2 2024 (Q2 numeric with year)", () =>
    expectRange(parse("רבעון 2 2024", he, "range"), d(2024, 4, 1), d(2024, 6, 30)));
});

describe("range/HE - weekend and N-unit ranges", () => {
  const T = today();
  test("סוף השבוע → [Friday, Saturday]", () => {
    const result = parse("סוף השבוע", he, "range") as [Date, Date];
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].getDay()).toBe(5); // Friday
    expect(result[1].getDay()).toBe(6); // Saturday
    expect(ds(result[1])).toBe(ds(addDays(result[0], 1)));
  });
  test('סופ"ש (weekend shorthand)', () => {
    const result = parse('סופ"ש', he, "range") as [Date, Date];
    expect(result[0].getDay()).toBe(5);
    expect(result[1].getDay()).toBe(6);
  });
  test("30 ימים האחרונים (last 30 days)", () =>
    expectRange(parse("30 ימים האחרונים", he, "range"), addDays(T, -30), T));
  test("7 הימים הבאים (next 7 days)", () =>
    expectRange(parse("7 הימים הבאים", he, "range"), T, addDays(T, 7)));
  test("4 שבועות אחרונים (last 4 weeks)", () =>
    expectRange(parse("4 שבועות אחרונים", he, "range"), addDays(T, -28), T));
  test("3 חודשים הבאים (next 3 months)", () =>
    expectRange(parse("3 חודשים הבאים", he, "range"), T, addMonths(T, 3)));
  test("2 שנים האחרונות (last 2 years, feminine)", () =>
    expectRange(parse("2 שנים האחרונות", he, "range"), addYears(T, -2), T));
  test("2 שבועות הבאים (next 2 weeks)", () =>
    expectRange(parse("2 שבועות הבאים", he, "range"), T, addDays(T, 14)));
});

describe("range/HE - year, month, and universal", () => {
  test("ינואר 2024 → full month", () =>
    expectRange(parse("ינואר 2024", he, "range"), d(2024, 1, 1), d(2024, 1, 31)));
  test("אוגוסט 2023 → full month", () =>
    expectRange(parse("אוגוסט 2023", he, "range"), d(2023, 8, 1), d(2023, 8, 31)));
  test("2024 (universal year)", () =>
    expectRange(parse("2024", he, "range"), d(2024, 1, 1), d(2024, 12, 31)));
  test("Q2 2024 (universal)", () =>
    expectRange(parse("Q2 2024", he, "range"), d(2024, 4, 1), d(2024, 6, 30)));
});

describe("range/HE - explicit range splits", () => {
  const yr = new Date().getFullYear();
  test("generic ' - ' separator", () =>
    expectRange(parse("15 ינואר - 20 ינואר", he, "range"), d(yr, 1, 15), d(yr, 1, 20)));
  test("מ-X עד Y", () =>
    expectRange(parse("מ-1 ינואר עד 31 ינואר", he, "range"), d(yr, 1, 1), d(yr, 1, 31)));
  test("בין X ל-Y", () =>
    expectRange(parse("בין 1 ינואר ל-31 ינואר", he, "range"), d(yr, 1, 1), d(yr, 1, 31)));
  test("בין X לY (no hyphen)", () =>
    expectRange(parse("בין 1 ינואר ל31 ינואר", he, "range"), d(yr, 1, 1), d(yr, 1, 31)));
  test("X עד Y (bare)", () =>
    expectRange(parse("1 ינואר עד 31 ינואר", he, "range"), d(yr, 1, 1), d(yr, 1, 31)));
});

describe("range/HE - month name alone → full month", () => {
  const yr = new Date().getFullYear();
  test("ינואר alone → full January", () =>
    expectRange(parse("ינואר", he, "range"), d(yr, 1, 1), d(yr, 1, 31)));
  test("אוגוסט alone → full August", () =>
    expectRange(parse("אוגוסט", he, "range"), d(yr, 8, 1), d(yr, 8, 31)));
});

// ---- Half-year (EN) ----

describe("range/EN - half-year", () => {
  const yr = new Date().getFullYear();
  test("H1 (current year)", () => expectRange(parse("H1", en, "range"), startOfHalf(yr, 0), endOfHalf(yr, 0)));
  test("H2 (current year)", () => expectRange(parse("H2", en, "range"), startOfHalf(yr, 1), endOfHalf(yr, 1)));
  test("h1 (lowercase)", () => expectRange(parse("h1", en, "range"), startOfHalf(yr, 0), endOfHalf(yr, 0)));
  test("H1 2024", () => expectRange(parse("H1 2024", en, "range"), startOfHalf(2024, 0), endOfHalf(2024, 0)));
  test("H2 2023", () => expectRange(parse("H2 2023", en, "range"), startOfHalf(2023, 1), endOfHalf(2023, 1)));
  test("first half of 2024", () => expectRange(parse("first half of 2024", en, "range"), startOfHalf(2024, 0), endOfHalf(2024, 0)));
  test("second half 2024", () => expectRange(parse("second half 2024", en, "range"), startOfHalf(2024, 1), endOfHalf(2024, 1)));
  test("first half (current year)", () => expectRange(parse("first half", en, "range"), startOfHalf(yr, 0), endOfHalf(yr, 0)));
  test("second half (current year)", () => expectRange(parse("second half", en, "range"), startOfHalf(yr, 1), endOfHalf(yr, 1)));
});

// ---- Half-year (HE) ----

describe("range/HE - half-year", () => {
  const yr = new Date().getFullYear();
  test("מחצית ראשונה (H1 current year)", () => expectRange(parse("מחצית ראשונה", he, "range"), startOfHalf(yr, 0), endOfHalf(yr, 0)));
  test("מחצית שנייה (H2 current year)", () => expectRange(parse("מחצית שנייה", he, "range"), startOfHalf(yr, 1), endOfHalf(yr, 1)));
  test("מחצית ראשונה 2024", () => expectRange(parse("מחצית ראשונה 2024", he, "range"), startOfHalf(2024, 0), endOfHalf(2024, 0)));
  test("מחצית שנייה 2023", () => expectRange(parse("מחצית שנייה 2023", he, "range"), startOfHalf(2023, 1), endOfHalf(2023, 1)));
});

// ---- Start/end of period (EN) ----

describe("single/EN - start and end of period", () => {
  const T = today();
  const yr = T.getFullYear();
  const q = Math.floor(T.getMonth() / 3);
  test("start of this month", () => expectSingle(parse("start of this month", en, "single"), startOfMonth(T)));
  test("start of next month", () => expectSingle(parse("start of next month", en, "single"), startOfMonth(addMonths(T, 1))));
  test("start of last month", () => expectSingle(parse("start of last month", en, "single"), startOfMonth(addMonths(T, -1))));
  test("end of this month", () => expectSingle(parse("end of this month", en, "single"), endOfMonth(T)));
  test("end of next month", () => expectSingle(parse("end of next month", en, "single"), endOfMonth(addMonths(T, 1))));
  test("beginning of 2025", () => expectSingle(parse("beginning of 2025", en, "single"), d(2025, 1, 1)));
  test("end of 2024", () => expectSingle(parse("end of 2024", en, "single"), d(2024, 12, 31)));
  test("start of this year", () => expectSingle(parse("start of this year", en, "single"), startOfYear(T)));
  test("end of this year", () => expectSingle(parse("end of this year", en, "single"), endOfYear(T)));
  test("start of this quarter", () => expectSingle(parse("start of this quarter", en, "single"), startOfQuarter(yr, q)));
  test("end of this quarter", () => expectSingle(parse("end of this quarter", en, "single"), endOfQuarter(yr, q)));
  test("end of last year", () => expectSingle(parse("end of last year", en, "single"), endOfYear(addYears(T, -1))));
  test("start of next year", () => expectSingle(parse("start of next year", en, "single"), startOfYear(addYears(T, 1))));
});

// ---- Start/end of period (HE) ----

describe("single/HE - start and end of period", () => {
  const T = today();
  const yr = T.getFullYear();
  const q = Math.floor(T.getMonth() / 3);
  test("תחילת החודש (start of this month)", () => expectSingle(parse("תחילת החודש", he, "single"), startOfMonth(T)));
  test("סוף החודש (end of this month)", () => expectSingle(parse("סוף החודש", he, "single"), endOfMonth(T)));
  test("תחילת השנה (start of this year)", () => expectSingle(parse("תחילת השנה", he, "single"), startOfYear(T)));
  test("סוף השנה (end of this year)", () => expectSingle(parse("סוף השנה", he, "single"), endOfYear(T)));
  test("תחילת הרבעון (start of this quarter)", () => expectSingle(parse("תחילת הרבעון", he, "single"), startOfQuarter(yr, q)));
  test("סוף הרבעון (end of this quarter)", () => expectSingle(parse("סוף הרבעון", he, "single"), endOfQuarter(yr, q)));
  test("תחילת החודש הבא (start of next month)", () => expectSingle(parse("תחילת החודש הבא", he, "single"), startOfMonth(addMonths(T, 1))));
  test("סוף השנה שעברה (end of last year)", () => expectSingle(parse("סוף השנה שעברה", he, "single"), endOfYear(addYears(T, -1))));
});

// ---- Written-out numbers (EN) ----

describe("single/EN - written-out numbers", () => {
  const T = today();
  test("in three days", () => expectSingle(parse("in three days", en, "single"), addDays(T, 3)));
  test("three days ago", () => expectSingle(parse("three days ago", en, "single"), addDays(T, -3)));
  test("in two weeks", () => expectSingle(parse("in two weeks", en, "single"), addDays(T, 14)));
  test("two weeks ago", () => expectSingle(parse("two weeks ago", en, "single"), addDays(T, -14)));
  test("in five months", () => expectSingle(parse("in five months", en, "single"), addMonths(T, 5)));
  test("ten years ago", () => expectSingle(parse("ten years ago", en, "single"), addYears(T, -10)));
  test("in a day", () => expectSingle(parse("in a day", en, "single"), addDays(T, 1)));
  test("a week ago", () => expectSingle(parse("a week ago", en, "single"), addDays(T, -7)));
  test("in a month", () => expectSingle(parse("in a month", en, "single"), addMonths(T, 1)));
});

// ---- Written-out numbers (HE) ----

describe("single/HE - written-out numbers", () => {
  const T = today();
  test("בעוד שלושה ימים (in 3 days, masc)", () => expectSingle(parse("בעוד שלושה ימים", he, "single"), addDays(T, 3)));
  test("לפני שלושה ימים (3 days ago, masc)", () => expectSingle(parse("לפני שלושה ימים", he, "single"), addDays(T, -3)));
  test("בעוד שלוש שנים (in 3 years, fem)", () => expectSingle(parse("בעוד שלוש שנים", he, "single"), addYears(T, 3)));
  test("לפני שלוש שנים (3 years ago, fem)", () => expectSingle(parse("לפני שלוש שנים", he, "single"), addYears(T, -3)));
  test("בעוד חמישה שבועות (in 5 weeks, masc)", () => expectSingle(parse("בעוד חמישה שבועות", he, "single"), addDays(T, 35)));
  test("בעוד ארבעה חודשים (in 4 months, masc)", () => expectSingle(parse("בעוד ארבעה חודשים", he, "single"), addMonths(T, 4)));
});

// ---- Period-to-date (EN) ----

describe("range/EN - period-to-date", () => {
  const T = today();
  const yr = T.getFullYear();
  const q = Math.floor(T.getMonth() / 3);
  test("year to date", () => expectRange(parse("year to date", en, "range"), startOfYear(T), T));
  test("YTD", () => expectRange(parse("YTD", en, "range"), startOfYear(T), T));
  test("month to date", () => expectRange(parse("month to date", en, "range"), startOfMonth(T), T));
  test("MTD", () => expectRange(parse("MTD", en, "range"), startOfMonth(T), T));
  test("quarter to date", () => expectRange(parse("quarter to date", en, "range"), startOfQuarter(yr, q), T));
  test("QTD", () => expectRange(parse("QTD", en, "range"), startOfQuarter(yr, q), T));
});

// ---- Period-to-date (HE) ----

describe("range/HE - period-to-date", () => {
  const T = today();
  const yr = T.getFullYear();
  const q = Math.floor(T.getMonth() / 3);
  test("מתחילת השנה (year to date)", () => expectRange(parse("מתחילת השנה", he, "range"), startOfYear(T), T));
  test("מתחילת החודש (month to date)", () => expectRange(parse("מתחילת החודש", he, "range"), startOfMonth(T), T));
  test("מתחילת הרבעון (quarter to date)", () => expectRange(parse("מתחילת הרבעון", he, "range"), startOfQuarter(yr, q), T));
});

// ---- Nth weekday of month (EN) ----

describe("single/EN - nth weekday of month", () => {
  const yr = new Date().getFullYear();
  test("first Monday of March", () => expectSingle(parse("first Monday of March", en, "single"), nthWeekdayOfMonth(yr, 3, 1, 1)));
  test("third Tuesday of November 2024", () => expectSingle(parse("third Tuesday of November 2024", en, "single"), nthWeekdayOfMonth(2024, 11, 2, 3)));
  test("last Friday of January", () => expectSingle(parse("last Friday of January", en, "single"), nthWeekdayOfMonth(yr, 1, 5, -1)));
  test("second Wednesday of June 2025", () => expectSingle(parse("second Wednesday of June 2025", en, "single"), nthWeekdayOfMonth(2025, 6, 3, 2)));
  test("last Sunday of December 2024", () => expectSingle(parse("last Sunday of December 2024", en, "single"), nthWeekdayOfMonth(2024, 12, 0, -1)));
});

// ---- Nth weekday of month (HE) ----

describe("single/HE - nth weekday of month", () => {
  const yr = new Date().getFullYear();
  test("שני הראשון של מרץ (first Monday of March)", () => expectSingle(parse("שני הראשון של מרץ", he, "single"), nthWeekdayOfMonth(yr, 3, 1, 1)));
  test("שישי האחרון של ינואר (last Friday of January)", () => expectSingle(parse("שישי האחרון של ינואר", he, "single"), nthWeekdayOfMonth(yr, 1, 5, -1)));
  test("שלישי השלישי של נובמבר 2024 (third Tuesday of November 2024)", () => expectSingle(parse("שלישי השלישי של נובמבר 2024", he, "single"), nthWeekdayOfMonth(2024, 11, 2, 3)));
});

// ---- Rolling / trailing windows (EN) ----

describe("range/EN - rolling and trailing windows", () => {
  const T = today();
  test("rolling 30 days", () => expectRange(parse("rolling 30 days", en, "range"), addDays(T, -30), T));
  test("rolling 7 days", () => expectRange(parse("rolling 7 days", en, "range"), addDays(T, -7), T));
  test("trailing 12 months", () => expectRange(parse("trailing 12 months", en, "range"), addMonths(T, -12), T));
  test("trailing 4 weeks", () => expectRange(parse("trailing 4 weeks", en, "range"), addDays(T, -28), T));
  test("over the last 7 days", () => expectRange(parse("over the last 7 days", en, "range"), addDays(T, -7), T));
  test("within the last 30 days", () => expectRange(parse("within the last 30 days", en, "range"), addDays(T, -30), T));
});

describe("parseWithAutoDetect", () => {
  test("Hebrew input with [en, he] - tries en first (fails), succeeds with he", () => {
    const result = parseWithAutoDetect("השבוע", [en, he], "range");
    expect(Array.isArray(result)).toBe(true);
  });
  test("English input with [he, en] - tries he first (fails), succeeds with en", () => {
    const result = parseWithAutoDetect("next week", [he, en], "range");
    expect(Array.isArray(result)).toBe(true);
  });
  test("Ambiguous numeric date uses first locale (en wins mdy order)", () => {
    const result = parseWithAutoDetect("01/15/2024", [en, he], "single");
    expectSingle(result, d(2024, 1, 15));
  });
  test("Unrecognizable input returns null", () => {
    expect(parseWithAutoDetect("zzz not a date", [en, he], "single")).toBeNull();
  });
  test("Empty input returns null", () => {
    expect(parseWithAutoDetect("", [en, he], "single")).toBeNull();
  });
});
