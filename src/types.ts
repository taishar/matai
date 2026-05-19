export interface LocaleTokens {
  today: string[];
  tomorrow: string[];
  yesterday: string[];
  units: {
    day: string[];
    week: string[];
    month: string[];
    year: string[];
    quarter: string[];
  };
  inPrefix: string[];
  agoSuffix: string[];
  nextPrefix: string[];
  lastPrefix: string[];
  thisPrefix: string[];
  rangeConnectors: string[];
  rangeFromPrefix: string[];
  rangeToSuffix: string[];
  namedRanges: {
    thisWeek: string[]; lastWeek: string[]; nextWeek: string[];
    thisMonth: string[]; lastMonth: string[]; nextMonth: string[];
    thisYear: string[]; lastYear: string[]; nextYear: string[];
    thisQuarter: string[]; lastQuarter: string[]; nextQuarter: string[];
    weekend: string[];
  };
  nUnitsPastSuffix: string[];
  nUnitsFutureSuffix: string[];
  dualForms?: Array<{ forms: string[]; unit: "day" | "week" | "month" | "year" | "quarter"; count: number }>;
  weekdayOnPrefix: string[];
  dayNumericPrefix: string[];
  monthNamePrefix: string[];
  pastPrefix: string[];
  rangePairs: [string, string][];
  quarterOrdinals?: string[];
  halfYearFirst?: string[];
  halfYearSecond?: string[];
  periodStartWords?: string[];
  periodEndWords?: string[];
  numberWords?: Record<string, number>;
  periodToDatePhrases?: { year?: string[]; month?: string[]; quarter?: string[]; };
  nthWeekdayOrdinals?: string[];
  nthWeekdayLast?: string[];
  nthWeekdayOf?: string[];
}

export interface Locale {
  code: string;
  rtl: boolean;
  weekStart: number;
  weekendStart: number;
  requireYearForMonthRange: boolean;
  days: string[];
  daysShort: string[];
  months: string[];
  monthsShort: string[];
  placeholder: string;
  placeholderRange: string;
  placeholderDatetime: string;
  placeholderEvent: string;
  examples: string[];
  examplesRange: string[];
  examplesDatetime: string[];
  examplesEvent: string[];
  tokens: LocaleTokens;
  numericOrder: "dmy" | "mdy";
  prevMonth: string;
  nextMonth: string;
}

export type Lang = "en" | "he";
export type Mode = "date" | "datetime" | "range" | "event";
export type DateValue = Date | [Date, Date] | null;

export interface MataiOptions {
  lang?: Lang | Lang[];
  mode?: Mode;
  format?: string;
  onChange?: (value: DateValue, close: () => void) => void;
  placeholder?: string;
  color?: string;
}
