import type { Locale, DateValue, Mode } from "./types";

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function addYears(d: Date, n: number): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function expandYear(y: number): number {
  if (y >= 100) return y;
  return y < 50 ? 2000 + y : 1900 + y;
}

function tryParseNumeric(s: string, order: "dmy" | "mdy"): Date | null {
  // YYYY-MM-DD (ISO)
  let m = s.match(/^(\d{2,4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const yr = expandYear(+m[1]);
    const d = new Date(yr, +m[2] - 1, +m[3]);
    return isValid(d, +m[2] - 1, +m[3]) ? startOfDay(d) : null;
  }
  // DD.MM.YYYY
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) {
    const yr = expandYear(+m[3]);
    const d = new Date(yr, +m[2] - 1, +m[1]);
    return isValid(d, +m[2] - 1, +m[1]) ? startOfDay(d) : null;
  }
  // DD/MM/YYYY or MM/DD/YYYY depending on locale; if preferred order fails, try the other
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [a, b, yr] = [+m[1], +m[2], expandYear(+m[3])];
    for (const [mo, dy] of order === "dmy"
      ? [[b - 1, a], [a - 1, b]]
      : [[a - 1, b], [b - 1, a]]) {
      const d = new Date(yr, mo, dy);
      if (isValid(d, mo, dy)) return startOfDay(d);
    }
    return null;
  }
  return null;
}

function isValid(d: Date, expectedMonth: number, expectedDay: number): boolean {
  return !isNaN(d.getTime()) && d.getMonth() === expectedMonth && d.getDate() === expectedDay;
}

function matchMonthName(s: string, locale: Locale): number {
  const lower = s.toLowerCase();
  for (let i = 0; i < 12; i++) {
    if (locale.months[i].toLowerCase() === lower) return i;
    if (locale.monthsShort[i].toLowerCase().replace(/[׳'.]/g, "") === lower.replace(/[׳'.]/g, "")) return i;
  }
  return -1;
}

function matchDayName(s: string, locale: Locale): number {
  const lower = s.toLowerCase();
  for (let i = 0; i < 7; i++) {
    if (locale.days[i].toLowerCase() === lower) return i;
    if (locale.daysShort[i].toLowerCase().replace(/[׳'.]/g, "") === lower.replace(/[׳'.]/g, "")) return i;
  }
  return -1;
}

function nextWeekday(target: number, direction: "next" | "last" | "this"): Date {
  const base = today();
  const current = base.getDay();
  if (direction === "this") {
    const diff = target - current;
    return addDays(base, diff);
  }
  if (direction === "next") {
    const diff = ((target - current + 7) % 7) || 7;
    return addDays(base, diff);
  }
  // last
  const diff = ((current - target + 7) % 7) || 7;
  return addDays(base, -diff);
}

function parseUnit(s: string, locale: Locale): "day" | "week" | "month" | "year" | "quarter" | null {
  const lower = s.toLowerCase();
  if (locale.tokens.units.day.some(u => lower === u)) return "day";
  if (locale.tokens.units.week.some(u => lower === u)) return "week";
  if (locale.tokens.units.month.some(u => lower === u)) return "month";
  if (locale.tokens.units.year.some(u => lower === u)) return "year";
  if (locale.tokens.units.quarter.some(u => lower === u)) return "quarter";
  return null;
}

function applyOffset(base: Date, n: number, unit: "day" | "week" | "month" | "year" | "quarter"): Date {
  if (unit === "day") return addDays(base, n);
  if (unit === "week") return addWeeks(base, n);
  if (unit === "month") return addMonths(base, n);
  if (unit === "year") return addYears(base, n);
  return addMonths(base, n * 3); // quarter
}

function startOfWeek(d: Date, weekStart: number): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - ((r.getDay() - weekStart + 7) % 7));
  return r;
}

function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function startOfYear(d: Date): Date { return new Date(d.getFullYear(), 0, 1); }
function endOfYear(d: Date): Date { return new Date(d.getFullYear(), 11, 31); }
function startOfQuarter(year: number, q: number): Date { return new Date(year, q * 3, 1); }
function endOfQuarter(year: number, q: number): Date { return new Date(year, q * 3 + 3, 0); }

