import type { Locale, Mode, DateValue } from "./types";

function toLocalISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBetween(d: Date, start: Date, end: Date): boolean {
  return d > start && d < end;
}

export class Calendar {
  private locale: Locale;
  private mode: Mode;
  year: number;
  month: number;
  private selected: DateValue = null;
  private hoverEnd: Date | null = null;
  private el: HTMLElement;
  private gridEl: HTMLElement | null = null;
  private selectCallback: ((d: Date) => void) | null = null;
  private navigateCallback: ((year: number, month: number) => void) | null = null;

  constructor(locale: Locale, mode: Mode, year?: number, month?: number) {
    this.locale = locale;
    this.mode = mode;
    const now = new Date();
    this.year = year ?? now.getFullYear();
    this.month = month ?? now.getMonth();
    this.el = document.createElement("div");
    this.el.className = "matai-cal";
    if (locale.rtl) this.el.setAttribute("dir", "rtl");
    this.render();
  }

  getElement(): HTMLElement {
    return this.el;
  }

  getYear(): number { return this.year; }
  getMonth(): number { return this.month; }

  setLocale(locale: Locale): void {
    this.locale = locale;
    if (locale.rtl) this.el.setAttribute("dir", "rtl");
    else this.el.removeAttribute("dir");
    this.render();
  }

  setYearMonth(year: number, month: number): void {
    this.year = year;
    this.month = month;
    this.render();
  }

  setSelected(value: DateValue): void {
    this.selected = value;
    if (value instanceof Date) {
      this.year = value.getFullYear();
      this.month = value.getMonth();
    } else if (Array.isArray(value) && value[0]) {
      this.year = value[0].getFullYear();
      this.month = value[0].getMonth();
    }
    this.render();
  }

  setSelectedNoJump(value: DateValue): void {
    this.selected = value;
    this.updateGridClasses();
  }

  setHoverEnd(d: Date | null): void {
    this.hoverEnd = d;
    this.updateGridClasses();
  }

  navigate(delta: number): void {
    this.month += delta;
    if (this.month > 11) { this.month = 0; this.year++; }
    if (this.month < 0) { this.month = 11; this.year--; }
    this.render();
    this.navigateCallback?.(this.year, this.month);
  }

  onSelect(fn: (d: Date) => void): void {
    this.selectCallback = fn;
  }

  onNavigate(fn: (year: number, month: number) => void): void {
    this.navigateCallback = fn;
  }

  private render(): void {
    this.el.innerHTML = "";
    this.el.appendChild(this.buildHeader());
    this.el.appendChild(this.buildWeekdays());
    this.gridEl = this.buildGrid();
    this.el.appendChild(this.gridEl);
  }

  private buildHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "matai-header";

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "matai-nav matai-prev";
    prev.setAttribute("tabindex", "-1");
    prev.setAttribute("aria-label", this.locale.prevMonth);
    prev.innerHTML = `<svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    prev.addEventListener("click", () => this.navigate(-1));

    const title = document.createElement("span");
    title.className = "matai-title";
    title.setAttribute("aria-live", "polite");
    title.textContent = `${this.locale.months[this.month]} ${this.year}`;

    const next = document.createElement("button");
    next.type = "button";
    next.className = "matai-nav matai-next";
    next.setAttribute("tabindex", "-1");
    next.setAttribute("aria-label", this.locale.nextMonth);
    next.innerHTML = `<svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    next.addEventListener("click", () => this.navigate(1));

