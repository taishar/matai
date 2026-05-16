import type { Lang, Mode, DateValue, MataiOptions, Locale } from "./types";
import { en } from "./i18n/en";
import { he } from "./i18n/he";
import { parse, parseWithAutoDetect } from "./parser";
import { Calendar } from "./calendar";
import { TimeColumn, formatMinutes } from "./time-column";

const LOCALES: Record<Lang, Locale> = { en, he };

function formatDate(d: Date, fmt: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return fmt
    .replace("YYYY", String(d.getFullYear()))
    .replace("MM", pad(d.getMonth() + 1))
    .replace("DD", pad(d.getDate()))
    .replace("HH", pad(d.getHours()))
    .replace("mm", pad(d.getMinutes()));
}

function resolveElement(el: HTMLElement | string): HTMLElement {
  if (typeof el === "string") {
    const found = document.querySelector<HTMLElement>(el);
    if (!found) throw new Error(`Matai: element not found: ${el}`);
    return found;
  }
  return el;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000);
}

function formatRangeDays(days: number, locale: Locale): string {
  const u = locale.tokens.units;
  const label = (n: number, pair: string[]) => `${n} ${pair[n === 1 ? 0 : 1]}`;
  if (days < 14) return label(days, u.day);
  if (days < 90) {
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    return rem === 0 ? label(weeks, u.week) : `${label(weeks, u.week)}, ${label(rem, u.day)}`;
  }
  const months = Math.floor(days / 30);
  const rem = days % 30;
  return rem === 0 ? label(months, u.month) : `${label(months, u.month)}, ${label(rem, u.day)}`;
}

function nextMonth(year: number, month: number): [number, number] {
  return month === 11 ? [year + 1, 0] : [year, month + 1];
}

function prevMonth(year: number, month: number): [number, number] {
  return month === 0 ? [year - 1, 11] : [year, month - 1];
}

function monthIndex(year: number, month: number): number {
  return year * 12 + month;
}

export class Matai {
  private langs: Lang[];
  private activeLang: Lang;
  private autoDetectLocales: Locale[];
  private mode: Mode;
  private format: string;
  private onChange: ((v: DateValue, close: () => void) => void) | null;

  private value: DateValue = null;
  private rangeStart: Date | null = null;
  private rangeStep: 0 | 1 = 0;
  private timeColumn: TimeColumn | null = null;
  private pendingDate: Date | null = null;
  private timeStart: number | null = null;
  private timeEnd: number | null = null;

  private wrapper: HTMLElement;
  private input: HTMLInputElement;
  private popup: HTMLElement;
  private calStart: Calendar;
  private calEnd: Calendar | null = null;
  private badgeEl: HTMLElement | null = null;
  private open = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private searchInput!: HTMLInputElement;
  private outsideHandler: (e: MouseEvent) => void;

  private hintEl: HTMLElement | null = null;
  private hintTextEl: HTMLElement | null = null;
  private hintExamples: string[] = [];
  private hintIndex = 0;
  private hintTimer: ReturnType<typeof setInterval> | null = null;
  private clearBtn: HTMLButtonElement | null = null;