function computeWeekend(dir: "this" | "last" | "next", t: Date, locale: Locale): [Date, Date] {
  const ws = locale.weekendStart;
  const dow = t.getDay();
  const daysToWs = (ws - dow + 7) % 7;
  if (dir === "this") {
    const start = addDays(t, daysToWs === 0 ? 0 : daysToWs);
    return [start, addDays(start, 1)];
  }
  if (dir === "last") {
    const daysBack = daysToWs === 0 ? 7 : 7 - daysToWs;
    const start = addDays(t, -daysBack);
    return [start, addDays(start, 1)];
  }
  // next
  const thisSat = addDays(t, daysToWs === 0 ? 0 : daysToWs);
  return [addDays(thisSat, 7), addDays(thisSat, 8)];
}

function parseNamedRange(input: string, locale: Locale): [Date, Date] | null {
  const s = input.trim();
  const lower = s.toLowerCase();
  const t = today();

  const weekRange = (anchor: Date): [Date, Date] => {
    const start = startOfWeek(anchor, locale.weekStart);
    return [start, addDays(start, 6)];
  };
  const monthRange = (anchor: Date): [Date, Date] => [startOfMonth(anchor), endOfMonth(anchor)];
  const yearRange = (anchor: Date): [Date, Date] => [startOfYear(anchor), endOfYear(anchor)];
  const quarterRange = (yr: number, q: number): [Date, Date] => [startOfQuarter(yr, q), endOfQuarter(yr, q)];

  let m: RegExpMatchArray | null;

  const curQ = Math.floor(t.getMonth() / 3);
  const curQyr = t.getFullYear();

  // 1. Named period exact-match lookup (handles all HE fixed phrases + any EN ones)
  const nr = locale.tokens.namedRanges;
  const matchPhrase = (arr: string[]) => arr.some(p => s === p || lower === p.toLowerCase());

  if (matchPhrase(nr.thisWeek))    return weekRange(t);
  if (matchPhrase(nr.lastWeek))    return weekRange(addDays(t, -7));
  if (matchPhrase(nr.nextWeek))    return weekRange(addDays(t, 7));
  if (matchPhrase(nr.thisMonth))   return monthRange(t);
  if (matchPhrase(nr.lastMonth))   return monthRange(addMonths(t, -1));
  if (matchPhrase(nr.nextMonth))   return monthRange(addMonths(t, 1));
  if (matchPhrase(nr.thisYear))    return yearRange(t);
  if (matchPhrase(nr.lastYear))    return yearRange(addYears(t, -1));
  if (matchPhrase(nr.nextYear))    return yearRange(addYears(t, 1));
  if (matchPhrase(nr.thisQuarter)) return quarterRange(curQyr, curQ);
  if (matchPhrase(nr.lastQuarter)) {
    let q = curQ - 1, qyr = curQyr;
    if (q < 0) { q = 3; qyr--; }
    return quarterRange(qyr, q);
  }
  if (matchPhrase(nr.nextQuarter)) {
    let q = curQ + 1, qyr = curQyr;
    if (q > 3) { q = 0; qyr++; }
    return quarterRange(qyr, q);
  }
  if (matchPhrase(nr.weekend)) return computeWeekend("this", t, locale);

  // 2. Prefix-based period matching (EN: "this week", "last 30 days", "next month", "past 90 days")
  const isWeekend = (w: string) => nr.weekend.some(p => w === p.toLowerCase());

  for (const prefix of locale.tokens.thisPrefix) {
    const lp = prefix.toLowerCase();
    if (lower.startsWith(lp + " ")) {
      const what = lower.slice(lp.length + 1).trim();
      if (locale.tokens.units.week.some(u => what === u.toLowerCase()))    return weekRange(t);
      if (locale.tokens.units.month.some(u => what === u.toLowerCase()))   return monthRange(t);
      if (locale.tokens.units.year.some(u => what === u.toLowerCase()))    return yearRange(t);
      if (locale.tokens.units.quarter.some(u => what === u.toLowerCase())) return quarterRange(curQyr, curQ);
      if (isWeekend(what)) return computeWeekend("this", t, locale);
    }
  }

  for (const prefix of locale.tokens.lastPrefix) {
    const lp = prefix.toLowerCase();
    if (lower.startsWith(lp + " ")) {
      const what = lower.slice(lp.length + 1).trim();
      const nm = what.match(/^(\d+)\s+(.+)$/);
      if (nm) {
        const unit = parseUnit(nm[2], locale);
        if (unit) return [applyOffset(t, -+nm[1], unit), t];
      }
      if (locale.tokens.units.week.some(u => what === u.toLowerCase()))    return weekRange(addDays(t, -7));
      if (locale.tokens.units.month.some(u => what === u.toLowerCase()))   return monthRange(addMonths(t, -1));
      if (locale.tokens.units.year.some(u => what === u.toLowerCase()))    return yearRange(addYears(t, -1));
      if (locale.tokens.units.quarter.some(u => what === u.toLowerCase())) {
        let q = curQ - 1, qyr = curQyr;
        if (q < 0) { q = 3; qyr--; }
        return quarterRange(qyr, q);
      }
      if (isWeekend(what)) return computeWeekend("last", t, locale);
    }
  }

  for (const prefix of locale.tokens.nextPrefix) {
    const lp = prefix.toLowerCase();
    if (lower.startsWith(lp + " ")) {
      const what = lower.slice(lp.length + 1).trim();
      const nm = what.match(/^(\d+)\s+(.+)$/);
      if (nm) {
        const unit = parseUnit(nm[2], locale);
        if (unit) return [t, applyOffset(t, +nm[1], unit)];
      }
      if (locale.tokens.units.week.some(u => what === u.toLowerCase()))    return weekRange(addDays(t, 7));
      if (locale.tokens.units.month.some(u => what === u.toLowerCase()))   return monthRange(addMonths(t, 1));
      if (locale.tokens.units.year.some(u => what === u.toLowerCase()))    return yearRange(addYears(t, 1));
      if (locale.tokens.units.quarter.some(u => what === u.toLowerCase())) {
        let q = curQ + 1, qyr = curQyr;
        if (q > 3) { q = 0; qyr++; }
        return quarterRange(qyr, q);
      }
      if (isWeekend(what)) return computeWeekend("next", t, locale);
    }
  }

  for (const prefix of locale.tokens.pastPrefix) {
    const lp = prefix.toLowerCase();
    if (lower.startsWith(lp + " ")) {
      const rest = lower.slice(lp.length + 1).trim();
      const nm = rest.match(/^(\d+)\s+(.+)$/);
      if (nm) {
        const unit = parseUnit(nm[2], locale);
        if (unit) return [applyOffset(t, -+nm[1], unit), t];
      }
    }
  }

  // 3. N-unit-then-suffix pattern (HE: "30 ימים האחרונים", "7 הימים הבאים")
  const allSuffixes = [...locale.tokens.nUnitsPastSuffix, ...locale.tokens.nUnitsFutureSuffix];
  if (allSuffixes.length > 0) {
    const re = new RegExp(`^(\\d+)\\s+(\\S+)\\s+(${allSuffixes.map(escapeRegex).join("|")})$`);
    m = s.match(re);
    if (m) {
      let unit = parseUnit(m[2], locale);
      if (!unit && m[2].length > 1) unit = parseUnit(m[2].slice(1), locale);
      if (unit) {
        const isPast = locale.tokens.nUnitsPastSuffix.includes(m[3]);
        return isPast ? [applyOffset(t, -+m[1], unit), t] : [t, applyOffset(t, +m[1], unit)];
      }
    }
  }

  // 4. Universal: Q1–Q4 [year]
  m = s.match(/^[Qq]([1-4])(?:\s+(\d{2,4}))?$/);
  if (m) return quarterRange(m[2] ? expandYear(+m[2]) : t.getFullYear(), +m[1] - 1);

  // 5. Universal: 4-digit year alone → full year
  m = s.match(/^(\d{4})$/);
  if (m && +m[1] >= 1900 && +m[1] <= 2100) return yearRange(new Date(+m[1], 0, 1));

  // 6. Universal: month name [year] → full month (EN: optional year; HE: year required)
  let mname = lower.match(/^([a-z]+)(?:\s+(\d{2,4}))?$/);
  if (!mname) {
    const genM = s.match(/^(.+?)\s+(\d{2,4})$/);
    if (genM) mname = genM;
  }
  if (mname && (mname[2] || !locale.requireYearForMonthRange)) {
    const mi = matchMonthName(mname[1].trim(), locale);
    if (mi >= 0) {
      const myr = mname[2] ? expandYear(+mname[2]) : t.getFullYear();
      return [startOfMonth(new Date(myr, mi, 1)), endOfMonth(new Date(myr, mi, 1))];
    }
  }

  return null;
}

