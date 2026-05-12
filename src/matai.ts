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
  private open = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private outsideHandler: (e: MouseEvent) => void;

  constructor(el: HTMLElement | string, options: MataiOptions = {}) {
    const target = resolveElement(el);

    const rawLang = options.lang ?? "en";
    this.langs = Array.isArray(rawLang) ? rawLang : [rawLang];
    this.activeLang = this.langs[0];
    this.mode = options.mode ?? "single";
    this.format = options.format ?? "YYYY-MM-DD";
    this.onChange = options.onChange ?? null;

    this.wrapper = document.createElement("div");
    this.wrapper.className = "matai-wrapper";

    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.className = "matai-input";
    this.input.placeholder = options.placeholder ??
      (this.mode === "range" ? this.activeLocale().placeholderRange : this.activeLocale().placeholder);
    if (this.activeLocale().rtl) this.input.setAttribute("dir", "rtl");

    this.popup = document.createElement("div");
    this.popup.className = "matai-popup" + (this.mode === "range" ? " matai-popup-range" : "");
    this.popup.style.display = "none";

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
    } else {
      this.popup.appendChild(this.calStart.getElement());
      this.wireHover(this.calStart);
    }

    this.wrapper.appendChild(this.input);
    this.wrapper.appendChild(this.popup);
    target.replaceWith(this.wrapper);

    this.input.addEventListener("focus", () => this.showPopup());
    this.input.addEventListener("input", () => this.handleInput());

    this.outsideHandler = (e: MouseEvent) => {
      if (!this.wrapper.contains(e.target as Node)) this.hidePopup();
    };
    document.addEventListener("mousedown", this.outsideHandler);
  }

  private activeLocale(): Locale {
    return LOCALES[this.activeLang];
  }

  private wireHover(cal: Calendar): void {
    cal.getElement().addEventListener("matai-hover", (e: Event) => {
      const d = (e as CustomEvent<Date>).detail;
      if (this.mode === "range" && this.rangeStep === 1) {
        this.calStart.setHoverEnd(d);
        this.calEnd?.setHoverEnd(d);
      }
    });
    cal.getElement().addEventListener("mouseleave", () => {
      this.calStart.setHoverEnd(null);
      this.calEnd?.setHoverEnd(null);
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
    if (locale.rtl) this.input.setAttribute("dir", "rtl");
    else this.input.removeAttribute("dir");
    this.popup.querySelectorAll<HTMLElement>(".matai-lang-btn").forEach(btn => {
      btn.classList.toggle("matai-lang-active", btn.dataset.lang === lang);
    });
  }

  private handleInput(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const parsed = parse(this.input.value, this.activeLocale(), this.mode);
      if (parsed) {
        this.value = parsed;
        this.rangeStep = 0;
        this.rangeStart = null;
        this.setCalendarsSelected(parsed);
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
  }

  private hidePopup(): void {
    if (!this.open) return;
    this.open = false;
    this.popup.style.display = "none";
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
    this.rangeStep = 0;
    this.rangeStart = null;
  }

  destroy(): void {
    document.removeEventListener("mousedown", this.outsideHandler);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.wrapper.remove();
  }
}
