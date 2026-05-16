# Matai מתי

A lightweight, zero-dependency date picker with natural language input. Supports English and Hebrew (RTL), single date and date range selection.

**[Live demo](https://taishar.github.io/matai/demo/index.html)**

## Features

- **Natural language input** — type `tomorrow`, `next Monday`, `in 3 weeks`, `last 30 days`, or `מחר`, `בעוד 3 ימים`
- **Visual calendar** — click to pick, or type and the calendar follows
- **Hint cycling** — the search field cycles through example phrases; press `Tab` to autocomplete
- **Date range** — two-calendar range picker with hover preview and duration badge
- **Auto language detection** — pass an array of languages and Matai detects which one you're typing in
- **Hebrew / RTL** — full right-to-left support
- **No dependencies** — vanilla TypeScript, single minified JS output (~8kb)

## Usage

Include the built file and instantiate:

```html
<script src="dist/matai.min.js"></script>

<input id="my-input" />

<script>
  const dp = new Matai('#my-input', {
    lang: 'en',
    mode: 'single',
  });
</script>
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `lang` | `'en' \| 'he' \| ['en','he']` | `'en'` | Language(s). Pass an array to enable auto-detection — Matai picks the language based on what you type. |
| `mode` | `'single' \| 'range'` | `'single'` | Single date or date range. |
| `format` | `string` | `'DD/MM/YYYY'` | Output format for the input field. |
| `color` | `string` | `#1a73e8` | Accent color (any CSS color value). |
| `onChange` | `(value) => void` | — | Called when a date is selected. |
| `placeholder` | `string` | locale default | Placeholder for the search input inside the popup. |

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

| Input | Result |
|---|---|
| `היום`, `מחר`, `אתמול` | Today / tomorrow / yesterday |
| `בעוד 3 ימים` / `לפני 3 ימים` | Relative offset |
| `בעוד 2 שבועות` / `בעוד חודש` | Relative offset |
| `ביום שני` / `שלישי הבא` | Weekday relative |
| `5 במאי` / `15 בינואר 2025` | Day + month |
| `השבוע` / `שבוע שעבר` / `שבוע הבא` | Named week ranges |
| `החודש` / `חודש שעבר` / `חודש הבא` | Named month ranges |
| `30 ימים אחרונים` | Past N units |
| `הרבעון` / `רבעון הבא` | Quarter ranges |
| `סוף השבוע` | Weekend |
| `5 במאי עד 25 במאי` | Range |
| `מ-5 במאי עד 25 במאי` | Range |
| `בין 5 במאי ל-25 במאי` | Range |
| `15/05/2025` | DD/MM/YYYY |

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
