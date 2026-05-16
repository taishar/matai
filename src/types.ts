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
  weekdayOnPrefix: string[];
  dayNumericPrefix: string[];
  monthNamePrefix: string[];
  pastPrefix: string[];
  rangePairs: [string, string][];
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
}

export type Lang = "en" | "he";
export type Mode = "date" | "datetime" | "range" | "event";
export type DateValue = Date | [Date, Date] | null;

export interface MataiOptions {
  lang?: Lang | Lang[];
  mode?: Mode;
  format?: string;
  onChange?: (value: DateValue) => void;
  placeholder?: string;
  color?: string;
}
