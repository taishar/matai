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

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function tryParseNumeric(s: string, order: "dmy" | "mdy"): Date | null {
  // YYYY-MM-DD (ISO)
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isValid(d, +m[2] - 1, +m[3]) ? startOfDay(d) : null;
  }
  // DD.MM.YYYY
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return isValid(d, +m[2] - 1, +m[1]) ? startOfDay(d) : null;
  }
  // DD/MM/YYYY or MM/DD/YYYY depending on locale
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [a, b, yr] = [+m[1], +m[2], +m[3]];
    const [mo, dy] = order === "dmy" ? [b - 1, a] : [a - 1, b];
    const d = new Date(yr, mo, dy);
    return isValid(d, mo, dy) ? startOfDay(d) : null;
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

function parseUnit(s: string, locale: Locale): "day" | "week" | "month" | null {
  const lower = s.toLowerCase();
  if (locale.tokens.units.day.some(u => lower === u)) return "day";
  if (locale.tokens.units.week.some(u => lower === u)) return "week";
  if (locale.tokens.units.month.some(u => lower === u)) return "month";
  return null;
}

function applyOffset(base: Date, n: number, unit: "day" | "week" | "month"): Date {
  if (unit === "day") return addDays(base, n);
  if (unit === "week") return addWeeks(base, n);
  return addMonths(base, n);
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

  if (locale.code === "en") {
    // "in N unit(s)"
    let m = lower.match(/^in\s+(\d+)\s+(\w+)$/);
    if (m) {
      const unit = parseUnit(m[2], locale);
      if (unit) return applyOffset(today(), +m[1], unit);
    }
    // "N unit(s) ago"
    m = lower.match(/^(\d+)\s+(\w+)\s+ago$/);
    if (m) {
      const unit = parseUnit(m[2], locale);
      if (unit) return applyOffset(today(), -+m[1], unit);
    }
    // "next/last/this weekday"
    m = lower.match(/^(next|last|this)\s+(.+)$/);
    if (m) {
      const dir = m[1] as "next" | "last" | "this";
      const dayIdx = matchDayName(m[2], locale);
      if (dayIdx >= 0) return nextWeekday(dayIdx, dir);
    }
    // "[Month] [D][, YYYY]" or "[D] [Month] [YYYY]"
    // "January 15" / "Jan 15" / "January 15, 2024" / "15 January" / "15 January 2024"
    m = lower.match(/^([a-z]+)\s+(\d{1,2})(?:[,\s]+(\d{4}))?$/);
    if (m) {
      const mo = matchMonthName(m[1], locale);
      if (mo >= 0) {
        const yr = m[3] ? +m[3] : new Date().getFullYear();
        const d = new Date(yr, mo, +m[2]);
        if (isValid(d, mo, +m[2])) return startOfDay(d);
      }
    }
    m = lower.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/);
    if (m) {
      const mo = matchMonthName(m[2], locale);
      if (mo >= 0) {
        const yr = m[3] ? +m[3] : new Date().getFullYear();
        const d = new Date(yr, mo, +m[1]);
        if (isValid(d, mo, +m[1])) return startOfDay(d);
      }
    }
  }

  if (locale.code === "he") {
    // "בעוד N unit"
    let m = s.match(/^בעוד\s+(\d+)\s+(.+)$/);
    if (m) {
      const unit = parseUnit(m[2], locale);
      if (unit) return applyOffset(today(), +m[1], unit);
    }
    // "לפני N unit"
    m = s.match(/^לפני\s+(\d+)\s+(.+)$/);
    if (m) {
      const unit = parseUnit(m[2], locale);
      if (unit) return applyOffset(today(), -+m[1], unit);
    }
    // "ביום [weekday]" or "[weekday] הבא/האחרון"
    m = s.match(/^ביום\s+(.+)$/);
    if (m) {
      const dayIdx = matchDayName(m[1].trim(), locale);
      if (dayIdx >= 0) return nextWeekday(dayIdx, "next");
    }
    m = s.match(/^(.+?)\s+(הבא|הקרוב)$/);
    if (m) {
      const dayIdx = matchDayName(m[1].trim(), locale);
      if (dayIdx >= 0) return nextWeekday(dayIdx, "next");
    }
    m = s.match(/^(.+?)\s+(האחרון|הקודם)$/);
    if (m) {
      const dayIdx = matchDayName(m[1].trim(), locale);
      if (dayIdx >= 0) return nextWeekday(dayIdx, "last");
    }
    // "15 בינואר [2024]" or "ה-15 בינואר [2024]" or "ה-15 ב[Month]"
    m = s.match(/^(?:ה-)?(\d{1,2})\s+ב(.+?)(?:\s+(\d{4}))?$/);
    if (m) {
      const mo = matchMonthName(m[2].trim(), locale);
      if (mo >= 0) {
        const yr = m[3] ? +m[3] : new Date().getFullYear();
        const d = new Date(yr, mo, +m[1]);
        if (isValid(d, mo, +m[1])) return startOfDay(d);
      }
    }
    // "[Month] 15 [2024]"
    m = s.match(/^(.+?)\s+(\d{1,2})(?:\s+(\d{4}))?$/);
    if (m) {
      const mo = matchMonthName(m[1].trim(), locale);
      if (mo >= 0) {
        const yr = m[3] ? +m[3] : new Date().getFullYear();
        const d = new Date(yr, mo, +m[2]);
        if (isValid(d, mo, +m[2])) return startOfDay(d);
      }
    }
  }

  return null;
}

function splitRange(input: string, locale: Locale): [string, string] | null {
  // Try "from X to Y" / "between X and Y" (English)
  if (locale.code === "en") {
    let m = input.match(/^(?:from\s+)?(.+?)\s+to\s+(.+)$/i);
    if (m) return [m[1], m[2]];
    m = input.match(/^between\s+(.+?)\s+and\s+(.+)$/i);
    if (m) return [m[1], m[2]];
  }
  // Hebrew: "מ-X עד Y" / "בין X ל-Y" / "X עד Y"
  if (locale.code === "he") {
    let m = input.match(/^מ-?(.+?)\s+עד\s+(.+)$/);
    if (m) return [m[1], m[2]];
    m = input.match(/^בין\s+(.+?)\s+ל-?(.+)$/);
    if (m) return [m[1], m[2]];
    m = input.match(/^(.+?)\s+עד\s+(.+)$/);
    if (m) return [m[1], m[2]];
  }
  // Generic " - " separator (both)
  const parts = input.split(/\s+-\s+/);
  if (parts.length === 2) return [parts[0], parts[1]];
  return null;
}

export function parse(input: string, locale: Locale, mode: Mode): DateValue {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (mode === "range") {
    const parts = splitRange(trimmed, locale);
    if (parts) {
      const start = parseSingle(parts[0].trim(), locale);
      const end = parseSingle(parts[1].trim(), locale);
      if (start && end) {
        return start <= end ? [start, end] : [end, start];
      }
    }
  }

  return parseSingle(trimmed, locale);
}