function parseSingle(input: string, locale: Locale): Date | null {
  const s = input.trim();
  if (!s) return null;

  // Numeric formats
  const numeric = tryParseNumeric(s, locale.numericOrder);
  if (numeric) return numeric;

  const lower = s.toLowerCase();

  // Today / now
  if (locale.tokens.today.some(t => t.toLowerCase() === lower)) return today();
  // Tomorrow
  if (locale.tokens.tomorrow.some(t => t.toLowerCase() === lower)) return addDays(today(), 1);
  // Yesterday
  if (locale.tokens.yesterday.some(t => t.toLowerCase() === lower)) return addDays(today(), -1);

  // 1. "in N unit" (prefix before number)
  for (const prefix of locale.tokens.inPrefix) {
    const re = new RegExp(`^${escapeRegex(prefix)}\\s+(\\d+)\\s+(\\S+)$`, "i");
    const m = s.match(re) ?? lower.match(re);
    if (m) {
      const unit = parseUnit(m[2], locale);
      if (unit) return applyOffset(today(), +m[1], unit);
    }
  }

  // 2. "N unit ago" (suffix) OR "ago N unit" (prefix)
  for (const affix of locale.tokens.agoSuffix) {
    const esc = escapeRegex(affix);
    let m = s.match(new RegExp(`^(\\d+)\\s+(\\S+)\\s+${esc}$`, "i"))
          ?? lower.match(new RegExp(`^(\\d+)\\s+(\\S+)\\s+${esc}$`, "i"));
    if (m) {
      const unit = parseUnit(m[2], locale);
      if (unit) return applyOffset(today(), -+m[1], unit);
    }
    m = s.match(new RegExp(`^${esc}\\s+(\\d+)\\s+(\\S+)$`, "i"))
      ?? lower.match(new RegExp(`^${esc}\\s+(\\d+)\\s+(\\S+)$`, "i"));
    if (m) {
      const unit = parseUnit(m[2], locale);
      if (unit) return applyOffset(today(), -+m[1], unit);
    }
  }

  // 3. Weekday — prefix position ("next Monday", "ביום שלישי")
  type Dir = "next" | "last" | "this";
  const prefixDirMap: Array<{ toks: string[]; dir: Dir }> = [
    { toks: locale.tokens.nextPrefix,      dir: "next" },
    { toks: locale.tokens.lastPrefix,      dir: "last" },
    { toks: locale.tokens.thisPrefix,      dir: "this" },
    { toks: locale.tokens.weekdayOnPrefix, dir: "next" },
  ];
  for (const { toks, dir } of prefixDirMap) {
    for (const tok of toks) {
      const after = s.startsWith(tok + " ") ? s.slice(tok.length + 1).trim()
                  : lower.startsWith(tok.toLowerCase() + " ") ? lower.slice(tok.length + 1).trim()
                  : null;
      if (after !== null) {
        const dayIdx = matchDayName(after, locale);
        if (dayIdx >= 0) return nextWeekday(dayIdx, dir);
      }
    }
  }

  // 4. Weekday — suffix position ("שני הבא", "שישי האחרון")
  const suffixDirMap: Array<{ toks: string[]; dir: Dir }> = [
    { toks: locale.tokens.nextPrefix, dir: "next" },
    { toks: locale.tokens.lastPrefix, dir: "last" },
  ];
  for (const { toks, dir } of suffixDirMap) {
    for (const tok of toks) {
      if (s.endsWith(" " + tok)) {
        const dayStr = s.slice(0, s.length - tok.length - 1).trim();
        const dayIdx = matchDayName(dayStr, locale);
        if (dayIdx >= 0) return nextWeekday(dayIdx, dir);
      }
    }
  }

  // 5. Day-then-month text format ("15 January 2024", "ה-15 בינואר 2024")
  for (const dp of [...locale.tokens.dayNumericPrefix, ""]) {
    const withoutDp = dp && s.startsWith(dp) ? s.slice(dp.length) : (!dp ? s : null);
    if (!withoutDp) continue;
    const dayM = withoutDp.match(/^(\d{1,2})\s+(.+)$/);
    if (!dayM) continue;
    const day = +dayM[1];
    const rest = dayM[2];
    for (const mp of [...locale.tokens.monthNamePrefix, ""]) {
      const withoutMp = mp && rest.startsWith(mp) ? rest.slice(mp.length) : (!mp ? rest : null);
      if (!withoutMp) continue;
      const yearM = withoutMp.match(/^(.+?)\s+(\d{2,4})$/);
      const monthStr = (yearM ? yearM[1] : withoutMp).trim();
      const yr = yearM ? expandYear(+yearM[2]) : today().getFullYear();
      const mo = matchMonthName(monthStr, locale);
      if (mo >= 0) {
        const d = new Date(yr, mo, day);
        if (isValid(d, mo, day)) return startOfDay(d);
      }
    }
  }

  // 6. Month-then-day text format ("January 15", "January 15 2024")
  const spaceIdx = s.indexOf(" ");
  if (spaceIdx > 0) {
    const mo = matchMonthName(s.slice(0, spaceIdx), locale);
    if (mo >= 0) {
      const rest = s.slice(spaceIdx + 1).trim();
      const m = rest.match(/^(\d{1,2})(?:[,\s]+(\d{2,4}))?$/);
      if (m) {
        const yr = m[2] ? expandYear(+m[2]) : today().getFullYear();
        const d = new Date(yr, mo, +m[1]);
        if (isValid(d, mo, +m[1])) return startOfDay(d);
      }
    }
  }

  return null;
}

