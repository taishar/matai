# Matai מתי

A lightweight, zero-dependency date picker with natural language input. Supports English and Hebrew (RTL), single date and date range selection.

## Features

- **Natural language input** — type `tomorrow`, `next Monday`, `in 3 weeks`, or `מחר`, `בעוד 3 ימים`
- **Visual calendar** — click to pick, or type and the calendar follows
- **Date range** — two-calendar range picker with hover preview
- **Hebrew / RTL** — full right-to-left support
- **Dual language** — switch between EN and HE in the same instance
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
| `lang` | `'en' \| 'he' \| ['en','he']` | `'en'` | Language(s). Array shows a toggle button. |
| `mode` | `'single' \| 'range'` | `'single'` | Single date or date range. |
| `format` | `string` | `'YYYY-MM-DD'` | Output format for the input field. |
| `onChange` | `(value) => void` | — | Called when a date is selected. |
| `placeholder` | `string` | locale default | Input placeholder text. |

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
| `from Jan 5 to Jan 20` | Range |
| `Jan 5 - Jan 20` | Range |

## Natural Language — Hebrew

| Input | Result |
|---|---|
| `היום`, `מחר`, `אתמול` | Today / tomorrow / yesterday |
| `בעוד 3 ימים` / `לפני 3 ימים` | Relative offset |
| `בעוד 2 שבועות` / `בעוד חודש` | Relative offset |
| `ביום שני` / `שלישי הבא` | Weekday relative |
| `5 במאי` / `15 בינואר 2025` | Day + month |
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

Open `demo/index.html` in a browser after building.
