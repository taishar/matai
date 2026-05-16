# Matai מתי

A lightweight, zero-dependency date picker with natural language input. Supports English and Hebrew (RTL), single date, date range, datetime, and event (date + time range) selection.

**[Live demo](https://taishar.github.io/matai/demo/index.html)**

## Features

- **Natural language input** — type `tomorrow`, `next Monday`, `in 3 weeks`, `last 30 days`, or `מחר`, `בעוד 3 ימים`
- **Visual calendar** — click to pick, or type and the calendar follows; the search field always reflects what's selected
- **Hint cycling** — the search field cycles through example phrases; press `→` (or `←` in RTL) to autocomplete
- **Date range** — two-calendar range picker with hover preview and duration badge
- **Datetime & event modes** — date + time, or date + time range
- **Auto language detection** — pass an array of languages and Matai detects which one you're typing in
- **Hebrew / RTL** — full right-to-left support
- **No dependencies** — vanilla TypeScript, single minified JS output (~8kb)

## Usage

```html
<script src="dist/matai.min.js"></script>

<input id="my-input" />

<script>
  const dp = new Matai('#my-input', {
    lang: 'en',
    mode: 'date',
    onChange: (value, close) => {
      console.log(value);
      close(); // call to dismiss the popup
    },
  });
</script>
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `lang` | `'en' \| 'he' \| ['en','he']` | `['en','he']` | Language(s). Pass an array to enable auto-detection — Matai picks the language based on what you type. |
| `mode` | `'date' \| 'range' \| 'datetime' \| 'event'` | `'date'` | Picker mode. `event` is a date with a start–end time range. |
| `format` | `string` | `'DD/MM/YYYY'` | Output format tokens: `DD`, `MM`, `YYYY`, `HH`, `mm`. |
| `color` | `string` | `#1a73e8` | Accent color (any CSS color value). |
| `onChange` | `(value, close) => void` | — | Called when a value is selected or typed. `close()` dismisses the popup. |
| `placeholder` | `string` | locale default | Placeholder for the search input inside the popup. |

### onChange

The popup does not close automatically after selection — call `close()` inside `onChange` when you want to dismiss it:

```js
onChange: (value, close) => {
  saveDate(value);
  close();
}
```

This lets you validate or conditionally close (e.g. only after both dates in a range are confirmed).

## API

```js
dp.getValue()          // → Date | [Date, Date] | null
dp.setValue(date)      // set programmatically (Date or [Date, Date])
dp.clear()             // reset
dp.destroy()           // remove from DOM and clean up listeners
```

## Natural Language — English

| Input | Result |
|---|---|
| `today`, `now` | Current date |
| `tomorrow`, `yesterday` | ±1 day |
| `in 3 days` / `3 days ago` | Relative offset |
| `in 2 weeks` / `in 1 month` | Relative offset |
| `next Monday` / `last Friday` | Weekday relative |
| `January 15` / `Jan 15 2025` | Month + day |
| `2025-01-15` | ISO format |
| `01/15/2025` | MM/DD/YYYY |
| `this week` / `last week` / `next week` | Named week ranges |
| `this month` / `last month` / `next month` | Named month ranges |
| `last 30 days` / `past 2 weeks` | Past N units |
| `Q1` / `Q2` / `Q3` / `Q4` | Quarter ranges |
| `from Jan 5 to Jan 20` | Range |
| `Jan 5 - Jan 20` | Range |
| `between Jan 5 and Jan 20` | Range |

## Natural Language — Hebrew

<div dir="rtl">

| קלט | תוצאה |
|---|---|
| `היום`, `מחר`, `אתמול` | היום / מחר / אתמול |
| `בעוד 3 ימים` / `לפני 3 ימים` | הסטה יחסית |
| `בעוד 2 שבועות` / `בעוד חודש` | הסטה יחסית |
| `ביום שני` / `שלישי הבא` | יום שבוע יחסי |
| `5 במאי` / `15 בינואר 2025` | יום + חודש |
| `השבוע` / `שבוע שעבר` / `שבוע הבא` | טווחי שבוע |
| `החודש` / `חודש שעבר` / `חודש הבא` | טווחי חודש |
| `30 ימים אחרונים` | N יחידות אחרונות |
| `הרבעון` / `רבעון הבא` | טווחי רבעון |
| `סוף השבוע` | סוף שבוע |
| `5 במאי עד 25 במאי` | טווח |
| `מ-5 במאי עד 25 במאי` | טווח |
| `בין 5 במאי ל-25 במאי` | טווח |
| `15/05/2025` | DD/MM/YYYY |

</div>

## Time Input

Time values use the same syntax regardless of language — append them to any date expression.

### Accepted formats

| Format | Example |
|---|---|
| 24-hour `HH:MM` | `14:30`, `9:00` |
| 12-hour `H am/pm` | `2pm`, `9am` |
| 12-hour with minutes | `9:30am`, `2:30pm` |
| Hour + `h` | `14h` |

### Datetime — `mode: 'datetime'`

| Input | Result |
|---|---|
| `tomorrow 2pm` | Tomorrow at 14:00 |
| `Jan 15 14:30` | January 15 at 14:30 |
| `next friday 9am` | Next Friday at 09:00 |
| `today 15:00` | Today at 15:00 |

<div dir="rtl">

| קלט | תוצאה |
|---|---|
| `מחר 14:00` | מחר בשעה 14:00 |
| `15 ינואר 14:30` | 15 בינואר בשעה 14:30 |
| `שישי הבא 9:00` | שישי הבא בשעה 09:00 |

</div>

### Event — `mode: 'event'`

Append a `start–end` time range to a date expression.

| Input | Result |
|---|---|
| `tomorrow 2pm-4pm` | Tomorrow, 14:00–16:00 |
| `Jan 15 14:00-16:00` | January 15, 14:00–16:00 |
| `today 9am-11am` | Today, 09:00–11:00 |

<div dir="rtl">

| קלט | תוצאה |
|---|---|
| `מחר 14:00-16:00` | מחר, 14:00–16:00 |
| `15 ינואר 9:00-11:00` | 15 בינואר, 09:00–11:00 |

</div>

## Accessibility

Matai is designed around a **text-first** model: the search input is the primary keyboard and screen reader path. The visual calendar is a secondary affordance and is intentionally kept out of the tab order.

### Keyboard interaction

| Key | Action |
|---|---|
| `Enter` / `Space` | Open or close the picker |
| `Escape` | Close the picker (works from anywhere inside the popup) |
| `Tab` | Move focus between the search field and the clear button; Tab past the last element closes the popup |
| `→` / `←` (RTL) | Accept the current hint suggestion |
| Type any date expression | Parse and select a date without touching the mouse |

### ARIA

- The trigger input has `aria-haspopup="dialog"` and `aria-expanded` (toggled on open/close).
- The popup has `role="dialog"` and `aria-modal="true"`.
- Calendar navigation buttons have `aria-label` ("Previous month" / "Next month", localised).
- The month title has `aria-live="polite"` so screen readers announce month changes.
- Each day cell has a descriptive `aria-label` (e.g. "Thursday, May 16, 2026") and `aria-pressed` reflecting selection state.
- Weekday column headers use `<abbr>` with the full day name as the title.

### Screen reader notes

Because the calendar grid is not keyboard-navigable, screen reader users interact with the picker by typing in the search field — the same way sighted keyboard users do. The calendar remains reachable via virtual/browse cursor for users who prefer it.

## Build

Requires [Bun](https://bun.sh).

```bash
bun run build
```

Output: `dist/matai.min.js`

## Demo

[https://taishar.github.io/matai/demo/index.html](https://taishar.github.io/matai/demo/index.html)

Or open `demo/index.html` locally after building.

## License

MIT