  constructor(el: HTMLElement | string, options: MataiOptions = {}) {
    const target = resolveElement(el);

    if (options.lang === undefined || Array.isArray(options.lang)) {
      const ordered: Lang[] = Array.isArray(options.lang)
        ? options.lang
        : (Object.keys(LOCALES) as Lang[]);
      this.langs = [ordered[0]];
      this.activeLang = ordered[0];
      this.autoDetectLocales = ordered.map(l => LOCALES[l]);
    } else {
      this.langs = [options.lang];
      this.activeLang = options.lang;
      this.autoDetectLocales = [];
    }
    this.mode = options.mode ?? "date";
    this.format = options.format ?? "DD/MM/YYYY";
    this.onChange = options.onChange ?? null;

    this.wrapper = document.createElement("div");
    this.wrapper.className = "matai-wrapper";
    if (options.color) this.wrapper.style.setProperty("--matai-color", options.color);

    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.className = "matai-input";
    this.input.readOnly = true;
    this.input.placeholder =
      this.mode === "range"    ? `${this.format.toLowerCase()} – ${this.format.toLowerCase()}` :
      this.mode === "datetime" ? this.activeLocale().placeholderDatetime :
      this.mode === "event"    ? this.activeLocale().placeholderEvent :
      this.format.toLowerCase();
    if (this.activeLocale().rtl) {
      this.wrapper.setAttribute("dir", "rtl");
      this.input.setAttribute("dir", "rtl");
    }

    this.popup = document.createElement("div");
    this.popup.className = "matai-popup" +
      (this.mode === "range" ? " matai-popup-range" :
       (this.mode === "datetime" || this.mode === "event") ? " matai-popup-datetime" : "");
    this.popup.style.display = "none";

    this.searchInput = document.createElement("input");
    this.searchInput.type = "text";
    this.searchInput.className = "matai-search";
    if (options.placeholder) this.searchInput.placeholder = options.placeholder;
    if (this.activeLocale().rtl) this.searchInput.setAttribute("dir", "rtl");

    const locale = this.activeLocale();
    this.hintExamples =
      this.mode === "range"    ? locale.examplesRange :
      this.mode === "datetime" ? locale.examplesDatetime :
      this.mode === "event"    ? locale.examplesEvent :
      locale.examples;

    const searchWrapper = document.createElement("div");
    searchWrapper.className = "matai-search-wrapper";
    searchWrapper.appendChild(this.searchInput);

    this.hintEl = document.createElement("div");
    this.hintEl.className = "matai-hint";
    if (locale.rtl) this.hintEl.setAttribute("dir", "rtl");

    this.hintTextEl = document.createElement("span");
    this.hintTextEl.textContent = this.hintExamples[0];
    this.hintEl.appendChild(this.hintTextEl);

    const tabBadge = document.createElement("kbd");
    tabBadge.className = "matai-hint-tab";
    tabBadge.textContent = "Tab";
    this.hintEl.appendChild(tabBadge);

    searchWrapper.appendChild(this.hintEl);

    this.clearBtn = document.createElement("button");
    this.clearBtn.type = "button";
    this.clearBtn.className = "matai-clear-btn";
    this.clearBtn.setAttribute("aria-label", "Clear");
    this.clearBtn.style.display = "none";
    searchWrapper.appendChild(this.clearBtn);

    this.clearBtn.addEventListener("click", () => {
      this.clear();
      this.onChange?.(null, () => this.close());
      this.searchInput.value = "";
      if (this.hintEl && this.hintTextEl) {
        this.hintEl.style.opacity = "1";
        this.hintTextEl.textContent = this.hintExamples[0];
      }
      this.startHintCycle();
      this.updateClearBtn();
    });

    this.popup.appendChild(searchWrapper);

    const now = new Date();
    this.calStart = new Calendar(this.activeLocale(), this.mode, now.getFullYear(), now.getMonth());
    this.calStart.onSelect(d => this.handleSelect(d));

    if (this.mode === "range") {
      const [ny, nm] = nextMonth(now.getFullYear(), now.getMonth());
      this.calEnd = new Calendar(this.activeLocale(), this.mode, ny, nm);
      this.calEnd.onSelect(d => this.handleSelect(d));

      this.wireRangeNavigation();
      this.wireHover(this.calStart);
      this.wireHover(this.calEnd);

      const calWrapper = document.createElement("div");
      calWrapper.className = "matai-cals";
      calWrapper.appendChild(this.calStart.getElement());
      calWrapper.appendChild(this.calEnd.getElement());
      this.popup.appendChild(calWrapper);

      this.badgeEl = document.createElement("div");
      this.badgeEl.className = "matai-range-badge";
      this.badgeEl.style.display = "none";
      this.badgeEl.appendChild(document.createElement("span"));
      this.popup.appendChild(this.badgeEl);
    } else if (this.mode === "datetime" || this.mode === "event") {
      const tcMode = this.mode === "datetime" ? "single" : "range";
      this.timeColumn = new TimeColumn(tcMode);
      this.timeColumn.onSelect = (start, end) => this.handleTimeSelect(start, end);

      const calTimeWrapper = document.createElement("div");
      calTimeWrapper.className = "matai-cal-time-wrapper";
      calTimeWrapper.appendChild(this.calStart.getElement());
      calTimeWrapper.appendChild(this.timeColumn.getElement());
      this.popup.appendChild(calTimeWrapper);
    } else {
      this.popup.appendChild(this.calStart.getElement());
      this.wireHover(this.calStart);
    }

    this.wrapper.appendChild(this.input);
    this.wrapper.appendChild(this.popup);
    target.replaceWith(this.wrapper);

    this.input.addEventListener("click", () => {
      if (this.open) this.hidePopup();
      else this.showPopup();
    });
    this.searchInput.addEventListener("input", () => {
      if (this.hintEl) {
        if (this.searchInput.value) {
          this.hintEl.style.opacity = "0";
          this.stopHintCycle();
        } else {
          this.hintEl.style.opacity = "1";
          this.startHintCycle();
        }
      }
      this.handleInput();
    });
    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { this.hidePopup(); return; }
      if (e.key === "Tab" && !this.searchInput.value && this.hintEl) {
        e.preventDefault();
        this.searchInput.value = this.hintExamples[this.hintIndex];
        this.hintEl.style.opacity = "0";
        this.searchInput.dispatchEvent(new Event("input"));
      }
    });

    this.outsideHandler = (e: MouseEvent) => {
      if (!this.wrapper.contains(e.target as Node)) this.hidePopup();
    };
    document.addEventListener("mousedown", this.outsideHandler);
  }

  private activeLocale(): Locale {
    return LOCALES[this.activeLang];
  }

  private updateBadge(start: Date | null, end: Date | null): void {
    if (!this.badgeEl) return;
    if (!start || !end) { this.badgeEl.style.display = "none"; return; }
    const days = daysBetween(start, end);
    this.badgeEl.querySelector("span")!.textContent = formatRangeDays(days, this.activeLocale());
    this.badgeEl.style.display = "block";
  }

  private wireHover(cal: Calendar): void {
    cal.getElement().addEventListener("matai-hover", (e: Event) => {
      const d = (e as CustomEvent<Date>).detail;
      if (this.mode === "range" && this.rangeStep === 1) {
        this.calStart.setHoverEnd(d);
        this.calEnd?.setHoverEnd(d);
        this.updateBadge(this.rangeStart, d);
      }
    });
    cal.getElement().addEventListener("mouseleave", () => {
      this.calStart.setHoverEnd(null);
      this.calEnd?.setHoverEnd(null);
      const confirmed = Array.isArray(this.value) ? this.value : null;
      this.updateBadge(confirmed?.[0] ?? null, confirmed?.[1] ?? null);
    });
  }

  private wireRangeNavigation(): void {
    if (!this.calEnd) return;

    // Left navigates → if it would catch up to right, push right forward
    this.calStart.onNavigate((y, m) => {
      if (!this.calEnd) return;
      if (monthIndex(y, m) >= monthIndex(this.calEnd.getYear(), this.calEnd.getMonth())) {
        const [ny, nm] = nextMonth(y, m);
        this.calEnd.setYearMonth(ny, nm);
      }
    });

    // Right navigates → if it would go behind left, push left back
    this.calEnd.onNavigate((y, m) => {
      if (monthIndex(y, m) <= monthIndex(this.calStart.getYear(), this.calStart.getMonth())) {
        const [py, pm] = prevMonth(y, m);
        this.calStart.setYearMonth(py, pm);
      }
    });
  }

  private handleInput(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const parsed = this.autoDetectLocales.length
        ? parseWithAutoDetect(this.searchInput.value, this.autoDetectLocales, this.mode)
        : parse(this.searchInput.value, this.activeLocale(), this.mode);
      if (parsed) {
        this.value = parsed;
        this.rangeStep = 0;
        this.rangeStart = null;
        if (Array.isArray(parsed)) {
          if (this.mode === "event") {
            const [s, e] = parsed;
            this.pendingDate = new Date(s.getFullYear(), s.getMonth(), s.getDate());
            this.timeStart = s.getHours() * 60 + s.getMinutes();
            this.timeEnd = e.getHours() * 60 + e.getMinutes();
            this.setCalendarsSelected(this.pendingDate);
            this.timeColumn?.setSelected(this.timeStart, this.timeEnd);
            this.input.value = `${formatDate(this.pendingDate, this.format)} ${formatMinutes(this.timeStart)} – ${formatMinutes(this.timeEnd)}`;
          } else {
            this.setCalendarsSelected(parsed);
            this.updateBadge(parsed[0], parsed[1]);
            this.input.value = `${formatDate(parsed[0], this.format)} - ${formatDate(parsed[1], this.format)}`;
          }
        } else {
          if (this.mode === "datetime") {
            this.pendingDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
            this.timeStart = parsed.getHours() * 60 + parsed.getMinutes();
            this.setCalendarsSelected(parsed);
            this.timeColumn?.setSelected(this.timeStart);
            this.input.value = `${formatDate(parsed, this.format)} ${formatMinutes(this.timeStart)}`;
          } else {
            this.setCalendarsSelected(parsed);
            this.input.value = formatDate(parsed, this.format);
          }
        }
        this.onChange?.(this.value, () => this.close());
        this.updateClearBtn();
      }
    }, 300);
  }

  private close(): void {
    this.hidePopup();
  }

  private setSearchValue(text: string): void {
    if (this.debounceTimer) { clearTimeout(this.debounceTimer); this.debounceTimer = null; }
    this.searchInput.value = text;
    this.stopHintCycle();
    if (this.hintEl) this.hintEl.style.opacity = "0";
  }

  private handleSelect(d: Date): void {
    if (this.mode === "date") {
      this.value = d;
      this.input.value = formatDate(d, this.format);
      this.setSearchValue(formatDate(d, this.format));
      this.setCalendarsSelected(d);
      this.onChange?.(this.value, () => this.close());
      this.updateClearBtn();
    } else if (this.mode === "datetime") {
      this.pendingDate = d;
      this.calStart.setSelectedNoJump(d);
      this.setSearchValue(formatDate(d, this.format));
      if (this.timeStart !== null) this.commitDatetime();
    } else if (this.mode === "event") {
      this.pendingDate = d;
      this.calStart.setSelectedNoJump(d);
      this.setSearchValue(formatDate(d, this.format));
      this.timeColumn?.reset();
      this.timeStart = null;
      this.timeEnd = null;
    } else {
      if (this.rangeStep === 0) {
        this.rangeStart = d;
        this.rangeStep = 1;
        this.setCalendarsSelectedNoJump([d, undefined as unknown as Date]);
        this.setSearchValue(formatDate(d, this.format));
      } else {
        const start = this.rangeStart!;
        const [lo, hi] = d >= start ? [start, d] : [d, start];
        this.value = [lo, hi];
        this.input.value = `${formatDate(lo, this.format)} - ${formatDate(hi, this.format)}`;
        this.setSearchValue(`${formatDate(lo, this.format)} - ${formatDate(hi, this.format)}`);
        this.setCalendarsSelectedNoJump([lo, hi]);
        this.calStart.setHoverEnd(null);
        this.calEnd?.setHoverEnd(null);
        this.updateBadge(lo, hi);
        this.rangeStep = 0;
        this.rangeStart = null;
        this.onChange?.(this.value, () => this.close());
        this.updateClearBtn();
      }
    }
  }

  private handleTimeSelect(start: number, end?: number): void {
    this.timeStart = start;
    this.timeEnd = end ?? null;
    if (this.mode === "datetime" && this.pendingDate !== null) this.commitDatetime();
    else if (this.mode === "event" && this.pendingDate !== null && this.timeEnd !== null) this.commitEvent();
  }

  private commitDatetime(): void {
    const d = new Date(this.pendingDate!);
    d.setHours(Math.floor(this.timeStart! / 60), this.timeStart! % 60, 0, 0);
    this.value = d;
    const text = `${formatDate(d, this.format)} ${formatMinutes(this.timeStart!)}`;
    this.input.value = text;
    this.setSearchValue(text);
    this.setCalendarsSelected(d);
    this.onChange?.(this.value, () => this.close());
    this.updateClearBtn();
  }

  private commitEvent(): void {
    const date = this.pendingDate!;
    const [lo, hi] = this.timeStart! <= this.timeEnd!
      ? [this.timeStart!, this.timeEnd!]
      : [this.timeEnd!, this.timeStart!];
    const startDate = new Date(date); startDate.setHours(Math.floor(lo / 60), lo % 60, 0, 0);
    const endDate = new Date(date);   endDate.setHours(Math.floor(hi / 60), hi % 60, 0, 0);
    this.value = [startDate, endDate];
    const text = `${formatDate(date, this.format)} ${formatMinutes(lo)} – ${formatMinutes(hi)}`;
    this.input.value = text;
    this.setSearchValue(text);
    this.calStart.setSelectedNoJump(date);
    this.onChange?.(this.value, () => this.close());
    this.updateClearBtn();
  }

  private setCalendarsSelected(value: DateValue): void {
    this.calStart.setSelected(value);
    if (this.calEnd && Array.isArray(value) && value[1]) {
      // Right calendar jumps to end date's month
      this.calEnd.setYearMonth(value[1].getFullYear(), value[1].getMonth());
      this.calEnd.setSelectedNoJump(value);
      // Ensure left < right
      if (monthIndex(this.calStart.getYear(), this.calStart.getMonth()) >=
          monthIndex(this.calEnd.getYear(), this.calEnd.getMonth())) {
        const [py, pm] = prevMonth(this.calEnd.getYear(), this.calEnd.getMonth());
        this.calStart.setYearMonth(py, pm);
        this.calStart.setSelectedNoJump(value);
      }
    } else {
      this.calEnd?.setSelectedNoJump(value);
    }
  }

  private setCalendarsSelectedNoJump(value: DateValue): void {
    this.calStart.setSelectedNoJump(value);
    this.calEnd?.setSelectedNoJump(value);
  }

  private updateClearBtn(): void {
    if (!this.clearBtn) return;
    this.clearBtn.style.display = this.value !== null ? "flex" : "none";
  }

  private showPopup(): void {
    if (this.open) return;
    this.open = true;
    this.popup.style.display = "block";
    this.clampPopup();
    if (this.timeColumn && this.timeStart === null) this.timeColumn.scrollToNow();
    this.updateClearBtn();
    this.searchInput.focus({ preventScroll: true });
    if (this.hintEl && !this.searchInput.value) {
      this.hintEl.style.opacity = "1";
      this.startHintCycle();
    }
  }

  private clampPopup(): void {
    this.popup.style.top = "";
    this.popup.style.bottom = "";
    this.popup.style.left = "";
    this.popup.style.right = "";

    const rect = this.popup.getBoundingClientRect();
    const wrapperRect = this.wrapper.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (rect.bottom > vh - margin) {
      this.popup.style.top = "auto";
      this.popup.style.bottom = "calc(100% + 6px)";
    }

    let desiredLeft = rect.left;
    if (rect.right > vw - margin) desiredLeft = vw - margin - (rect.right - rect.left);
    if (desiredLeft < margin) desiredLeft = margin;
    const newLeft = desiredLeft - wrapperRect.left;
    const currentLeft = rect.left - wrapperRect.left;
    if (Math.round(newLeft) !== Math.round(currentLeft)) {
      this.popup.style.left = newLeft + "px";
      this.popup.style.right = "auto";
    }
  }

  private hidePopup(): void {
    if (!this.open) return;
    this.open = false;
    this.popup.style.display = "none";
    this.searchInput.value = "";
    this.stopHintCycle();
    this.hintIndex = 0;
    if (this.hintEl && this.hintTextEl) {
      this.hintTextEl.textContent = this.hintExamples[0];
      this.hintEl.style.opacity = "1";
    }
  }

  private startHintCycle(): void {
    if (this.hintTimer) return;
    this.hintTimer = setInterval(() => this.cycleHint(), 2500);
  }

  private stopHintCycle(): void {
    if (this.hintTimer) { clearInterval(this.hintTimer); this.hintTimer = null; }
  }

  private cycleHint(): void {
    if (!this.hintEl) return;
    this.hintEl.classList.add("matai-hint-fade");
    setTimeout(() => {
      this.hintIndex = (this.hintIndex + 1) % this.hintExamples.length;
      this.hintTextEl!.textContent = this.hintExamples[this.hintIndex];
      this.hintEl!.classList.remove("matai-hint-fade");
    }, 350);
  }

  getValue(): DateValue {
    return this.value;
  }

  setValue(date: Date | [Date, Date]): void {
    this.value = date;
    this.rangeStep = 0;
    this.rangeStart = null;
    if (date instanceof Date) {
      if (this.mode === "datetime") {
        this.pendingDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        this.timeStart = date.getHours() * 60 + date.getMinutes();
        this.input.value = `${formatDate(date, this.format)} ${formatMinutes(this.timeStart)}`;
        this.timeColumn?.setSelected(this.timeStart);
      } else {
        this.input.value = formatDate(date, this.format);
      }
      this.setCalendarsSelected(date);
    } else {
      const [s, e] = date;
      if (this.mode === "event") {
        this.pendingDate = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        this.timeStart = s.getHours() * 60 + s.getMinutes();
        this.timeEnd = e.getHours() * 60 + e.getMinutes();
        this.input.value = `${formatDate(this.pendingDate, this.format)} ${formatMinutes(this.timeStart)} – ${formatMinutes(this.timeEnd)}`;
        this.timeColumn?.setSelected(this.timeStart, this.timeEnd);
        this.setCalendarsSelected(this.pendingDate);
      } else {
        this.input.value = `${formatDate(s, this.format)} - ${formatDate(e, this.format)}`;
        this.setCalendarsSelected(date);
      }
    }
  }

  clear(): void {
    this.value = null;
    this.input.value = "";
    this.setCalendarsSelected(null);
    this.updateBadge(null, null);
    this.rangeStep = 0;
    this.rangeStart = null;
    this.pendingDate = null;
    this.timeStart = null;
    this.timeEnd = null;
    this.timeColumn?.reset();
  }

  destroy(): void {
    this.stopHintCycle();
    document.removeEventListener("mousedown", this.outsideHandler);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.wrapper.remove();
  }
}