function parseSingleWithContext(input: string, locale: Locale, ctx: Date): Date | null {
  const normal = parseSingle(input, locale);
  if (normal) return normal;

  const s = input.trim();

  // Just a day number → inherit month and year from ctx
  if (/^\d{1,2}$/.test(s)) {
    const day = +s;
    const d = new Date(ctx.getFullYear(), ctx.getMonth(), day);
    return isValid(d, ctx.getMonth(), day) ? startOfDay(d) : null;
  }

  // DD/MM or MM/DD without year → inherit year from ctx
  let m = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    const yr = ctx.getFullYear();
    for (const [mo, dy] of locale.numericOrder === "dmy"
      ? [[b - 1, a], [a - 1, b]]
      : [[a - 1, b], [b - 1, a]]) {
      const d = new Date(yr, mo as number, dy as number);
      if (isValid(d, mo as number, dy as number)) return startOfDay(d);
    }
  }

  // DD.MM without year → inherit year from ctx
  m = s.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (m) {
    const yr = ctx.getFullYear();
    const d = new Date(yr, +m[2] - 1, +m[1]);
    return isValid(d, +m[2] - 1, +m[1]) ? startOfDay(d) : null;
  }

  return null;
}

function splitRange(input: string, locale: Locale): [string, string] | null {
  for (const [from, to] of locale.tokens.rangePairs) {
    const fromPat = from ? escapeRegex(from) + "\\s*" : "";
    const re = new RegExp(`^${fromPat}(.+?)\\s+${escapeRegex(to)}\\s*(.+)$`, "i");
    const m = input.match(re);
    if (m) return [m[1].trim(), m[2].trim()];
  }
  const parts = input.split(/\s+-\s+/);
  if (parts.length === 2) return [parts[0].trim(), parts[1].trim()];
  return null;
}

export function parseWithAutoDetect(input: string, locales: Locale[], mode: Mode): DateValue {
  for (const locale of locales) {
    const result = parse(input, locale, mode);
    if (result !== null) return result;
  }
  return null;
}

export function parse(input: string, locale: Locale, mode: Mode): DateValue {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (mode === "range") {
    const named = parseNamedRange(trimmed, locale);
    if (named) return named;

    const parts = splitRange(trimmed, locale);
    if (parts) {
      const s0 = parts[0].trim();
      const s1 = parts[1].trim();
      const d0 = parseSingle(s0, locale);
      const d1 = parseSingle(s1, locale);
      if (d0 && d1) return d0 <= d1 ? [d0, d1] : [d1, d0];
      if (d0) {
        const d1c = parseSingleWithContext(s1, locale, d0);
        if (d1c) return d0 <= d1c ? [d0, d1c] : [d1c, d0];
      }
      if (d1) {
        const d0c = parseSingleWithContext(s0, locale, d1);
        if (d0c) return d0c <= d1 ? [d0c, d1] : [d1, d0c];
      }
    }
  }

  return parseSingle(trimmed, locale);
}