    header.appendChild(prev);
    header.appendChild(title);
    header.appendChild(next);
    return header;
  }

  private buildWeekdays(): HTMLElement {
    const row = document.createElement("div");
    row.className = "matai-weekdays";
    const start = this.locale.weekStart;
    for (let i = 0; i < 7; i++) {
      const cell = document.createElement("div");
      cell.className = "matai-wday";
      const abbr = document.createElement("abbr");
      abbr.title = this.locale.days[(start + i) % 7];
      abbr.textContent = this.locale.daysShort[(start + i) % 7];
      cell.appendChild(abbr);
      row.appendChild(cell);
    }
    return row;
  }

  private buildGrid(): HTMLElement {
    const grid = document.createElement("div");
    grid.className = "matai-grid";

    const firstDay = new Date(this.year, this.month, 1);
    const lastDay = new Date(this.year, this.month + 1, 0);

    const start = this.locale.weekStart;
    const offset = ((firstDay.getDay() - start + 7) % 7);

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const prevMonthLast = new Date(this.year, this.month, 0);
    for (let i = offset - 1; i >= 0; i--) {
      const d = new Date(this.year, this.month - 1, prevMonthLast.getDate() - i);
      grid.appendChild(this.buildCell(d, true, todayDate));
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(this.year, this.month, day);
      grid.appendChild(this.buildCell(d, false, todayDate));
    }

    const total = offset + lastDay.getDate();
    const remainder = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= remainder; i++) {
      const d = new Date(this.year, this.month + 1, i);
      grid.appendChild(this.buildCell(d, true, todayDate));
    }

    if (this.mode === "range") {
      grid.classList.add("matai-grid--range");
      let dragStartDate: Date | null = null;
      let dragOrigin = { x: 0, y: 0 };
      let dragging = false;

      const cellAt = (x: number, y: number): HTMLElement | null => {
        const el = document.elementFromPoint(x, y);
        return el?.closest<HTMLElement>(".matai-day") ?? null;
      };

      grid.addEventListener("pointerdown", (e) => {
        const cell = cellAt(e.clientX, e.clientY);
        if (!cell?.dataset.date) return;
        e.preventDefault();
        grid.setPointerCapture(e.pointerId);
        dragStartDate = new Date(cell.dataset.date + "T00:00:00");
        dragOrigin = { x: e.clientX, y: e.clientY };
        dragging = false;
      });

      grid.addEventListener("pointermove", (e) => {
        if (!dragStartDate) return;
        if (!dragging && Math.hypot(e.clientX - dragOrigin.x, e.clientY - dragOrigin.y) > 8) {
          dragging = true;
          this.selectCallback?.(dragStartDate);
        }
        if (!dragging) return;
        const cell = cellAt(e.clientX, e.clientY);
        if (cell?.dataset.date) {
          this.el.dispatchEvent(new CustomEvent("matai-hover", { detail: new Date(cell.dataset.date + "T00:00:00"), bubbles: true }));
        }
      });

      grid.addEventListener("pointerup", (e) => {
        if (!dragStartDate) return;
        if (dragging) {
          const cell = cellAt(e.clientX, e.clientY);
          if (cell?.dataset.date) {
            grid.dataset.suppressClick = "1";
            this.selectCallback?.(new Date(cell.dataset.date + "T00:00:00"));
            setTimeout(() => { delete grid.dataset.suppressClick; }, 0);
          }
<<<<<<< HEAD
        } else {
          // e.preventDefault() in pointerdown suppressed the click event, handle it here
          this.selectCallback?.(dragStartDate);
=======
>>>>>>> a9304cdafd2b47a2dd56b7aeb16a7d30686493f2
        }
        dragStartDate = null;
        dragging = false;
      });

      grid.addEventListener("pointercancel", () => { dragStartDate = null; dragging = false; });
    }

    return grid;
  }

  private buildCell(d: Date, otherMonth: boolean, todayDate: Date): HTMLElement {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "matai-day";
    cell.setAttribute("tabindex", "-1");
    cell.setAttribute("aria-label", `${this.locale.days[d.getDay()]}, ${this.locale.months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
    cell.setAttribute("aria-pressed", "false");
    const label = document.createElement("span");
    label.textContent = String(d.getDate());
    cell.appendChild(label);
    cell.dataset.date = toLocalISO(d);
    if (otherMonth) cell.dataset.otherMonth = "1";

    this.applyClasses(cell, d, todayDate);

    cell.addEventListener("click", () => {
      if (this.gridEl?.dataset.suppressClick === "1") return;
      this.selectCallback?.(d);
    });
    cell.addEventListener("mouseenter", () => {
      if (this.mode === "range") this.selectCallback && this.el.dispatchEvent(new CustomEvent("matai-hover", { detail: d, bubbles: true }));
    });

    return cell;
  }

  private applyClasses(cell: HTMLElement, d: Date, todayDate: Date): void {

    if (sameDay(d, todayDate)) cell.dataset.today = "1"; else delete cell.dataset.today;
    delete cell.dataset.selected;
    delete cell.dataset.rangeStart;
    delete cell.dataset.rangeEnd;
    delete cell.dataset.inRange;

    if (this.selected instanceof Date) {
      if (sameDay(d, this.selected)) cell.dataset.selected = "1";
    } else if (Array.isArray(this.selected)) {
      const [start, end] = this.selected;
      if (start && sameDay(d, start)) cell.dataset.rangeStart = "1";
      if (end && sameDay(d, end)) cell.dataset.rangeEnd = "1";
      if (start && end && isBetween(d, start, end)) cell.dataset.inRange = "1";

      if (start && !end && this.hoverEnd) {
        delete cell.dataset.rangeStart;
        delete cell.dataset.rangeEnd;
        delete cell.dataset.inRange;
        const [lo, hi] = start <= this.hoverEnd ? [start, this.hoverEnd] : [this.hoverEnd, start];
        if (sameDay(d, lo)) cell.dataset.rangeStart = "1";
        if (sameDay(d, hi)) cell.dataset.rangeEnd = "1";
        if (isBetween(d, lo, hi)) cell.dataset.inRange = "1";
      }
    }

    if (sameDay(d, todayDate)) cell.setAttribute("aria-current", "date");
    else cell.removeAttribute("aria-current");

    const pressed = cell.dataset.selected === "1" || cell.dataset.rangeStart === "1" || cell.dataset.rangeEnd === "1";
    cell.setAttribute("aria-pressed", pressed ? "true" : "false");
  }

  private updateGridClasses(): void {
    if (!this.gridEl) return;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    this.gridEl.querySelectorAll<HTMLElement>(".matai-day").forEach(cell => {
      const iso = cell.dataset.date;
      if (!iso) return;
      const d = new Date(iso + "T00:00:00");
      this.applyClasses(cell, d, todayDate);
    });
  }
}
