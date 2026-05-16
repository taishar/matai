const SLOT_H = 28; // px per 15-min slot

export function formatMinutes(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export class TimeColumn {
  el: HTMLElement;
  onSelect: ((start: number, end?: number) => void) | null = null;

  private mode: "single" | "range";
  private grid!: HTMLElement;
  private selectionEl!: HTMLElement;

  constructor(mode: "single" | "range") {
    this.mode = mode;
    this.el = document.createElement("div");
    this.el.className = "matai-time-col" + (mode === "range" ? " matai-time-col--drag" : "");
    this.el.setAttribute("tabindex", "-1");
    this.build();
  }

  getElement(): HTMLElement { return this.el; }

  private build(): void {
    this.grid = document.createElement("div");
    this.grid.className = "matai-time-grid";

    for (let m = 0; m < 1440; m += 15) {
      const slot = document.createElement("div");
      slot.className = "matai-time-slot";

      if (m % 60 === 0) slot.dataset.hour = "1";
      else if (m % 30 === 0) slot.dataset.half = "1";

      const lbl = document.createElement("span");
      lbl.className = "matai-time-slot-label";
      lbl.textContent = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
      slot.appendChild(lbl);

      this.grid.appendChild(slot);
    }

    this.selectionEl = document.createElement("div");
    this.selectionEl.className = "matai-time-selection";
    this.selectionEl.style.display = "none";
    this.grid.appendChild(this.selectionEl);

    this.el.appendChild(this.grid);
    this.bindEvents();
  }

  private minutesAt(clientY: number): number {
    const rect = this.el.getBoundingClientRect();
    const y = Math.max(0, clientY - rect.top + this.el.scrollTop);
    return Math.min(Math.floor(y / SLOT_H), 95) * 15;
  }

  private placeSelection(startMin: number, endMin: number): void {
    this.selectionEl.style.display = "block";
    this.selectionEl.style.top = `${(startMin / 15) * SLOT_H}px`;
    this.selectionEl.style.height = `${Math.max(1, (endMin - startMin) / 15) * SLOT_H}px`;
  }

  private bindEvents(): void {
    if (this.mode === "single") {
      this.grid.addEventListener("click", (e) => {
        const m = this.minutesAt(e.clientY);
        this.placeSelection(m, m + 15);
        this.onSelect?.(m);
      });
    } else {
      let dragStart: number | null = null;

      const onMove = (e: MouseEvent) => {
        if (dragStart === null) return;
        const cur = this.minutesAt(e.clientY);
        const [lo, hi] = dragStart <= cur ? [dragStart, cur + 15] : [cur, dragStart + 15];
        this.placeSelection(lo, hi);
      };

      const onUp = (e: MouseEvent) => {
        if (dragStart === null) return;
        const cur = this.minutesAt(e.clientY);
        const [lo, hi] = dragStart <= cur ? [dragStart, cur + 15] : [cur, dragStart + 15];
        const end = Math.min(hi, 1440);
        this.placeSelection(lo, end);
        dragStart = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        this.onSelect?.(lo, end);
      };

      this.grid.addEventListener("mousedown", (e) => {
        e.preventDefault();
        dragStart = this.minutesAt(e.clientY);
        this.placeSelection(dragStart, dragStart + 15);
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    }
  }

  setSelected(start: number | null, end?: number | null): void {
    if (start === null) {
      this.selectionEl.style.display = "none";
    } else {
      this.placeSelection(start, end != null ? end : start + 15);
      this.scrollTo(start);
    }
  }

  reset(): void {
    this.selectionEl.style.display = "none";
  }

  scrollToNow(): void {
    const now = new Date();
    this.scrollTo(now.getHours() * 60 + now.getMinutes());
  }

  private scrollTo(minutes: number): void {
    const targetTop = (minutes / 15) * SLOT_H;
    this.el.scrollTop = Math.max(0, targetTop - this.el.clientHeight / 3);
  }
}
