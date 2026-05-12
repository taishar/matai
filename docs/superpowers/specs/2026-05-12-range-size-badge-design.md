# Range Size Badge — Design Spec

## Summary

Add a pill-shaped badge below the range calendars that shows the number of days (or weeks/months) in the selected or previewed range. The badge updates live during hover and persists after confirmation.

## Scope

Range mode only. No changes to single-date mode or the `Calendar` class.

## Placement

A `.matai-range-badge` element is inserted directly after the `.matai-cals` div inside the popup, centered. It is created unconditionally in range mode during the `Matai` constructor, but starts hidden.

```
popup
  └── lang-toggle (optional)
  └── .matai-cals
        └── calStart
        └── calEnd
  └── .matai-range-badge   ← new, hidden by default
```

## Visibility Rules

| State | Badge |
|---|---|
| Popup opens, no range yet | hidden |
| Start picked, hovering toward end | visible, updating live |
| Cursor leaves calendars (no confirmed range yet) | hidden |
| Cursor leaves calendars (confirmed range exists) | shows confirmed range count |
| Range confirmed | visible |
| Popup reopened with existing range | visible |
| `.clear()` called | hidden |

## Label Format (Adaptive)

| Range length | Example output |
|---|---|
| 1–13 days | `5 days` |
| 14–89 days | `6 weeks, 2 days` or `6 weeks` (exact) |
| 90+ days | `3 months, 2 days` or `3 months` (exact) |

Month length uses a fixed 30-day approximation. "0 days" or "0 weeks" suffix is always omitted.

## Implementation

**New element:** `Matai` creates `this.badgeEl` (a `<div class="matai-range-badge">`) after the `calWrapper` in the popup. Starts with `display:none`.

**New private method:** `updateBadge(start: Date, end: Date | null)` — computes the day diff and formats the label, then shows/hides the element.

**Hook into existing call sites:**
- `wireHover`: when a `matai-hover` event fires and `rangeStep === 1`, call `updateBadge(this.rangeStart, hoveredDate)`
- `wireHover` mouseleave: call `updateBadge(confirmedStart, confirmedEnd)` (from `this.value`) or hide if no confirmed range
- `handleSelect` (step 2 — range confirmed): call `updateBadge(lo, hi)`
- `clear()`: hide the badge

**No changes to `Calendar`.** All logic stays in `Matai`.

## Styling

New CSS class in `styles.css`:

```css
.matai-range-badge {
  text-align: center;
  margin-top: 8px;
}
/* inner span */
.matai-range-badge span {
  display: inline-flex;
  align-items: center;
  background: #f0f4ff;
  border: 1px solid #c7d7fc;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 12px;
  color: #2c5fd4;
  font-weight: 600;
}
```

Colors reuse the existing blue palette (`#1a73e8` for selected, `#d2e3fc` for in-range) — the badge sits at the lighter end of that same family.

## Out of Scope

- Single mode
- Tooltip / floating chip variants
- Gradient fill approach
- Nights vs days distinction
