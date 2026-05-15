import type { Lang, Mode, DateValue, MataiOptions, Locale } from "./types";
import { en } from "./i18n/en";
import { he } from "./i18n/he";
import { parse } from "./parser";
import { Calendar } from "./calendar";

const LOCALES: Record<Lang, Locale> = { en, he };

function formatDate(d: Date, fmt: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return fmt
    .replace("YYYY", String(d.getFullYear()))
    .replace("MM", pad(d.getMonth() + 1))
    .replace("DD", pad(d.getDate()));
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
  private mode: Mode;
  private format: string;
  private onChange: ((v: DateValue) => void) | null;

  private value: DateValue = null;
  private rangeStart: Date | null = null;
  private rangeStep: 0 | 1 = 0;

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

  constructor(el: HTMLElement | string, options: MataiOptions = {}) {
    const target = resolveElement(el);

    const rawLang = options.lang ?? "en";
    this.langs = Array.isArray(rawLang) ? rawLang : [rawLang];
    this.activeLang = this.langs[0];
    this.mode = options.mode ?? "single";
    this.format = options.format ?? "DD/MM/YYYY";
    this.onChange = options.onChange ?? null;

    this.wrapper = document.createElement("div");
    this.wrapper.className = "matai-wrapper";
    if (options.color) this.wrapper.style.setProperty("--matai-color", options.color);

    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.className = "matai-input";
    this.input.readOnly = true;
    this.input.placeholder = this.mode === "range"
      ? `${this.format.toLowerCase()} – ${this.format.toLowerCase()}`
      : this.format.toLowerCase();
    if (this.activeLocale().rtl) {
      this.wrapper.setAttribute("dir", "rtl");
      this.input.setAttribute("dir", "rtl");
    }

    this.popup = document.createElement("div");
    this.popup.className = "matai-popup" + (this.mode === "range" ? " matai-popup-range" : "");
    this.popup.style.display = "none";

    this.searchInput = document.createElement("input");
    this.searchInput.type = "text";
    this.searchInput.className = "matai-search";
    this.searchInput.placeholder = options.placeholder ??
      (this.mode === "range" ? this.activeLocale().placeholderRange : this.activeLocale().placeholder);
    if (this.activeLocale().rtl) this.searchInput.setAttribute("dir", "rtl");
    this.popup.appendChild(this.searchInput);

    if (this.langs.length > 1) this.popup.appendChild(this.buildLangToggle());

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
    this.searchInput.addEventListener("input", () => this.handleInput());

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

  private buildLangToggle(): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "matai-lang-toggle";
    this.langs.forEach(lang => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "matai-lang-btn" + (lang === this.activeLang ? " matai-lang-active" : "");
      btn.textContent = lang.toUpperCase();
      btn.dataset.lang = lang;
      btn.addEventListener("click", () => this.switchLang(lang));
      bar.appendChild(btn);
    });
    return bar;
  }

  private switchLang(lang: Lang): void {
    this.activeLang = lang;
    const locale = this.activeLocale();
    this.calStart.setLocale(locale);
    this.calEnd?.setLocale(locale);
    if (locale.rtl) {
      this.wrapper.setAttribute("dir", "rtl");
      this.input.setAttribute("dir", "rtl");
      this.searchInput.setAttribute("dir", "rtl");
    } else {
      this.wrapper.removeAttribute("dir");
      this.input.removeAttribute("dir");
      this.searchInput.removeAttribute("dir");
    }
    this.popup.querySelectorAll<HTMLElement>(".matai-lang-btn").forEach(btn => {
      btn.classList.toggle("matai-lang-active", btn.dataset.lang === lang);
    });
    const confirmed = Array.isArray(this.value) ? this.value : null;
    this.updateBadge(confirmed?.[0] ?? null, confirmed?.[1] ?? null);
  }

  private handleInput(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const parsed = parse(this.searchInput.value, this.activeLocale(), this.mode);
      if (parsed) {
        this.value = parsed;
        this.rangeStep = 0;
        this.rangeStart = null;
        this.setCalendarsSelected(parsed);
        if (Array.isArray(parsed)) {
          this.updateBadge(parsed[0], parsed[1]);
          this.input.value = `${formatDate(parsed[0], this.format)} - ${formatDate(parsed[1], this.format)}`;
        } else {
          this.input.value = formatDate(parsed, this.format);
        }
        this.onChange?.(this.value);
      }
    }, 300);
  }

  private handleSelect(d: Date): void {
    if (this.mode === "single") {
      this.value = d;
      this.input.value = formatDate(d, this.format);
      this.setCalendarsSelected(d);
      this.onChange?.(this.value);
      this.hidePopup();
    } else {
      if (this.rangeStep === 0) {
        this.rangeStart = d;
        this.rangeStep = 1;
        // Show just the start, no end yet
        this.setCalendarsSelectedNoJump([d, undefined as unknown as Date]);
      } else {
        const start = this.rangeStart!;
        const [lo, hi] = d >= start ? [start, d] : [d, start];
        this.value = [lo, hi];
        this.input.value = `${formatDate(lo, this.format)} - ${formatDate(hi, this.format)}`;
        this.setCalendarsSelectedNoJump([lo, hi]);
        this.calStart.setHoverEnd(null);
        this.calEnd?.setHoverEnd(null);
        this.updateBadge(lo, hi);
        this.rangeStep = 0;
        this.rangeStart = null;
        this.onChange?.(this.value);
        this.hidePopup();
      }
    }
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

  private showPopup(): void {
    if (this.open) return;
    this.open = true;
    this.popup.style.display = "block";
    this.clampPopup();
    this.searchInput.focus({ preventScroll: true });
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
  }

  getValue(): DateValue {
    return this.value;
  }

  setValue(date: Date | [Date, Date]): void {
    this.value = date;
    if (date instanceof Date) {
      this.input.value = formatDate(date, this.format);
    } else {
      this.input.value = `${formatDate(date[0], this.format)} - ${formatDate(date[1], this.format)}`;
    }
    this.setCalendarsSelected(date);
    this.rangeStep = 0;
    this.rangeStart = null;
  }

  clear(): void {
    this.value = null;
    this.input.value = "";
    this.setCalendarsSelected(null);
    this.updateBadge(null, null);
    this.rangeStep = 0;
    this.rangeStart = null;
  }

  destroy(): void {
    document.removeEventListener("mousedown", this.outsideHandler);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.wrapper.remove();
  }
}
